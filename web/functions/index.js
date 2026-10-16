import * as functions from 'firebase-functions/v1';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

initializeApp();
const db = getFirestore();
const FRIENDSHIPS_COLLECTION = 'friendships';
const FRIEND_SHARING_COLLECTION = 'friendSharing';
const VALID_CURRENCIES = new Set(['MYR', 'USD', 'TWD', 'SGD', 'CNY', 'EUR', 'GBP', 'JPY']);

const requireAuth = (context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  return context.auth.uid;
};

const requireUid = (value, fieldName = 'friendUid') => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 128) {
    throw new functions.https.HttpsError('invalid-argument', `Parameter "${fieldName}" must be a valid user ID.`);
  }
  return value.trim();
};

const getFriendshipId = (uidA, uidB) => createHash('sha256')
  .update([uidA, uidB].sort().join('\u0000'))
  .digest('hex');

const getFriendSharingRef = (ownerUid, friendUid) => db
  .collection(FRIEND_SHARING_COLLECTION)
  .doc(ownerUid)
  .collection('friends')
  .doc(friendUid);

const assertValidOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new functions.https.HttpsError('invalid-argument', `Parameter "${fieldName}" must use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new functions.https.HttpsError('invalid-argument', `Parameter "${fieldName}" is not a valid date.`);
  }
  return value;
};

const roundToTwoDigits = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

async function assertCallerIsAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = context.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
  }
  return uid;
}

// Delete an auth user by UID. Callable only by admins.
export const adminDeleteUser = functions.https.onCall(async (data, context) => {
  await assertCallerIsAdmin(context);
  const targetUid = data?.uid;
  if (!targetUid || typeof targetUid !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Parameter "uid" must be provided.');
  }

  try {
    await getAuth().deleteUser(targetUid);
    return { ok: true };
  } catch (err) {
    console.error('adminDeleteUser error', err);
    throw new functions.https.HttpsError('internal', 'Failed to delete user.');
  }
});

// List only the caller's friendship state and per-friend sharing flags.
export const getFriendConnections = functions.https.onCall(async (_data, context) => {
  const uid = requireAuth(context);
  const snapshot = await db.collection(FRIENDSHIPS_COLLECTION)
    .where('memberIds', 'array-contains', uid)
    .get();

  const connections = await Promise.all(snapshot.docs
    .filter((document) => ['pending', 'accepted'].includes(document.data().status))
    .map(async (document) => {
      const data = document.data();
      const friendUid = data.memberIds.find((memberUid) => memberUid !== uid);
      if (typeof friendUid !== 'string') return null;
      const [myShare, theirShare] = await Promise.all([
        getFriendSharingRef(uid, friendUid).get(),
        getFriendSharingRef(friendUid, uid).get(),
      ]);
      const status = data.status;
      return {
        friendUid,
        status,
        direction: status === 'accepted' ? 'friend' : (data.requestedTo === uid ? 'incoming' : 'outgoing'),
        shareEnabledByMe: myShare.exists && myShare.data()?.enabled === true,
        shareEnabledWithMe: theirShare.exists && theirShare.data()?.enabled === true,
      };
    }));

  return { connections: connections.filter(Boolean) };
});

// Create, accept, decline, remove, or update the caller's explicit sharing consent.
export const manageFriendship = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const action = data?.action;
  const friendUid = requireUid(data?.friendUid);
  if (friendUid === uid) {
    throw new functions.https.HttpsError('invalid-argument', 'You cannot add yourself as a friend.');
  }

  const friendshipRef = db.collection(FRIENDSHIPS_COLLECTION).doc(getFriendshipId(uid, friendUid));
  const myShareRef = getFriendSharingRef(uid, friendUid);
  const theirShareRef = getFriendSharingRef(friendUid, uid);
  const myPreferenceRef = db.collection('friendDashboardPreferences').doc(uid).collection('friends').doc(friendUid);
  const theirPreferenceRef = db.collection('friendDashboardPreferences').doc(friendUid).collection('friends').doc(uid);

  if (action === 'send') {
    try {
      await getAuth().getUser(friendUid);
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        throw new functions.https.HttpsError('not-found', 'No account matches this friend code.');
      }
      throw error;
    }

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(friendshipRef);
      const existingData = existing.exists ? existing.data() : null;
      if (existingData?.status === 'accepted') {
        throw new functions.https.HttpsError('already-exists', 'You are already friends.');
      }
      if (existingData?.status === 'pending') {
        if (existingData.requestedBy === uid) return;
        throw new functions.https.HttpsError('already-exists', 'This person has already sent you a request.');
      }

      transaction.set(friendshipRef, {
        memberIds: [uid, friendUid].sort(),
        status: 'pending',
        requestedBy: uid,
        requestedTo: friendUid,
        createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { ok: true };
  }

  if (action === 'accept' || action === 'decline') {
    await db.runTransaction(async (transaction) => {
      const friendship = await transaction.get(friendshipRef);
      if (!friendship.exists) {
        throw new functions.https.HttpsError('not-found', 'Friend request not found.');
      }
      const existingData = friendship.data();
      if (existingData.status !== 'pending' || existingData.requestedTo !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Only the recipient can respond to this request.');
      }
      transaction.update(friendshipRef, {
        status: action === 'accept' ? 'accepted' : 'declined',
        acceptedAt: action === 'accept' ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { ok: true };
  }

  if (action === 'remove') {
    await db.runTransaction(async (transaction) => {
      const [friendship, myShare, theirShare, myPreference, theirPreference] = await Promise.all([
        transaction.get(friendshipRef),
        transaction.get(myShareRef),
        transaction.get(theirShareRef),
        transaction.get(myPreferenceRef),
        transaction.get(theirPreferenceRef),
      ]);
      if (!friendship.exists || friendship.data().status !== 'accepted' || !friendship.data().memberIds.includes(uid)) {
        throw new functions.https.HttpsError('failed-precondition', 'An accepted friendship is required.');
      }
      transaction.update(friendshipRef, {
        status: 'removed',
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (myShare.exists) transaction.delete(myShareRef);
      if (theirShare.exists) transaction.delete(theirShareRef);
      if (myPreference.exists) transaction.delete(myPreferenceRef);
      if (theirPreference.exists) transaction.delete(theirPreferenceRef);
    });
    return { ok: true };
  }

  if (action === 'set-sharing') {
    if (typeof data?.enabled !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', 'Parameter "enabled" must be a boolean.');
    }
    await db.runTransaction(async (transaction) => {
      const [friendship, existingShare] = await Promise.all([
        transaction.get(friendshipRef),
        transaction.get(myShareRef),
      ]);
      if (!friendship.exists || friendship.data().status !== 'accepted' || !friendship.data().memberIds.includes(uid)) {
        throw new functions.https.HttpsError('failed-precondition', 'An accepted friendship is required.');
      }
      if (data.enabled) {
        transaction.set(myShareRef, { enabled: true, updatedAt: FieldValue.serverTimestamp() });
      } else if (existingShare.exists) {
        transaction.delete(myShareRef);
      }
    });
    return { ok: true };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Unsupported friendship action.');
});

// Return totals grouped only by currency and category. Expense documents never leave the server.
export const getFriendSpendingSummary = functions.runWith({ timeoutSeconds: 300, memory: '512MB' }).https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const friendUid = requireUid(data?.friendUid);
  if (friendUid === uid) {
    throw new functions.https.HttpsError('invalid-argument', 'A friend ID is required.');
  }

  const friendshipRef = db.collection(FRIENDSHIPS_COLLECTION).doc(getFriendshipId(uid, friendUid));
  const [friendship, share] = await Promise.all([
    friendshipRef.get(),
    getFriendSharingRef(friendUid, uid).get(),
  ]);
  if (!friendship.exists || friendship.data().status !== 'accepted' || !friendship.data().memberIds.includes(uid)) {
    throw new functions.https.HttpsError('permission-denied', 'An accepted friendship is required.');
  }
  if (!share.exists || share.data()?.enabled !== true) {
    throw new functions.https.HttpsError('permission-denied', 'This friend has not enabled spending sharing.');
  }

  const startDate = assertValidOptionalDate(data?.startDate, 'startDate');
  const endDate = assertValidOptionalDate(data?.endDate, 'endDate');
  if ((startDate && !endDate) || (!startDate && endDate) || (startDate && endDate && startDate > endDate)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid startDate and endDate pair is required.');
  }

  let query = db.collection('expenses').where('userId', '==', friendUid);
  if (startDate) query = query.where('date', '>=', startDate);
  if (endDate) query = query.where('date', '<=', endDate);
  query = query.orderBy('date', 'asc');

  const totals = new Map();
  const categories = new Map();
  let lastDocument = null;
  while (true) {
    let pageQuery = query.limit(500);
    if (lastDocument) pageQuery = pageQuery.startAfter(lastDocument);
    const page = await pageQuery.get();
    for (const expenseDoc of page.docs) {
      const expense = expenseDoc.data();
      const amount = Number.isFinite(expense.baseAmount) ? expense.baseAmount : expense.amount;
      if (!Number.isFinite(amount)) continue;
      const rawCurrency = Number.isFinite(expense.baseAmount) ? expense.baseCurrency : expense.currency;
      const currency = VALID_CURRENCIES.has(rawCurrency) ? rawCurrency : 'MYR';
      const category = typeof expense.category === 'string' && expense.category.trim()
        ? expense.category.trim().slice(0, 80)
        : 'Uncategorized';

      totals.set(currency, (totals.get(currency) || 0) + amount);
      const categoryCurrencies = categories.get(category) || new Map();
      categoryCurrencies.set(currency, (categoryCurrencies.get(currency) || 0) + amount);
      categories.set(category, categoryCurrencies);
    }
    if (page.docs.length < 500) break;
    lastDocument = page.docs[page.docs.length - 1];
  }

  return {
    totalByCurrency: [...totals.entries()]
      .map(([currency, amount]) => ({ currency, amount: roundToTwoDigits(amount) }))
      .sort((left, right) => left.currency.localeCompare(right.currency)),
    categories: [...categories.entries()]
      .map(([name, amounts]) => ({
        name,
        amounts: [...amounts.entries()]
          .map(([currency, amount]) => ({ currency, amount: roundToTwoDigits(amount) }))
          .sort((left, right) => left.currency.localeCompare(right.currency)),
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
});
