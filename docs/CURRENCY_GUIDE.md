# Currency behavior and implementation plan

Date: 2026-10-09
Status: Validated and targeted for `firebase-testing`; check the latest Firebase Hosting workflow for hosted status.

## Currency model

- Supported currencies are MYR, USD, TWD, SGD, CNY, EUR, GBP, and JPY. MYR is the accounting/base currency.
- Older data without currency metadata is interpreted using its established parent record currency where one exists; otherwise it defaults to MYR.
- Transaction records keep the entered amount and currency. Expenses, income, repayments, transfers, and confirmed scheduled-payment records save dated MYR valuation fields. Changing the display preference never rewrites those records.
- An explicit unsupported currency is rejected. A foreign transaction without a usable valuation is unavailable for MYR totals; its raw amount is never labeled as MYR.
- Posting rates use the transaction date. A missing historical rate is an error; the app does not silently substitute today's rate. Display-only analytics can show an unavailable state when a dated conversion cannot be loaded.
- JPY uses zero fractional digits; the other supported currencies use two. Input, rounding, and output formatting follow the currency's minor units.
- Account balances are kept in each bank or e-wallet's native currency. Cross-currency transfers save separate source-debit and destination-credit amounts and valuations.

## Shared implementation boundary

- `web/src/domain/money.ts` validates currency codes and provides minor-unit precision, rounding, formatting, and snapshot conversion.
- `web/src/services/currencyRateService.ts` retrieves cached historical rates and builds immutable valuation snapshots.
- `web/src/utils/currencyUtils.ts` holds backward-compatible expense accessors and base-amount helpers for income and repayment records.
- `web/src/components/common/CurrencySelector.tsx` is the reusable currency picker.
- `web/src/components/common/CurrencyAmount.tsx` is the reusable conversion display, including loading and unavailable states.
- `UserSettings.displayCurrency` is the persisted display preference used by profile, dashboard, reports, and analytics.

## Covered areas

| Area | Behavior |
| --- | --- |
| Expenses, quick expenses, and receipt review | Preserve the source amount; validate and save its date-specific MYR valuation on create or a change to amount, date, or currency. |
| Income and repayments | Support source currency, save their own dated MYR snapshot, and use base values for net, excess, and dashboard calculations. |
| Transfers | Capture source and settled destination amounts separately when currencies differ; update bank/e-wallet balances in each account's native currency. |
| Display and reports | Convert per record before aggregation; persist the user's display currency; show unavailable conversions explicitly. |
| Budgets | Keep the chosen budget currency and stored MYR rate. Invalid foreign rates are unavailable, never treated as 1:1. JPY entry uses whole-yen precision. |
| Scheduled payments | Store the schedule's source currency. Confirmation saves actual and expected valuations at their payment and due dates; auto-created expenses reuse the actual snapshot. Analytics converts scheduled forecasts and history to the selected display currency. A schedule with payment history cannot change currency; create a new schedule to switch currencies. |
| Recurring reminders | Save and display the reminder's source currency with the right precision. |
| Banks and e-wallets | Store a native account currency and update balances using dated conversions. |
| Cards | Store card currency; limits, spend, cashback thresholds, and summaries use that currency. |
| Import/export and offline | Expense exports retain source currency and valuation fields; scheduled-payment CSV includes its currency. Offline queue payloads retain currency/snapshot fields. Creating a foreign transaction offline still needs a cached dated rate. |

## Change sequence

1. Keep existing Firestore fields and add only optional currency/snapshot fields; do not destructively migrate old records.
2. Validate and resolve snapshots at transaction entry. Preserve a snapshot on metadata-only edits; refresh it when amount, currency, or booking date changes.
3. Preserve source amounts separately from booked MYR values. Never change stored amounts when the display preference changes.
4. Convert items before aggregating. For account updates, convert each posting into the account's native currency.
5. Treat conversion failure as unavailable. Never substitute a latest rate for a historical posting or label the source amount as the requested currency.
6. Keep cross-currency transfer source debit and destination credit distinct. Preserve the destination settlement amount when updating balances or exporting.
7. Validate with type-check/build/lint and verify supported currencies, JPY precision, snapshots, mixed-currency reports, transfers, accounts, scheduled payments, imports/exports, and unavailable-rate behavior before deployment.

## How to verify in the test site

1. In **Profile → Display Settings**, choose USD, reload, and confirm the preference remains selected.
2. Create a USD expense, income, and repayment. Confirm each row keeps its source code and that dashboard totals use the selected display currency. Change display currency and confirm the saved source amounts do not change.
3. Create a JPY expense and scheduled payment. Confirm inputs and formatted amounts have no decimal places.
4. Set up a bank or e-wallet in a currency different from a payment, then add an expense or income and confirm the account balance uses the account's currency.
5. Create a transfer between accounts in different currencies. Confirm the form accepts separate source and destination amounts and both account balances move by their respective values.
6. Confirm a scheduled payment in foreign currency. Check the payment history and analytics, and if auto-generation is enabled confirm the created expense uses the saved payment valuation.
7. Edit a scheduled payment with history and try to change its currency. The app should explain that a new schedule is needed.
8. With network disabled and no cached rate for the transaction date, try to save a foreign transaction. The app should report the missing rate and avoid saving a fabricated MYR valuation.
