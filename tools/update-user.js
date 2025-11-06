#!/usr/bin/env node
/**
 * update-user.js
 *
 * Update Firebase Authentication user and/or Firestore metadata.
 *
 * Examples (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\\path\\to\\serviceAccountKey.json'
 *   node tools/update-user.js set-admin <uid> true
 *   node tools/update-user.js set-active <uid> false
 *   node tools/update-user.js set-email <uid> newemail@example.com
 *   node tools/update-user.js set-password <uid> NewStrongP@ss
 *   Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
 */

const admin = require('firebase-admin');

async function main() {
  const [cmd, uid, value] = process.argv.slice(2);
  if (!cmd || !uid) {
    console.error('Usage: node tools/update-user.js <cmd> <uid> [value]');
    console.error('Commands: set-admin, set-active, set-email, set-password');
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

  try {
    if (cmd === 'set-admin') {
      const isAdmin = String(value).toLowerCase() === 'true';
      await db.collection('users').doc(uid).set(
        {
          isAdmin,
          adminStatus: isAdmin,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`Set isAdmin=${isAdmin} for ${uid}`);
    } else if (cmd === 'set-active') {
      const isActive = String(value).toLowerCase() === 'true';
      await db.collection('users').doc(uid).set(
        {
          isActive,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`Set isActive=${isActive} for ${uid}`);
    } else if (cmd === 'set-email') {
      if (!value) throw new Error('New email required');
      await auth.updateUser(uid, { email: value });
      await db.collection('users').doc(uid).set(
        {
          email: value,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`Email updated for ${uid}`);
    } else if (cmd === 'set-password') {
      if (!value) throw new Error('New password required');
      await auth.updateUser(uid, { password: value });
      console.log(`Password updated for ${uid}`);
    } else {
      throw new Error(`Unknown command: ${cmd}`);
    }

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err?.message || err);
    process.exit(3);
  }
}

main();
