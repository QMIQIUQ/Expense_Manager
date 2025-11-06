# Admin Setup Guide

This guide explains how to set up and manage admin accounts in the Expense Manager application.

## Setting Up the First Admin User

Since registration is now disabled for security purposes, the first admin user must be configured manually. Follow these steps:

### Method 1: Using Firebase Console (Recommended)

1. **Create Firebase Authentication User**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to your project
   - Go to **Authentication** > **Users**
   - Click **Add User**
   - Enter email and password for the admin account
   - Click **Add User** and note the **User UID**

2. **Create User Metadata Document**
   - In Firebase Console, go to **Firestore Database**
   - Navigate to the `users` collection (create it if it doesn't exist)
   - Click **Add Document**
   - Set Document ID to the **User UID** from step 1
   - Add the following fields:
     ```
     email: "admin@example.com" (string)
     isAdmin: true (boolean)
     isActive: true (boolean)
     createdAt: [current timestamp] (timestamp)
     updatedAt: [current timestamp] (timestamp)
     ```
   - Click **Save**

3. **Verify Admin Access**
   - Log in to the application using the admin credentials
   - You should see the "👑 Admin" tab in the dashboard
   - Navigate to the Admin tab to manage users

### Method 2: Using Firebase CLI

If you have Firebase Admin SDK set up on a server, you can use this script:

```javascript
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  // or use a service account key
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdminUser(email, password) {
  try {
    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: false,
    });

    // Create Firestore user metadata
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      isAdmin: true,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Admin user created successfully:', userRecord.uid);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Usage
createAdminUser('admin@example.com', 'secure-password-here');
```

## Admin Features

Once logged in as an admin, you can:

### User Management
- **View All Users**: See a list of all registered users with their status and role
- **Activate/Deactivate Users**: Control user access by toggling their active status
- **Grant/Revoke Admin Privileges**: Promote users to admin or demote them to regular users
- **Delete Users**: Permanently remove users and all their associated data

### Creating New Users

The admin interface includes a "Create User" form with the following limitations:

⚠️ **Important Note**: Due to Firebase client-side limitations, the current implementation creates user metadata but cannot create Firebase Authentication accounts directly. 

**Recommended Workflow for Creating New Users:**

1. Admin creates user metadata through the admin interface
2. Admin shares the email with the new user
3. New user must either:
   - Use the "Forgot Password" flow if Firebase Auth account exists
   - Or admin manually creates the Firebase Auth account using Firebase Console
   - Or implement a backend endpoint using Firebase Admin SDK to create accounts

### Security Features

- **Self-Protection**: Admins cannot:
  - Deactivate their own account
  - Remove their own admin privileges
  - Delete their own account
- **Audit Trail**: All user operations are timestamped (createdAt, updatedAt)
- **Firestore Rules**: Admin operations are validated server-side through Firestore security rules

## Firestore Security Rules

The following rules are in place for the `users` collection:

```javascript
match /users/{userId} {
  // Users can read their own document
  allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
  // Only admins can create/update/delete user documents
  allow create, update, delete: if isAdmin();
}
```

Where `isAdmin()` checks if the requesting user has `isAdmin: true` in their user document.

## Troubleshooting

### Cannot see Admin tab
- Verify that your user document in Firestore has `isAdmin: true`
- Log out and log back in to refresh the admin status
- Check browser console for any errors

### Cannot create new users
- Remember that creating Firebase Auth accounts requires backend (Firebase Admin SDK)
- Use Firebase Console to manually create users for now
- Consider implementing a backend endpoint for user creation in production

### Firestore permission denied
- Verify that Firestore rules have been deployed
- Check that the admin user document exists and has `isAdmin: true`
- Ensure you're logged in with the correct admin account

## Production Recommendations

For a production environment, consider implementing:

1. **Backend User Management API**
   - Use Firebase Admin SDK to create/delete Firebase Auth users
   - Implement proper error handling and validation
   - Add email verification workflow

2. **Email Notifications**
   - Send welcome emails to new users
   - Notify users when their accounts are deactivated
   - Send password reset links

3. **Audit Logging**
   - Log all admin actions with timestamps and admin user ID
   - Track user creation, deletion, and privilege changes
   - Store logs in a separate Firestore collection

4. **Multi-Factor Authentication**
   - Require MFA for admin accounts
   - Use Firebase Authentication MFA features

5. **Role-Based Access Control (RBAC)**
   - Implement more granular permissions beyond just admin/user
   - Add roles like "moderator", "viewer", etc.

## Support

For issues or questions, please refer to:
- Firebase Authentication Documentation: https://firebase.google.com/docs/auth
- Firebase Admin SDK Documentation: https://firebase.google.com/docs/admin/setup
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
