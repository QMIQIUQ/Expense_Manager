#!/usr/bin/env node
/**
 * create-admin.js
 *
 * Minimal Node script that uses Firebase Admin SDK to:
 *  - create an Authentication user (email/password)
 *  - set custom claim `admin: true`
 *  - create Firestore metadata in `users/{uid}` with isAdmin/isActive
 *
 * Usage:
 *   1. Create a Firebase service account JSON key and save it locally.
 *   2. Run:
 *      export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *      node tools/create-admin.js email@example.com StrongP@ssw0rd "Display Name"
 *
 * On Windows PowerShell:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\\path\\to\\serviceAccountKey.json'
 *   node tools/create-admin.js admin@example.com StrongPass123 "Admin User"
 *   Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
 */

const admin = require('firebase-admin');

async function main() {
  const [email, password, displayName] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node tools/create-admin.js email password [displayName]');
    process.exit(1);
  }

  // Initialize admin SDK - expects GOOGLE_APPLICATION_CREDENTIALS env to be set
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK. Make sure GOOGLE_APPLICATION_CREDENTIALS is set to your service account JSON.');
    console.error(err && err.message ? err.message : err);
    process.exit(2);
  }

  const auth = admin.auth();
  const firestore = admin.firestore();

  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || undefined,
      emailVerified: false,
    });
    const uid = userRecord.uid;
    console.log('Created auth user with uid:', uid);

    // Set custom claim for admin
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log('Set custom claim admin=true');

    // Write metadata to Firestore `users/{uid}`
    await firestore.collection('users').doc(uid).set({
      email,
      displayName: displayName || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isAdmin: true,
      isActive: true,
    });
    console.log('Created Firestore metadata for user', uid);

    console.log('Done. User is ready to login.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err && err.message ? err.message : err);
    process.exit(3);
  }
}

main();
