# 多幣別 UI 精簡與顯示切換

Date: 2026-06-24
Status: Implemented

## Goal

This change focuses on expense-related currency UX:

- Make currency selection in add, edit, and quick-add flows more compact and easier to click.
- Default new expense currency from the most recent expense when available.
- Preserve the selected currency when the user chooses `Add another`.
- Put the add-expense currency choice on its own step after date/time, then auto-advance to amount after selection.
- Let read-only expense amounts on the dashboard switch display currency at the page level.
- Keep the data schema unchanged and continue using the existing currency fields:
  `currency`, `baseCurrency`, `exchangeRate`, `exchangeRateDate`, `exchangeRateFetchedAt`, `exchangeRateProvider`, `baseAmount`.

## Scope

Included:

- `StepByStepExpenseForm`
- `ExpenseForm`
- `QuickAddWidget`
- `ExpenseList`
- `Dashboard` page currency display state
- `ExpenseList` display currency control row next to multi-select actions
- dashboard expense widgets that render read-only expense amounts
- dashboard home keeps a compact page-level selector so read-only amounts can still be switched from the main dashboard

Excluded for now:

- income currency display switching
- transfer currency display switching
- chart currency switching
- export currency switching
- schema migration work

## UX Decisions

1. Replace full-width currency dropdowns with a compact button-triggered `CurrencySelector`.
2. Keep the selector height low enough for mobile and desktop forms.
3. Use the latest expense as the default currency source for new expense entry.
4. Reuse the current selection when the user saves and immediately adds another expense.
5. Put the add-expense currency choice on its own step after date/time, and auto-advance to amount after the user picks a currency.
6. Treat display-currency switching as a presentation layer concern only.
7. Convert mixed-currency expense totals entry-by-entry before summing, and reuse cached exchange rates through `currencyRateService`.
8. Use a direct inline currency card grid in the add-expense currency step so the available currencies are visible immediately without opening another control.

## Component Boundaries

### Shared selector

- `web/src/components/common/CurrencySelector.tsx`
- Compact button trigger
- Portal-based popover
- Keyboard support:
  - open with Enter / Space / ArrowDown
  - close with Escape
  - close on outside click

### Add / edit expense flows

- `web/src/components/expenses/StepByStepExpenseForm.tsx`
- `web/src/components/expenses/ExpenseForm.tsx`

Behavior:

- new form defaults to `initialData.currency || lastUsedCurrency || DEFAULT_BASE_CURRENCY`
- add-expense flow now steps `date/time -> currency -> amount -> category -> description -> payment`
- `Add another` keeps the current currency instead of resetting to MYR
- editing keeps the existing expense currency unless the user changes it

### Quick add and presets

- `web/src/components/dashboard/widgets/QuickAddWidget.tsx`
- `web/src/components/expenses/ExpenseList.tsx` quick preset editor

Behavior:

- use the shared compact selector
- preserve the existing preset currency editing flow

### Read views

- `web/src/pages/Dashboard.tsx`
- `web/src/components/expenses/ExpenseList.tsx`
- `web/src/components/dashboard/CustomizableDashboard.tsx`
- `web/src/components/dashboard/widgets/RecentExpensesWidget.tsx`
- `web/src/components/dashboard/widgets/TrackedExpensesWidget.tsx`
- `web/src/components/dashboard/widgets/CategoryBreakdownWidget.tsx`
- `web/src/components/dashboard/widgets/SummaryCardsWidget.tsx`
- `web/src/components/dashboard/DashboardSummary.tsx`

Behavior:

- dashboard page owns a `displayCurrency` state
- expense list keeps the display-currency control next to the multi-select toolbar
- expense-related read-only amounts follow the selected display currency
- charts and exports remain unchanged

## Data Flow

1. Dashboard loads expenses sorted by date descending.
2. The newest expense becomes the source for `lastUsedCurrency`.
3. Add/edit forms receive `lastUsedCurrency` and initialize the selector from it.
4. Read views receive `displayCurrency`.
5. Mixed-currency totals are converted per expense before aggregation.
6. Exchange rates are fetched through `currencyRateService` and cached.

## Acceptance Criteria

- New expense starts with the latest expense currency.
- `Add another` keeps the selected currency.
- Edit mode shows the original currency, not the default.
- Dashboard expense cards, daily totals, and expense widgets change when display currency changes.
- Currency selector is smaller than the original dropdown and works on keyboard and mouse.
- No schema changes are required.

## Test Plan

Automated checks added or expected:

- `CurrencySelector` opens, selects, and closes correctly.
- `StepByStepExpenseForm` uses `lastUsedCurrency` for new entries.
- `StepByStepExpenseForm` advances from currency selection to amount automatically.
- `ExpenseList` renders the display currency selector in the list controls row.
- existing expense form tests still pass with the compact selector.
- build passes with `noUnusedLocals` and `noUnusedParameters` enabled.

Manual verification:

- open add expense form on desktop and mobile
- confirm selector height and click target feel compact
- confirm `Add another` preserves the selected currency
- toggle dashboard display currency and verify expense-only values update

## Change Log

- 2026-06-24: introduced shared compact currency selector
- 2026-06-24: threaded latest-expense currency into add/edit flows
- 2026-06-24: added page-level display currency state for expense read views
- 2026-06-24: added conversion helper hook and shared rate conversion helper
- 2026-06-24: moved expense display currency control into the list toolbar row
- 2026-06-24: split add-expense currency into its own step after date/time
- 2026-06-24: kept a compact selector on the dashboard home tab for page-level switching
- 2026-06-24: replaced the add-expense currency dropdown with an inline currency card grid
