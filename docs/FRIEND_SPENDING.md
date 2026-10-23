# Friend Spending Dashboard

The dashboard lets users add an existing account by UID, accept requests, and independently enable or revoke spending sharing for each friend. Sharing is off by default.

## Viewing and saved preferences

For each accepted friend, users can select total or category spending and one of these periods:

- All time
- Rolling last three months
- Current month through today
- A selected day

The view mode, period, and selected date are saved separately for each friend. Amounts are converted to the viewer's configured display currency when a rate is available; if a rate is unavailable, the source currency is preserved.

## Data model and privacy

- Raw documents in `expenses` remain readable only by their owner or an admin.
- `friendRequests/{userId}/incoming/{friendUid}` and `friendRequests/{userId}/outgoing/{friendUid}` hold mirrored request states. Firestore rules require the sender to create both mirrors and the recipient to accept or decline.
- `friendConnections/{ownerUid}/friends/{friendUid}` records accepted relationships. Both users receive a connection record when the recipient accepts.
- `friendSharing/{ownerUid}/friends/{friendUid}` holds the owner's explicit sharing choice. Only the owner can change it; the accepted friend can read the consent flag.
- `friendSpendingSummaries/{ownerUid}/dailyBuckets/{bucketId}` stores only date, category, currency, and amount totals. A friend can read these documents only while the relationship is accepted and the owner has sharing enabled.
- `friendSpendingSummaryStates/{ownerUid}` records whether the owner's initial summary has been built. It is private to the owner.
- `friendDashboardPreferences/{viewerUid}/friends/{friendUid}` stores the viewer's choices and is private to that viewer.

The owner's app builds the initial daily summary from the owner's own expenses the first time spending is shared. Each later expense create, edit, delete, import, or offline-queue sync updates the same summary buckets in the expense write transaction. The dashboard listens to those buckets, so an online friend sees updates automatically. It never reads a friend's raw expense documents.

This client-maintained summary avoids Cloud Functions and a Blaze upgrade for the friend dashboard. It uses normal Firestore reads and writes. The owner controls the summary values and could change them directly; changes made outside the app will not be reflected until the owner rebuilds the summary. The separate admin account-deletion action still uses the app's existing callable Cloud Function.

New dashboards include the widget by default. Existing saved layouts are migrated by adding it once while preserving the user's other widgets and their order.

## Local testing

Use the Auth and Firestore emulators for friend-flow testing. Friend requests, sharing, and summaries no longer call the Functions emulator. Follow [FIREBASE_EMULATORS.md](../web/FIREBASE_EMULATORS.md) to start the emulators.

The hosted `firebase-testing` preview shares the production Firebase project, so the friend-spending feature remains disabled there.

## Deployment behavior

- A push to `main` that changes Firestore rules or indexes deploys those Firestore resources before Hosting. The workflow does not deploy Cloud Functions.
- The `main` Firebase Hosting and GitHub Pages builds enable friend spending. Both use the same Firebase project and data. The `firebase-testing` preview keeps it disabled because it shares production data.
