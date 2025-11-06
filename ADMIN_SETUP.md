# Admin Setup & Scripts

This document describes how to create admin accounts for the Expense Manager project using the included server script.

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
