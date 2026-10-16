import * as functions from 'firebase-functions/v1';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

async function assertCallerIsAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
  }
  return context.auth.uid;
}

// Account deletion is an existing admin operation. Friend spending uses Firestore directly.
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
