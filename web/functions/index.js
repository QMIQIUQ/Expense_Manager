import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

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
    await admin.auth().deleteUser(targetUid);
    return { ok: true };
  } catch (err) {
    console.error('adminDeleteUser error', err);
    throw new functions.https.HttpsError('internal', 'Failed to delete user.');
  }
});
