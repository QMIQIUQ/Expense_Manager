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

## Mandatory local-first and financial mutation contract

- Every user mutation must commit a stable owner and document ID to the IndexedDB outbox before reporting local acceptance. Keep the optimistic display while synchronization runs in the background. Surface storage failure and preserve pending operations on permanent remote errors.
- Queue persistence is asynchronous. Await enqueue, retry, removal and migration; use syncService as the only queue executor. Use transactional claims and fencing tokens across tabs, and preserve document/account dependencies.
- Every remote queued mutation must atomically write its immutable mutation receipt with its domain changes. A replay or expired worker must not overwrite newer values or repeat a balance adjustment.
- Commit scheduled payment records, generated expenses, account changes and spending summaries in one transaction. Keep stable IDs through retries.
- Refresh affected collections after a batch; share matching concurrent reads and retain invalidations arriving during a read. Do not refresh the entire dashboard after each operation.
- Read financial data by explicit scope and stable cursors. Keep full-period totals separate from rendered pages, mark incomplete scopes clearly, and traverse full history explicitly for exports.
- Cache and sync status must be driven by data changes and subscriptions rather than storage polling.
