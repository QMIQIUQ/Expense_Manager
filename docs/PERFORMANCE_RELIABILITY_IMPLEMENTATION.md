# Performance and reliability implementation

Status: code readiness accepted by independent review after iteration 4. Shared-backend deployment and frontend publication await authorization.

## Mutation lifecycle

1. The UI assigns stable document IDs and renders the provisional change immediately.
2. `writeLocalFirst` validates the owner/identity, awaits an IndexedDB transaction, projects the pending change, and acknowledges device persistence. Its foreground Firebase callback does not run; the background worker is the single executor.
3. `offlineQueue` stores operation IDs, payloads, local baselines, dependency keys, ordering, leases, retry deadlines and failures. Legacy localStorage migration commits rows and migration receipts together, preserves source order, and removes the source only after commit. Ambiguous legacy creates stay blocked from ordinary retry. A separate recovery dialog explicitly warns about duplicate records/charges and requires the user to confirm cloud reconciliation and accept that risk.
4. `syncService` claims operations transactionally, renews leases, and completes only its own token. Web Locks provide extra coordination when available. Document/account/category/budget keys preserve related ordering. Independent chains can proceed past failures.
5. Financial/domain changes and immutable receipts at `mutationReceipts/{uid}/operations/{operationId}` commit together. Replaying after a lost acknowledgment does not repeat the balance effect. Replayed account creates cannot reset a later balance.
6. Retryable failures retain their persisted deadline with exponential backoff and jitter. Offline/auth interruptions do not consume attempts. Permanent/exhausted failures remain inspectable. Lease notifications and cross-tab refreshes are coalesced; enqueue acknowledgment does not wait for redundant readbacks.

## Scheduled payments

- Standard confirmation is one intended payment per scheduled period, matching the existing paid-period UI. Its record ID includes owner, scheduled payment, year and month; the generated expense ID derives from it. Same-tab requests share their pending acceptance promise. Concurrent tabs with distinct outbox operation IDs still converge to the same payment.
- A confirmation transaction writes the record, generated expense, account adjustment, spending summary and receipt together. Existing legacy records can acquire their missing generated-expense link.
- New records require their owned scheduled payment to exist. Effective default payment sources are persisted with the record. Existing unrelated expenses cannot be adopted, and conflicting confirmations do not overwrite an existing period.
- Record update reverses the previous expense movement, applies the new one and updates record/expense/summary together. Changing foreign amounts requires a new valuation snapshot.
- Record deletion reverses its generated expense and explicitly linked transfers, and deletes the record/expense/transfers in the same transaction. Ownership/link checks precede writes. Excessive linked transfers are rejected rather than partly deleted.
- Editing a generated expense updates the payment record; deleting it through the linked-expense deletion path removes its payment record too.
- Single/bulk confirmation waits for durable acceptance before marking a period paid or closing successful confirmation UI. Persistence failure restores provisional records/expenses.

## Reads, paging and exact totals

- Dashboard reads cover the current yearly/recent reporting window, the latest expense page, and outstanding tracked expenses. Related repayments are queried by expense IDs across all dates. Routine mutation/sync refreshes target affected entities and share equivalent requests.
- Expense and income history use `useHistoryPages`: opening a list requests one 100-row date/document-ID cursor page; Show more requests the next page. Historical rows are supplied back to mutation handlers, and related repayments/transfers are fetched for expense rows.
- Exact expense statistics are separate from list rows. Online traversals use `financialSnapshotService` to pin every page to the same Firestore read time, authenticated as the current user and subject to the existing rules. This prevents an edit between pages from mixing two snapshots. `readExpenseAggregate` traverses the selected period in bounded pages and retains a page plus scalar category/month/count totals, not a lifetime detail array. It converts each record using existing booked/legacy valuation and minor-unit rounding, and overlays pending identities once. Superseded scans are cancelled logically. Online exact traversals use the authenticated REST read-time consistency selector; offline traversal uses the snapshot envelope's coverage.
- **Cost limitation:** an exact selected-period/lifetime statistic still reads that period's documents in the background. This is not a materialized server aggregate or constant-cost lifetime query. Full text search/alternative sort explicitly traverse the chosen scope; exports explicitly traverse all history. These operations are separate from loading another list page.
- Covered cached history can be paged offline. Exact offline aggregates reuse coherent full/period snapshots and pending overlays; incomplete cached rows are labeled and cannot become exact totals. Every traversal fixes its online/offline source at the start. Offline full-history and aggregate reads verify one snapshot version on each page and again before publication; replacement, narrowing or eviction rejects the result for retry. Cached cursor indexes are reused per snapshot and advanced by binary search. Cache notifications reset an affected offline list to its new first page, and stale in-flight pages cannot append.
- Widget completeness is checked against each widget's actual collections and period. An unrelated wallet/bank failure does not hide a valid expense list or aggregate. Protected UI state remounts on account switching; initial arrays hydrate from owner-scoped cache.
- Financial widgets and statistics have completeness gates. A partial/incomplete scope is not displayed as a final total. Offline export requires an actual coherent full-history snapshot; an old detached completeness marker is insufficient.

Rejected overall-budget limits project the prior accepted limit while retaining the failed intent. Historical relation refreshes retry a changed generation before publishing; a late read cannot resurrect a deleted transfer. The product's discard action refuses leased operations, and obsolete unfenced queue mutation APIs have been removed.

## Cache and stale-read protection

`sessionCache` uses a v2 envelope with data, entity, owner, snapshot version, timestamp, row count and coverage in one atomic storage value. Memory remains coherent on quota/storage failure; reopening sees the prior coherent persisted snapshot, with its own coverage. Legacy data can be displayed but has unknown completeness. Optimistic updates preserve coverage; partial server snapshots explicitly replace it.

Request identity includes owner, collection, scope and generation. Equivalent concurrent reads share a promise. A late read cannot overwrite a newer mutation, including when the newer cache was removed. Value equality normalizes Date/ISO values without whole-dataset JSON equality. Status uses events and subscriptions instead of one-second/five-second storage polling.

## Verification

The user approved adding/running automated tests. Latest acceptance runs: 235 unit tests in 42 files, 17 Firebase emulator cases, and 2 real-browser cases passed. Recorded commands are available through the review workflow.

- Unit suite: outbox persistence/order/dependencies/leases/retry isolation, cache completeness/storage failure, stale reads/shared fetches, real cursor hook behavior, existing UI/domain regressions.
- Firebase Auth/Firestore emulator (`demo-expense-manager`): record/expense/balance/summary atomicity, lost-ack replay, update/delete reversal, reciprocal expense edits, concurrent same-intent confirmation, missing account rejection, account-create replay, income/transfer/budget receipt lifecycles, allocation revisions, and receipt ownership/immutability. New-record existence reads are explicitly allowed for incomes and budgets, with existing documents still owner restricted. A 1,105-record case checks cursor boundaries and exact pending/legacy totals.
- Real Chromium also verifies authenticated snapshot pagination against the demo emulators while a later edit changes the current server document.
- Real Chromium with two isolated tabs: 80 concurrent enqueues, unique persisted sequence/IDs, distinct claims, closing both tabs, reopening after lease expiry, fenced recovery/completion.
- `npm run build`, `npm run lint`, and task-scoped `git diff --check` run separately. These results do not imply measured production latency, production index readiness or live deployment.

Reproduction from `web/`: `npm run test:run`; start demo Auth/Firestore emulators then `npm run test:financial-emulator`; `npm run test:browser` (Chromium and demo Auth/Firestore emulators required); `FIREBASE_DEPLOY=true npm run build`; `npm run lint`.

## Deployment gate

The receipt rules and history indexes must exist before this frontend is published. The existing workflow deploys Firestore only from `main`; `firebase-testing` publishes a Hosting preview using the shared production Firebase project. Shared-backend changes require explicit authorization under the project's production rule, plus backward-compatibility/index readiness checks. Do not publish an incompatible frontend first or claim deployment from build success.

Target: `origin/firebase-testing`. Live index definitions were inspected; six existing untracked indexes are now included in the additive index manifest to preserve them. No backend deployment has been performed.

Independent code review and local validation are complete. Controlled task-only publication and verified Hosting deployment remain required. Pre-existing modified architecture/offline documents, review artifacts and attachments remain outside the task's commits.
