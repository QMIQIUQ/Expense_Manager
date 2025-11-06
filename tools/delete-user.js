#!/usr/bin/env node
/**
 * delete-user.js
 *
 * Deletes a Firebase Authentication user and all their Firestore data.
 *
 * Usage (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\\path\\to\\serviceAccountKey.json'
 *   node tools/delete-user.js <uid>
 *   Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
 */

const admin = require('firebase-admin');

async function main() {
  const [uid] = process.argv.slice(2);
  if (!uid) {
    console.error('Usage: node tools/delete-user.js <uid>');
    process.exit(1);
  }

  try {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK. Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.');
    console.error(err?.message || err);
    process.exit(2);
  }

  const auth = admin.auth();
  const db = admin.firestore();

  // Collections that store user-owned documents by userId field
  const USER_DATA_COLLECTIONS = ['expenses', 'categories', 'budgets', 'recurringExpenses'];

  try {
    // Delete from Auth first
    await auth.deleteUser(uid);
    console.log(`Deleted Auth user: ${uid}`);

    // Delete user-owned docs
    for (const col of USER_DATA_COLLECTIONS) {
      const snap = await db.collection(col).where('userId', '==', uid).get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`Deleted ${snap.size} docs from ${col}`);
    }

    // Delete metadata doc
    await db.collection('users').doc(uid).delete();
    console.log('Deleted Firestore metadata');

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Error deleting user:', err?.message || err);
    process.exit(3);
  }
}

main();
