# UI Button & Icon-Chip Style Guide

The action system is now fully tokenized. Every new button must rely on the CSS variables defined in `web/src/index.css` so that light/dark mode, font scaling, and accent updates flow through automatically.

## Token References

- **Accent stack**: `var(--accent-primary)`, `--accent-secondary`, `--accent-hover`, `--accent-light`.
- **Status stack**: `var(--success-bg/text)`, `var(--warning-bg/text)`, `var(--error-bg/text)`, `var(--info-bg/text)`.
- **Structure**: `var(--card-bg)`, `var(--border-color)`, `var(--shadow)`.

If a component needs a new nuance, add a variable before hard-coding a hex value.

## Base Button System

The global stylesheet exposes a `.btn` utility for standard CTAs.

```
.btn {
  @apply inline-flex items-center justify-center gap-2;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px var(--shadow);
}
```

### Supported Variants

- `.btn-primary`: Filled CTA using `var(--accent-primary)` → `--accent-hover` for hover. Text is always white.
- `.btn-secondary`: Neutral surface using `var(--bg-secondary)` + `var(--border-color)`. Ideal for cancel/close.
- `.btn-danger`: Error surface that maps directly to `var(--error-bg/text)` and dark-mode overrides already defined in CSS.
- `.btn-success`: Uses the success token pair for confirm/save states.

Disable buttons with the `disabled` attribute only. The shared styles already dim opacity and block pointer events for both themes.

## Form Action Buttons (BaseForm Pattern)

All form dialogs (create/edit) should follow the `BaseForm` component pattern for consistent button styling.

### Standard Form Buttons

```tsx
{/* Form Actions - from BaseForm.tsx */}
<div className="flex gap-3 pt-2">
  <button
    type="submit"
    className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors"
    style={{
      backgroundColor: 'var(--accent-light)',
      color: 'var(--accent-primary)',
      fontWeight: 600,
      borderRadius: '6px',
      lineHeight: 1.2,
    }}
  >
    {submitLabel || t('save')}
  </button>
  <button
    type="button"
    onClick={onCancel}
    className="px-5 py-2 rounded-md text-sm font-medium transition-colors"
    style={{
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      fontWeight: 600,
      borderRadius: '6px',
      lineHeight: 1.2,
    }}
  >
    {cancelLabel || t('cancel')}
  </button>
</div>
```

### Form Button Specifications

| Property | Submit/Save Button | Cancel Button |
|----------|-------------------|---------------|
| Background | `var(--accent-light)` | `var(--bg-secondary)` |
| Color | `var(--accent-primary)` | `var(--text-primary)` |
| Padding | `8px 16px` (py-2 px-4) | `8px 20px` (py-2 px-5) |
| Border Radius | `6px` | `6px` |
| Font Size | `14px` (text-sm) | `14px` (text-sm) |
| Font Weight | `600` | `600` |
| Line Height | `1.2` | `1.2` |
| Flex | `flex: 1` (fills space) | Fixed width |

### CSS Class Implementation (Inline Forms)

For inline forms outside of `BaseForm`, use these CSS classes:

```css
.inline-form-actions {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.inline-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  line-height: 1.2;
}

.inline-btn-save {
  flex: 1;
  background: var(--accent-light);
  color: var(--accent-primary);
}

.inline-btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 8px 20px;
}
```

### Hover Effects

```css
.inline-btn-save:hover:not(:disabled) {
  filter: brightness(0.95);
}

.dark .inline-btn-save:hover:not(:disabled) {
  filter: brightness(1.1);
}

.inline-btn-cancel:hover {
  filter: brightness(0.95);
}

.dark .inline-btn-cancel:hover {
  filter: brightness(1.1);
}
```

## Icon-Chip Buttons

Use icon chips for inline actions (Edit/Delete/Link). Layout rules:

- `display: inline-flex; align-items: center; justify-content: center; gap: 6px;`
- `padding: 8px` for icon-only, `8px 12px` when a short label is displayed.
- `border-radius: 8px; border: none; background-color: transparent;`

Variants should pull from the token stack:

| Intent  | Background                         | Color                          |
|---------|------------------------------------|--------------------------------|
| Primary | `var(--accent-light)`              | `var(--accent-primary)`        |
| Danger  | `var(--error-bg)`                  | `var(--error-text)`            |
| Success | `var(--success-bg)`                | `var(--success-text)`          |
| Neutral | `rgba(148,163,184,0.18)` (token tbd) | `var(--text-secondary)`      |

Example:

```tsx
import { EditIcon } from '../icons';

<button className="btn-icon btn-icon-primary" aria-label={t('edit')}>
  <EditIcon size={18} />
</button>
```

The `.btn-icon-*` helpers defined in `index.css` already map to the correct token colors and add the brightness hover effect for dark mode.

## Add / Floating CTA Buttons

- Use `.btn-primary` + icon for inline “Add” CTAs (e.g., category lists).
- The floating `+ Add New Expense` button uses the same accent tokens but scales to `56px` height with a pill radius (see `Dashboard.tsx`). Keep FAB shadows tied to `var(--purple-glow)` in dark mode.

Example add button:

```tsx
import { PlusIcon } from '../icons';

<button className="btn btn-primary" onClick={onAddCategory}>
  <PlusIcon size={18} />
  {t('addCategory')}
</button>
```

## Interaction & Dark Mode Notes

- Hover/focus transitions are already defined globally. Do not add bespoke `transition` rules unless necessary.
- For destructive actions inside cards, prefer icon chips + confirmation instead of inline red text links.
- The dark theme automatically injects purple glows and status text overrides. If you see white flashes, you likely used raw `#fff` instead of `var(--card-bg)`.
- Use `filter: brightness()` for hover effects: `0.95` for light mode, `1.1` for dark mode.

## Accessibility

- Every icon-only button **must** have an `aria-label` or `title`.
- Maintain at least 3:1 contrast between icon color and its chip background. Sticking to the tokens above enforces this automatically.
- Keep focus states visible; the global stylesheet adds `outline` defaults, so avoid `outline: none`.

## Reference Implementations

- **BaseForm (standard pattern)**: `web/src/components/common/BaseForm.tsx`
- **Inline Form Buttons**: `web/src/components/dashboard/widgets/QuickAddWidget.tsx`
- Expenses: `web/src/components/expenses/ExpenseList.tsx`
- Incomes: `web/src/pages/tabs/IncomesTab.tsx`
- Cards/E-Wallets: `web/src/components/payment/PaymentMethodsTab.tsx`
- Recurring & Budgets: `web/src/components/recurring/RecurringExpenseManager.tsx`, `web/src/components/budgets/BudgetManager.tsx`

Reuse these helpers for any new feature page to keep the UI consistent across light/dark themes.