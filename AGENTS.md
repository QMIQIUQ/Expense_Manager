# Project instructions

## Required local-first behavior

- Every ordinary user data mutation must update the visible React state and local cache before waiting for Firebase. Use a stable document ID throughout the UI, durable outbox and domain service.
- Persist the complete mutation with its owner and ID through `writeLocalFirst` / `writeLocalFirstBatch` (or `useOptimisticCRUD`) before calling Firebase. Offline submission must finish locally without waiting on an SDK write promise. Keep later operations for the same account in chronological order.
- Every cached or server read must reconcile pending operations through `applyPendingOperations`; an older background response must not overwrite a newer local write. Apply this rule to new features and existing collection/singleton preferences alike.
- Keep account balance side effects inside domain Firestore transactions. Distinguish locally accepted data from server confirmation; show recoverable sync errors, retain retryable writes, and roll back rejected mutations. Permission changes, authentication and server-validated financial limits still require their server checks.
- Verify changes affecting this behavior with meaningful delayed-write, offline/reload, rejection and replay-order checks. The behavioral contract and feature coverage are documented in `docs/OFFLINE_SYNC_ARCHITECTURE.md`.

## Default branch and Firebase test deployment

- Unless the user requests a different destination, use `firebase-testing` as the default branch for project changes and push the task's finished commits to `origin/firebase-testing`. This branch triggers `.github/workflows/firebase-hosting-deploy.yml`.
- Keep production changes on `main` only when the user explicitly requests a production deployment. Do not push task changes to `main` by default.
- Before switching branches or pushing, preserve unrelated working-tree changes. Commit only changes for the current task; never include, reset, overwrite, or force-push unrelated user work. If the task cannot be placed on `firebase-testing` safely, explain the issue and ask before pushing.
- After pushing, check the Firebase Hosting workflow run. When deployment succeeds, give the user the deployed test site link: [Expense Manager Firebase test site](https://expense-manager-41afb.web.app/). If the workflow fails or has not completed, say so clearly and do not claim the site has been updated.
