# Seven-feature implementation and acceptance plan

All seven requested features are in scope. Release target: main, as explicitly requested. Do not release a partial six-feature suite or include unrelated existing documentation edits.

| Feature | Implementation | Acceptance |
| --- | --- | --- |
| Suspected duplicate expenses | Compare the complete same-day scope by normalized description, currency and minor-unit amount; include durable pending expenses. Let the user cancel or intentionally proceed. | First increment committed as 6f13f63. Incomplete reads show uncertainty. |
| Saved filters and remembered views | Owner-scoped saved presets and last view in user settings; synchronize per-intent changes across devices. Preserve the exact saved dates, category, payment source, sort and tag. | First increment committed as 6f13f63. Offline reload and synchronization covered in browser tests. |
| Month-end account reconciliation | Select account and period, enter opening/statement closing balances, inspect all movements in pages, check transactions, save drafts and complete only at zero difference. | Financial increment undergoing independent review. Completion queries, account data, marks and receipt now share one serializable transaction. Later history edits require review. |
| One-time expense splits | Store stable participant IDs and original-currency owed amounts. Equal split includes the owner; the owner's share is excluded from receivables. Associate existing repayment records explicitly with a participant. | Financial increment undergoing independent review. Repayment, per-person counter, account delta and immutable receipt commit together. Legacy unassigned repayments remain visible. |
| Spending anomaly hints | Explicit analysis of complete current month-to-date versus the median of the previous three matched month-to-date periods. Apply minimum sample and increase thresholds; exclude generated scheduled-payment expenses. | First increment committed as 6f13f63. Gross booked MYR basis is disclosed. Analysis does not run on every dashboard render. |
| Custom transaction tags | Actual owner-scoped tags with stable IDs, atomic unique-name reservations, rename/archive/restore, expense editing and filtering. | First increment committed as 6f13f63. No inference from ordinary category names. |
| Permanent receipt attachments | Retain receipt evidence after the expense has been accepted, including later viewing and offline pending uploads. | User selected existing-plan Firestore storage. Implementation and receipt-specific emulator/browser tests pass; final integrated review remains. |

## Financial safeguards

- Await durable IndexedDB outbox persistence before local acceptance. Keep optimistic display, and retain failed remote operations for recovery.
- Use syncService as the only queued mutation executor; stable owner/document IDs, dependency ordering, leases and receipts survive retries and tab closure.
- Protect split counters and settlement fields through coupled Firestore writes. A payment cannot independently change the counter or be deleted without its corresponding counter reversal.
- Save actual account-currency movements at financial mutation time. Verify the source fields before using those amounts. Do not substitute a later exchange quote for an unknown legacy booked value; mark that reconciliation incomplete.
- Traverse all pages for exact period totals. Render a bounded list separately from the full-period calculation. Share matching concurrent reads and reject incomplete offline scopes.

## Selected receipt provider

The user selected Firestore storage under the existing Firebase plan; no billing upgrade is required. Store immutable content in separate documents and atomically commit content, metadata and the mutation receipt. Metadata lists never load the file bytes. Each stored receipt is limited to 600 KiB; input files are limited to 10 MiB. JPEG, PNG and WebP images can be compressed; PDFs must already meet the stored limit. Actual file signatures, byte lengths and SHA-256 checksums are validated. Archive/restore retains content and continues consuming Firestore quota. Locally cached receipts remain viewable offline; uncached remote content requires a connection.

Shared requirements: stable attachment IDs; owner and expense binding; actual file-type validation; checksum and byte size; pending/synchronized/error status; content remains recoverable after storage or remote failure; OCR draft cleanup waits for durable expense and attachment acceptance. Provider-specific limits and deployment configuration must be settled before implementation is finalized.

## Validation and release

- Unit/component tests: duplicate choices, owner changes, exact saved dates, tag reservations, anomaly thresholds, integer split calculations, asynchronous form acceptance, booked account values and incomplete legacy data.
- Emulator tests: atomic balances and receipts, replay and concurrent settlement, direct SDK counter/settlement rejection, reconciliation races, 1,005-movement finalization, 1,005-repayment scoped traversal and foreign-account booking stability.
- Browser tests: offline acceptance, reload, synchronization, duplicate choices, equal shares, per-person outstanding balances, saved views/tags, reconciliation completion guards and explicit spending analysis. Existing multi-tab, startup and snapshot tests remain included.
- TypeScript, lint, production build and whitespace checks must pass on the final release tree.
- Review and commit only task changes. Transfer only task commits onto the latest origin/main while preserving the current branch and unrelated working tree changes. Deploy required rules/indexes before enabling dependent UI, push main without force, check deployment workflows, and verify the live revision.
- Mark the overall goal complete only after all seven features and deployment are verified.
