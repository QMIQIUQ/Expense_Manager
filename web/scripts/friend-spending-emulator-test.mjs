import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const projectId = 'demo-expense-manager';
const appConfig = {
  apiKey: 'demo-api-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: `${projectId}.appspot.com`,
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
};
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const userAEmail = `friend-a-${suffix}@example.test`;
const userBEmail = `friend-b-${suffix}@example.test`;
const password = `FriendTest-${suffix}!`;
const appA = initializeApp(appConfig, `friend-test-a-${suffix}`);
const appB = initializeApp(appConfig, `friend-test-b-${suffix}`);
const authA = getAuth(appA);
const authB = getAuth(appB);
const dbA = getFirestore(appA);
const dbB = getFirestore(appB);
const functionsA = getFunctions(appA);
const functionsB = getFunctions(appB);

connectAuthEmulator(authA, 'http://127.0.0.1:9099', { disableWarnings: true });
connectAuthEmulator(authB, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(dbA, '127.0.0.1', 8080);
connectFirestoreEmulator(dbB, '127.0.0.1', 8080);
connectFunctionsEmulator(functionsA, '127.0.0.1', 5001);
connectFunctionsEmulator(functionsB, '127.0.0.1', 5001);

const manageA = httpsCallable(functionsA, 'manageFriendship');
const manageB = httpsCallable(functionsB, 'manageFriendship');
const connectionsB = httpsCallable(functionsB, 'getFriendConnections');
const summaryA = httpsCallable(functionsA, 'getFriendSpendingSummary');
const assertPermissionDenied = async (operation) => {
  await assert.rejects(operation, (error) => String(error?.code || '').includes('permission-denied'));
};

let createdA;
let createdB;
let firstExpenseId;
let secondExpenseId;

try {
  createdA = await createUserWithEmailAndPassword(authA, userAEmail, password);
  createdB = await createUserWithEmailAndPassword(authB, userBEmail, password);

  await manageA({ action: 'send', friendUid: createdB.user.uid });
  const incoming = (await connectionsB({})).data.connections;
  assert.ok(incoming.some((connection) => connection.friendUid === createdA.user.uid && connection.direction === 'incoming'));
  await manageB({ action: 'accept', friendUid: createdA.user.uid });

  const ownerPreference = doc(dbA, 'friendDashboardPreferences', createdA.user.uid, 'friends', createdB.user.uid);
  await setDoc(ownerPreference, {
    mode: 'categories',
    period: 'day',
    selectedDate: '2025-01-15',
    updatedAt: serverTimestamp(),
  });
  assert.equal((await getDoc(ownerPreference)).data()?.mode, 'categories');
  const privatePreference = doc(dbB, 'friendDashboardPreferences', createdB.user.uid, 'friends', createdA.user.uid);
  await setDoc(privatePreference, {
    mode: 'total',
    period: 'all',
    selectedDate: '2025-01-15',
    updatedAt: serverTimestamp(),
  });
  await assertPermissionDenied(getDoc(doc(dbA, 'friendDashboardPreferences', createdB.user.uid, 'friends', createdA.user.uid)));

  firstExpenseId = `friend-share-${suffix}-inside`;
  secondExpenseId = `friend-share-${suffix}-outside`;
  await setDoc(doc(dbB, 'expenses', firstExpenseId), {
    userId: createdB.user.uid,
    amount: 20,
    currency: 'MYR',
    baseAmount: 20,
    baseCurrency: 'MYR',
    date: '2025-01-15',
    category: 'Groceries',
    description: 'private transaction detail',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await setDoc(doc(dbB, 'expenses', secondExpenseId), {
    userId: createdB.user.uid,
    amount: 70,
    currency: 'MYR',
    baseAmount: 70,
    baseCurrency: 'MYR',
    date: '2025-02-02',
    category: 'Travel',
    description: 'another private transaction detail',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await assertPermissionDenied(summaryA({
    friendUid: createdB.user.uid,
    startDate: '2025-01-15',
    endDate: '2025-01-15',
  }));
  await assertPermissionDenied(getDoc(doc(dbA, 'expenses', firstExpenseId)));
  await manageB({ action: 'set-sharing', friendUid: createdA.user.uid, enabled: true });

  const result = (await summaryA({
    friendUid: createdB.user.uid,
    startDate: '2025-01-15',
    endDate: '2025-01-15',
  })).data;
  assert.deepEqual(result.totalByCurrency, [{ currency: 'MYR', amount: 20 }]);
  assert.deepEqual(result.categories, [{ name: 'Groceries', amounts: [{ currency: 'MYR', amount: 20 }] }]);
  assert.equal(JSON.stringify(result).includes('private transaction detail'), false);
  assert.equal(JSON.stringify(result).includes(firstExpenseId), false);

  await manageB({ action: 'set-sharing', friendUid: createdA.user.uid, enabled: false });
  await assertPermissionDenied(summaryA({ friendUid: createdB.user.uid }));
  await manageB({ action: 'set-sharing', friendUid: createdA.user.uid, enabled: true });
  await manageA({ action: 'remove', friendUid: createdB.user.uid });
  await assertPermissionDenied(summaryA({ friendUid: createdB.user.uid }));
  assert.equal((await getDoc(ownerPreference)).exists(), false);

  console.log('Friend spending Emulator smoke test passed.');
} finally {
  if (createdB?.user) {
    for (const expenseId of [firstExpenseId, secondExpenseId].filter(Boolean)) {
      try { await deleteDoc(doc(dbB, 'expenses', expenseId)); } catch { /* Emulator may be stopped. */ }
    }
    try { await deleteUser(createdB.user); } catch { /* Emulator may be stopped. */ }
  }
  if (createdA?.user) {
    try { await deleteDoc(doc(dbA, 'friendDashboardPreferences', createdA.user.uid, 'friends', createdB?.user.uid || '')) } catch { /* optional cleanup */ }
    try { await deleteUser(createdA.user); } catch { /* Emulator may be stopped. */ }
  }
  await Promise.all([deleteApp(appA), deleteApp(appB)]);
}
