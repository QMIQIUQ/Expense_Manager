import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const projectId = 'demo-expense-manager';
const appConfig = {
  apiKey: 'demo-api-key',
  authDomain: projectId + '.firebaseapp.com',
  projectId,
  storageBucket: projectId + '.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
};
const suffix = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
const password = 'FriendTest-' + suffix + '!';
const appA = initializeApp(appConfig, 'friend-test-a-' + suffix);
const appB = initializeApp(appConfig, 'friend-test-b-' + suffix);
const authA = getAuth(appA);
const authB = getAuth(appB);
const dbA = getFirestore(appA);
const dbB = getFirestore(appB);

connectAuthEmulator(authA, 'http://127.0.0.1:9099', { disableWarnings: true });
connectAuthEmulator(authB, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(dbA, '127.0.0.1', 8080);
connectFirestoreEmulator(dbB, '127.0.0.1', 8080);

const assertPermissionDenied = async (operation) => {
  await assert.rejects(operation, (error) => String(error?.code || '').includes('permission-denied'));
};

let createdA;
let createdB;
const expenseIds = ['friend-share-' + suffix + '-inside', 'friend-share-' + suffix + '-outside'];

try {
  createdA = await createUserWithEmailAndPassword(authA, 'friend-a-' + suffix + '@example.test', password);
  createdB = await createUserWithEmailAndPassword(authB, 'friend-b-' + suffix + '@example.test', password);
  await Promise.all([
    setDoc(doc(dbA, 'users', createdA.user.uid), {
      email: createdA.user.email,
      isAdmin: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    setDoc(doc(dbB, 'users', createdB.user.uid), {
      email: createdB.user.email,
      isAdmin: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ]);

  const senderOutgoing = doc(dbA, 'friendRequests', createdA.user.uid, 'outgoing', createdB.user.uid);
  const recipientIncoming = doc(dbB, 'friendRequests', createdB.user.uid, 'incoming', createdA.user.uid);
  const sendBatch = writeBatch(dbA);
  sendBatch.set(senderOutgoing, {
    senderUid: createdA.user.uid,
    recipientUid: createdB.user.uid,
    status: 'pending',
  });
  sendBatch.set(recipientIncoming, {
    senderUid: createdA.user.uid,
    recipientUid: createdB.user.uid,
    status: 'pending',
  });
  await sendBatch.commit();
  assert.equal((await getDoc(dbA, recipientIncoming)).data()?.status, 'pending');
  await assertPermissionDenied(getDocs(collection(dbA, 'friendRequests', createdB.user.uid, 'incoming')));
  const incoming = await getDocs(collection(dbB, 'friendRequests', createdB.user.uid, 'incoming'));
  assert.ok(incoming.docs.some((request) => request.id === createdA.user.uid && request.data().status === 'pending'));

  const recipientOutgoing = doc(dbA, 'friendRequests', createdA.user.uid, 'outgoing', createdB.user.uid);
  const senderIncoming = doc(dbB, 'friendRequests', createdB.user.uid, 'incoming', createdA.user.uid);
  const recipientConnection = doc(dbB, 'friendConnections', createdB.user.uid, 'friends', createdA.user.uid);
  const senderConnection = doc(dbA, 'friendConnections', createdA.user.uid, 'friends', createdB.user.uid);
  const acceptBatch = writeBatch(dbB);
  acceptBatch.update(recipientIncoming, { status: 'accepted' });
  acceptBatch.update(recipientOutgoing, { status: 'accepted' });
  acceptBatch.set(recipientConnection, {
    friendUid: createdA.user.uid,
    requesterUid: createdA.user.uid,
    status: 'accepted',
    connectedAt: serverTimestamp(),
  });
  acceptBatch.set(senderConnection, {
    friendUid: createdB.user.uid,
    requesterUid: createdA.user.uid,
    status: 'accepted',
    connectedAt: serverTimestamp(),
  });
  await acceptBatch.commit();
  assert.equal((await getDoc(dbA, recipientIncoming)).data()?.status, 'accepted');
  assert.equal((await getDoc(dbA, recipientConnection)).exists(), true);
  await assertPermissionDenied(getDocs(collection(dbA, 'friendConnections', createdB.user.uid, 'friends')));

  const ownerPreference = doc(dbA, 'friendDashboardPreferences', createdA.user.uid, 'friends', createdB.user.uid);
  await setDoc(ownerPreference, {
    mode: 'categories',
    period: 'day',
    selectedDate: '2025-01-15',
    updatedAt: serverTimestamp(),
  });
  assert.equal((await getDocs(collection(dbA, 'friendDashboardPreferences', createdA.user.uid, 'friends'))).size, 1);
  const privatePreference = doc(dbB, 'friendDashboardPreferences', createdB.user.uid, 'friends', createdA.user.uid);
  await setDoc(privatePreference, {
    mode: 'total',
    period: 'all',
    selectedDate: '2025-01-15',
    updatedAt: serverTimestamp(),
  });
  await assertPermissionDenied(getDocs(collection(dbA, 'friendDashboardPreferences', createdB.user.uid, 'friends')));

  await setDoc(doc(dbB, 'expenses', expenseIds[0]), {
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
  await setDoc(doc(dbB, 'expenses', expenseIds[1]), {
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
  await setDoc(doc(dbB, 'friendSpendingSummaries', createdB.user.uid, 'dailyBuckets', '2025-01-15__MYR__Groceries'), {
    date: '2025-01-15',
    category: 'Groceries',
    currency: 'MYR',
    amount: 20,
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(dbB, 'friendSpendingSummaries', createdB.user.uid, 'dailyBuckets', '2025-02-02__MYR__Travel'), {
    date: '2025-02-02',
    category: 'Travel',
    currency: 'MYR',
    amount: 70,
    updatedAt: serverTimestamp(),
  });

  const dailySummaryQuery = query(
    collection(dbA, 'friendSpendingSummaries', createdB.user.uid, 'dailyBuckets'),
    where('date', '==', '2025-01-15'),
  );
  await assertPermissionDenied(getDocs(dailySummaryQuery));
  await assertPermissionDenied(getDocs(collection(dbA, 'expenses')));

  const ownerSharing = doc(dbB, 'friendSharing', createdB.user.uid, 'friends', createdA.user.uid);
  await setDoc(ownerSharing, { enabled: true, updatedAt: serverTimestamp() });
  const sharedRows = await getDocs(dailySummaryQuery);
  assert.equal(sharedRows.size, 1);
  assert.deepEqual(sharedRows.docs.map((row) => ({
    date: row.data().date,
    category: row.data().category,
    currency: row.data().currency,
    amount: row.data().amount,
  })), [{ date: '2025-01-15', category: 'Groceries', currency: 'MYR', amount: 20 }]);
  assert.equal(JSON.stringify(sharedRows.docs.map((row) => row.data())).includes('private transaction detail'), false);
  assert.equal(JSON.stringify(sharedRows.docs.map((row) => row.id)).includes(expenseIds[0]), false);

  await deleteDoc(ownerSharing);
  await assertPermissionDenied(getDocs(dailySummaryQuery));
  await setDoc(ownerSharing, { enabled: true, updatedAt: serverTimestamp() });

  const removeBatch = writeBatch(dbA);
  removeBatch.delete(senderConnection);
  removeBatch.delete(recipientConnection);
  removeBatch.delete(senderOutgoing);
  removeBatch.delete(recipientIncoming);
  removeBatch.delete(ownerSharing);
  removeBatch.delete(ownerPreference);
  await removeBatch.commit();
  await assertPermissionDenied(getDocs(dailySummaryQuery));
  assert.equal((await getDocs(collection(dbA, 'friendDashboardPreferences', createdA.user.uid, 'friends'))).size, 0);

  console.log('Friend spending Firestore emulator smoke test passed.');
} finally {
  if (createdB?.user) {
    for (const expenseId of expenseIds) {
      try { await deleteDoc(doc(dbB, 'expenses', expenseId)); } catch { /* Emulator may be stopped. */ }
    }
    try {
      const summaries = await getDocs(collection(dbB, 'friendSpendingSummaries', createdB.user.uid, 'dailyBuckets'));
      await Promise.all(summaries.docs.map((summary) => deleteDoc(summary.ref)));
    } catch { /* Emulator may be stopped. */ }
    try { await deleteDoc(doc(dbB, 'friendSharing', createdB.user.uid, 'friends', createdA?.user.uid || '')); } catch { /* optional cleanup */ }
    try { await deleteDoc(doc(dbB, 'friendDashboardPreferences', createdB.user.uid, 'friends', createdA?.user.uid || '')); } catch { /* optional cleanup */ }
    try { await deleteUser(createdB.user); } catch { /* Emulator may be stopped. */ }
  }
  if (createdA?.user) {
    try { await deleteDoc(doc(dbA, 'friendDashboardPreferences', createdA.user.uid, 'friends', createdB?.user.uid || '')); } catch { /* optional cleanup */ }
    try { await deleteUser(createdA.user); } catch { /* Emulator may be stopped. */ }
  }
  await Promise.all([deleteApp(appA), deleteApp(appB)]);
}
