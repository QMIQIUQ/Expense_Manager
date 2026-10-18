# Performance and reliability implementation plan

## Scope

Preserve local-first interaction: commit the pending operation locally before acknowledging it, render pending data immediately, and synchronize without blocking navigation. Target `firebase-testing`. Preserve unrelated existing documentation edits.

## Execution order and acceptance criteria

1. **Align local-first foundations.** Port the web changes from main commits `c0b02b8` and `456b556` onto the current testing branch with a three-way merge. Preserve testing-only category creation improvements. Do not replace deployment configuration or unrelated documents.
2. **Transactional outbox.** Store operations individually in IndexedDB. Migrate the legacy localStorage queue in a transaction, retain recoverable legacy data on failure, validate versioned records, and coordinate tabs with a shared synchronization lock. Persist before reporting success; confirm deletion before reporting synchronization. Keep account isolation and stable operation/entity IDs.
3. **Atomic scheduled payments.** Commit the payment record, optional generated expense, account balance changes and spending summary together. Retrying an acknowledged operation must not charge the account twice. Recover partial records created by older clients.
4. **Read coordination.** Coalesce synchronization notifications, invalidate only affected collections and account dependencies, share concurrent requests, and initialize defaults once per user session. A synchronized batch must not trigger one full dashboard reload per operation.
5. **Bounded history reads.** Use explicit period queries and stable cursor pagination in the actual UI. Keep full-period totals, budget calculations, outstanding repayments, linked records and exports correct; never present a page subtotal as a full-period total. Include existing users and offline navigation in the design.
6. **Retry scheduling.** Track dependencies on documents/accounts and budget allocation, rather than blocking every operation for a user. Use persisted exponential backoff with jitter and a next-attempt time. Keep exhausted operations visible and manually retryable. Preserve ordering for related financial writes.
7. **Cache and status overhead.** Reuse memory snapshots, compare entries by values/versions without serializing entire collections for equality, persist only changed snapshots, and notify status subscribers on changes instead of polling storage.

## Completion evidence

- Inspect all mutation callers for the asynchronous persistence contract and read projections.
- Check cross-tab ownership, crash/reload recovery, storage errors, migration, account switching, retries, and partial legacy scheduled payments.
- Inspect totals and history consumers before replacing unrestricted reads.
- Run the TypeScript/build and lint commands and record the actual results.
- Independently review the task diff through the connected planning/review workflow.
- Commit only task changes, push to `origin/firebase-testing`, inspect the Firebase Hosting workflow, and report its actual state and site URL.

## Current status

The plan was completed before implementation. The local-first web changes have been ported, and the six improvement areas have an initial implementation. See `PERFORMANCE_RELIABILITY_IMPLEMENTATION.md` for the current methods, flows and outstanding acceptance/deployment gates. This file is not evidence of runtime acceptance.
