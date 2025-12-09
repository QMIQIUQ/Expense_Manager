# Date & Time Format System Guide

This document explains the date and time format system in Expense Manager, including how to use the formatting utilities and ensure consistency across the application.

## Overview

The application supports user-configurable date and time formats. Users can set their preferences in **User Profile > Display Settings**, and all dates/times throughout the app will display according to these preferences.

## Supported Formats

### Time Formats (`TimeFormat` type)

| Format | Example | Description |
|--------|---------|-------------|
| `24h` | 14:30 | 24-hour format (default) |
| `12h` | 2:30 PM | 12-hour format with AM/PM |

### Date Formats (`DateFormat` type)

| Format | Example | Description |
|--------|---------|-------------|
| `YYYY-MM-DD` | 2024-12-04 | ISO format (default) |
| `DD/MM/YYYY` | 04/12/2024 | European format |
| `MM/DD/YYYY` | 12/04/2024 | US format |
| `YYYY/MM/DD` | 2024/12/04 | Asian format |
| `MMM DD, YYYY` | Dec 04, 2024 | US English month format |
| `DD MMM YYYY` | 04 Dec 2024 | European English month format |

## Architecture

### Type Definitions

Located in `src/types/index.ts`:

```typescript
export type TimeFormat = '12h' | '24h';

export type DateFormat = 
  | 'YYYY-MM-DD' 
  | 'DD/MM/YYYY' 
  | 'MM/DD/YYYY' 
  | 'YYYY/MM/DD' 
  | 'MMM DD, YYYY' 
  | 'DD MMM YYYY';
```

### Context Provider

The `UserSettingsContext` (`src/contexts/UserSettingsContext.tsx`) provides:

```typescript
interface UserSettingsContextType {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  setTimeFormat: (format: TimeFormat) => Promise<void>;
  setDateFormat: (format: DateFormat) => Promise<void>;
  refreshSettings: () => Promise<void>;
}
```

### Utility Functions

Located in `src/utils/dateUtils.ts`:

#### `formatDateWithUserFormat(date, format)`
Formats a date according to user's preference.

```typescript
import { formatDateWithUserFormat } from '../../utils/dateUtils';
import { useUserSettings } from '../../contexts/UserSettingsContext';

const { dateFormat } = useUserSettings();
const formattedDate = formatDateWithUserFormat(expense.date, dateFormat);
// Result: "Dec 04, 2024" (if format is 'MMM DD, YYYY')
```

#### `formatDateRangeShort(startDate, endDate, format)`
Formats a date range for display (e.g., budget periods).

```typescript
const range = formatDateRangeShort('2024-12-01', '2024-12-31', dateFormat);
// Result: "Dec 1 - Dec 31" (if format is 'MMM DD, YYYY')
```

#### `formatDateShort(date, format)`
Formats a date for compact display (e.g., chart labels).

```typescript
const shortDate = formatDateShort('2024-12-04', dateFormat);
// Result: "Dec 4" (if format is 'MMM DD, YYYY')
```

#### `formatTimeWithUserFormat(time, format)` *(in TimePicker)*
Formats time according to user's preference.

```typescript
// For 24h format: "14:30"
// For 12h format: "2:30 PM"
```

## Usage Guide

### Step 1: Import Required Dependencies

```typescript
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { formatDateWithUserFormat } from '../../utils/dateUtils';
```

### Step 2: Get User's Format Preference

```typescript
const MyComponent: React.FC = () => {
  const { dateFormat, timeFormat } = useUserSettings();
  // ...
};
```

### Step 3: Format Dates for Display

```typescript
// In JSX
<span>{formatDateWithUserFormat(expense.date, dateFormat)}</span>

// For date ranges
<span>{formatDateRangeShort(budget.startDate, budget.endDate, dateFormat)}</span>
```

### Step 4: Use DatePicker/TimePicker Components

Pass the format to form components:

```typescript
<DatePicker
  value={formData.date}
  onChange={(date) => handleChange('date', date)}
  dateFormat={dateFormat}
/>

<TimePicker
  value={formData.time}
  onChange={(time) => handleChange('time', time)}
  timeFormat={timeFormat}
/>
```

## Components Using Date/Time Formatting

### Date Display Components

| Component | Location | Usage |
|-----------|----------|-------|
| `ExpenseList` | `components/expenses/ExpenseList.tsx` | Expense dates in list |
| `IncomeList` | `components/income/IncomeList.tsx` | Income dates in list |
| `RepaymentList` | `components/repayment/RepaymentList.tsx` | Repayment dates |
| `TrackedExpensesWidget` | `components/dashboard/widgets/TrackedExpensesWidget.tsx` | Tracked expense dates |
| `DashboardSummary` | `components/dashboard/DashboardSummary.tsx` | Summary section dates |
| `BudgetManager` | `components/budgets/BudgetManager.tsx` | Budget period display |
| `BudgetProgressWidget` | `components/dashboard/widgets/BudgetProgressWidget.tsx` | Budget widget dates |
| `CardManager` | `components/cards/CardManager.tsx` | Card billing dates |
| `CardsSummary` | `components/cards/CardsSummary.tsx` | Card summary dates |
| `CardsSummaryWidget` | `components/dashboard/widgets/CardsSummaryWidget.tsx` | Card widget dates |
| `ScheduledPaymentCard` | `components/scheduledPayments/ScheduledPaymentCard.tsx` | Payment dates |
| `RecentExpensesWidget` | `components/dashboard/widgets/RecentExpensesWidget.tsx` | Recent expense dates |
| `SpendingTrendWidget` | `components/dashboard/widgets/SpendingTrendWidget.tsx` | Chart labels |
| `PaymentCalendarView` | `components/payment/PaymentCalendarView.tsx` | Calendar dates |
| `CategoryManager` | `components/categories/CategoryManager.tsx` | Expense dates in delete modal |
| `ImportExportModal` | `components/importexport/ImportExportModal.tsx` | Import preview dates |
| `IncomeForm` | `components/income/IncomeForm.tsx` | Linked expense dates |

### Form Components

| Component | Location | Props |
|-----------|----------|-------|
| `DatePicker` | `components/common/DatePicker.tsx` | `dateFormat` |
| `TimePicker` | `components/common/TimePicker.tsx` | `timeFormat` |
| `ExpenseForm` | `components/expenses/ExpenseForm.tsx` | Uses both pickers |
| `IncomeForm` | `components/income/IncomeForm.tsx` | Uses DatePicker |
| `RepaymentForm` | `components/repayment/RepaymentForm.tsx` | Uses DatePicker |
| `TransferForm` | `components/transfer/TransferForm.tsx` | Uses DatePicker |
| `RecurringExpenseForm` | `components/recurring/RecurringExpenseForm.tsx` | Uses DatePicker |

## Adding New Date/Time Displays

When adding a new component that displays dates or times, follow this checklist:

### Checklist

- [ ] Import `useUserSettings` from context
- [ ] Import `formatDateWithUserFormat` (or other utils) from `dateUtils.ts`
- [ ] Get `dateFormat` and/or `timeFormat` from `useUserSettings()`
- [ ] Use formatting functions instead of displaying raw dates
- [ ] For forms, pass `dateFormat`/`timeFormat` to DatePicker/TimePicker

### Example: New Component

```typescript
import React from 'react';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { formatDateWithUserFormat } from '../../utils/dateUtils';

interface MyComponentProps {
  items: Array<{ id: string; date: string; name: string }>;
}

const MyComponent: React.FC<MyComponentProps> = ({ items }) => {
  const { dateFormat } = useUserSettings();

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.name} - {formatDateWithUserFormat(item.date, dateFormat)}
        </li>
      ))}
    </ul>
  );
};

export default MyComponent;
```

## Data Storage

### Database Format
- Dates are **always stored as `YYYY-MM-DD`** in Firestore
- Times are **always stored as `HH:MM`** (24-hour format)
- Formatting is only applied at display time

### User Settings Storage

User preferences are stored in the `userSettings` collection:

```typescript
interface UserSettings {
  userId: string;
  timeFormat: TimeFormat;   // '12h' | '24h'
  dateFormat: DateFormat;   // 'YYYY-MM-DD' | 'DD/MM/YYYY' | etc.
  billingCycleDay: number;
  // ...
}
```

## Testing

When testing date/time formatting:

1. Change format in User Profile settings
2. Verify all date displays update correctly
3. Test both numeric formats (YYYY-MM-DD) and English month formats (MMM DD, YYYY)
4. Verify forms show dates in correct format
5. Verify data is still stored in standard format (YYYY-MM-DD)

## Common Issues

### Issue: Date not formatted
**Cause**: Component using raw `expense.date` instead of `formatDateWithUserFormat()`
**Fix**: Import utils and use formatting function

### Issue: Format not updating
**Cause**: Component not using `useUserSettings()` context
**Fix**: Add `const { dateFormat } = useUserSettings();`

### Issue: DatePicker showing wrong format
**Cause**: `dateFormat` prop not passed to DatePicker
**Fix**: Pass `dateFormat={dateFormat}` prop

## Related Files

- `src/types/index.ts` - Type definitions
- `src/utils/dateUtils.ts` - Formatting utilities
- `src/contexts/UserSettingsContext.tsx` - Settings context
- `src/services/userSettingsService.ts` - Settings persistence
- `src/pages/UserProfile.tsx` - Settings UI
- `src/components/common/DatePicker.tsx` - Date input component
- `src/components/common/TimePicker.tsx` - Time input component
