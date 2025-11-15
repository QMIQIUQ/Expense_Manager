# UI Button & Icon-Chip Style Guide

This guide defines the standard visual language for action buttons across the app. Follow these rules when adding or updating UI so new features remain visually consistent.

## Icon-Chip Buttons

- Purpose: Soft, unobtrusive action affordances with clear intent via color.
- Shape: Rounded chip, radius 8px.
- Layout: Inline-flex, center both axes, 8px padding.
- Icon: Use shared SVG icons from `web/src/components/icons/index.tsx`. Prefer `size={18}`.
- Color model: Tint background with transparent color; set `color` to solid tone so icons/text inherit.

### Base style (pseudo-code)

```
const chipBase = {
  padding: '8px 12px' | '8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};
```

### Variants

- Primary (Edit):
  - `backgroundColor: 'rgba(99,102,241,0.12)'`
  - `color: '#4f46e5'`
- Danger (Delete):
  - `backgroundColor: 'rgba(244,63,94,0.12)'`
  - `color: '#b91c1c'`
- Success (Save):
  - `backgroundColor: 'rgba(34,197,94,0.15)'`
  - `color: '#16a34a'`
- Neutral (Cancel/Close):
  - `backgroundColor: 'rgba(148,163,184,0.2)'`
  - `color: '#374151'`

Examples:
- Edit: `<button style={{ ...chipBase, ...primary }}> <EditIcon size={18} /> </button>`
- Delete: `<button style={{ ...chipBase, ...danger }}> <DeleteIcon size={18} /> </button>`
- Save: `<button style={{ ...chipBase, ...success }}> <CheckIcon size={18} /> </button>`
- Cancel: `<button style={{ ...chipBase, ...neutral }}> <CloseIcon size={18} /> </button>`

## Add (CTA) Buttons

Use the same chip pattern for add CTAs with an icon + label.

- Style:
  - `padding: '8px 12px'`
  - `backgroundColor: 'rgba(99,102,241,0.12)'`
  - `color: '#4f46e5'`
  - `borderRadius: '8px'`
  - `display: 'flex'`, `gap: '8px'`
- Content: `<PlusIcon size={18} /> <span>{t('addXxx')}</span>`
- Applied to: Incomes, E‑Wallets, Cards, Categories, Budgets, Recurring.

## Accessibility

- Every actionable icon must have an `aria-label` describing the action: `aria-label={t('edit')}`.
- Maintain at least 3:1 contrast between icon color and background.

## Where to import icons

- `import { PlusIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '../icons';`
- Central icon library: `web/src/components/icons/index.tsx`.

## Do/Don't

- Do keep labels short on add CTAs; icon-only for inline row actions.
- Do not use solid filled primary buttons for secondary actions inside cards.
- Do keep spacing consistent: 8px gaps between actions.

## Reference Implementations

- Expenses: `web/src/components/expenses/ExpenseList.tsx`
- Incomes: `web/src/components/income/IncomeList.tsx`, `web/src/pages/tabs/IncomesTab.tsx`
- E‑Wallets: `web/src/components/ewallet/EWalletManager.tsx`
- Cards: `web/src/components/cards/CardManager.tsx`
- Categories: `web/src/components/categories/CategoryManager.tsx`
- Budgets: `web/src/components/budgets/BudgetManager.tsx`
- Recurring: `web/src/components/recurring/RecurringExpenseManager.tsx`

Adopt this guide for any new feature pages to ensure consistent UX.