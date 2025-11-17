# Admin Setup & Scripts

This document describes how to create admin accounts for the Expense Manager project.

## Quick Start: Web Interface (Recommended)

The easiest way to create and manage users is through the admin panel in the web interface:

1. Have an existing admin log into the application
2. Navigate to the Admin tab (👑 icon)
3. Click "➕ Create User"
4. Fill in the email, password, and optionally grant admin privileges
5. Click "Create User Account"

This creates a complete Firebase Authentication account with metadata - no Firebase Console or server scripts needed!

For more details, see [USER_MANAGEMENT_FEATURES.md](./USER_MANAGEMENT_FEATURES.md).

## Alternative: Server Script (Advanced)

If you need to create the first admin account or prefer command-line tools, you can use the included server script.

## tools/create-admin.js

This script uses the Firebase Admin SDK to:
- create a Firebase Authentication user (email/password)
- set a custom claim `admin: true`
- create Firestore user metadata at `users/{uid}` with `isAdmin: true`

### Prerequisites

- Node.js installed (v16+ recommended)
- A Firebase project and a service account JSON key (download from Firebase Console → Project Settings → Service accounts)
- The service account key file must be kept private and NOT committed to the repository.

### Install dependencies

Install `firebase-admin` in your environment (either globally or in the repo):

```bash
cd tools
npm init -y
npm install firebase-admin
```

Or install in the repo root and run with `node tools/create-admin.js`.

### Run the script

On macOS / Linux:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./path/to/serviceAccountKey.json
node tools/create-admin.js admin@example.com StrongPass123 "Admin Name"
```

On Windows PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\serviceAccountKey.json'
node tools/create-admin.js admin@example.com StrongPass123 "Admin Name"
Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
```

The script will print the created UID on success.

### CI / Automation

If you prefer automation (GitHub Actions), store the service account JSON in a repository secret (e.g. `FIREBASE_SERVICE_ACCOUNT`) and write it to a file in a workflow step, then run the script. Be sure to restrict access to the secret.

### Security notes

- Never commit the service account JSON to source control.
- Use a separate service account with minimal required permissions if possible.
- Consider using Cloud Functions or a private admin API to run admin tasks instead of running ad-hoc scripts from developer machines.

## Additional Scripts (No Cloud Functions)

If your Firebase project is on the Spark plan and cannot deploy Cloud Functions, use these Node scripts with a service account to manage users:

### tools/delete-user.js
- Deletes a Firebase Authentication user by UID
- Removes user-owned documents from `expenses`, `categories`, `budgets`, `recurringExpenses`
- Deletes the `users/{uid}` metadata doc

Usage (PowerShell):
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\\path\\to\\serviceAccountKey.json'
node tools/delete-user.js <uid>
Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
```

### tools/update-user.js
Supported commands:
- `set-admin <uid> <true|false>`: toggles admin; writes both `isAdmin` and legacy `adminStatus`
- `set-active <uid> <true|false>`: toggles activation flag in metadata
- `set-email <uid> <newEmail>`: updates email in Auth and Firestore metadata
- `set-password <uid> <newPassword>`: updates password in Auth

Usage (PowerShell):
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\\path\\to\\serviceAccountKey.json'
node tools/update-user.js set-admin <uid> true
node tools/update-user.js set-active <uid> false
node tools/update-user.js set-email <uid> new@example.com
node tools/update-user.js set-password <uid> NewStrongP@ss
Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
```

These scripts are safe alternatives when Cloud Functions deployment is blocked by billing. They require a service account; keep it secure and never commit it to source control.
