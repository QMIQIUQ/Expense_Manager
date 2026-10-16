# Friend Spending Dashboard

The Dashboard includes a Friend Spending widget. Users add a friend with an existing account UID; the recipient must accept the request. After acceptance, each person can independently turn on sharing for that friend. Sharing is off by default and can be revoked at any time.

## Viewing and saved preferences

For each accepted friend, select either total spending or category spending, then choose one of these periods:

- All time
- Rolling last three months
- Current month through today
- A selected day

The view mode, period, and selected date are saved separately for each friend. Amounts are converted to the viewer's configured display currency when a rate is available; if a rate is unavailable, the source currency is preserved.

## Data access and privacy

- `friendships/{friendshipHash}` stores member UIDs and request state. Callable Functions perform mutations; members can read their own friendship metadata.
- `friendSharing/{ownerUid}/friends/{friendUid}` stores the owner's explicit sharing consent. Only the owner can read it directly; only callable Functions can change it.
- `friendDashboardPreferences/{viewerUid}/friends/{friendUid}` stores the viewer's display choices and is readable and writable only by that viewer.
- Expense documents remain owner-only under Firestore rules. `getFriendSpendingSummary` checks accepted friendship and active consent on the server, then returns only totals and category totals grouped by currency. It never returns transaction IDs, descriptions, or individual expense rows.

New dashboards include the widget by default. Existing saved layouts are migrated by adding it once while preserving the user's other widgets and their order.

## Local testing

Use the demo Firebase Emulator project for friend-flow testing. The hosted `firebase-testing` preview shares the production Firebase project, so the feature is disabled there.

Follow [FIREBASE_EMULATORS.md](../web/FIREBASE_EMULATORS.md) to start Auth, Firestore, and Functions emulators and run `npm run test:friend-emulator`.

## Deployment behavior

- A push to `main` that changes `web/functions/**`, `web/firestore.rules`, `web/firestore.indexes.json`, or `web/firebase.json` deploys Functions and Firestore configuration before Hosting.
- The `main` Hosting build enables friend-spending calls. The `firebase-testing` build keeps them disabled so preview activity cannot read or change production friendship records.
- The Functions runtime is Node.js 22. Keep the checked-in `web/functions/package-lock.json` in sync with `package.json`.
