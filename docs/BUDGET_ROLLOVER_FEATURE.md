# Budget Rollover Feature (Phase 3.1)

## Overview

The Budget Rollover feature allows users to carry unused budget from one billing period to the next. This helps users who don't spend their full budget in a month to accumulate savings for larger expenses.

## How It Works

### Settings

When creating or editing a budget, users can enable rollover with the following options:

1. **Enable Rollover** - Toggle to activate rollover for this budget
2. **Rollover Percentage** - How much of the remaining budget to carry over:
   - 100% (Full) - Carry over all remaining budget
   - 75% - Carry over 75% of remaining
   - 50% - Carry over half
   - 25% - Carry over a quarter
3. **Rollover Cap** (Optional) - Maximum amount that can be rolled over

### Example

- Monthly budget: $500
- Spent this month: $350
- Remaining: $150
- Rollover percentage: 100%
- Rollover cap: $200

Result: $150 carries over to next month, making next month's effective budget $650.

### Visual Indicators

- 🔄 Badge appears next to budgets with rollover enabled
- Accumulated rollover amount is shown with a "+$X.XX" badge
- Progress bar and spending calculations use the effective budget (base + rollover)

## Technical Implementation

### Budget Type Fields

```typescript
interface Budget {
  // ... existing fields
  rolloverEnabled?: boolean;    // Whether rollover is enabled
  rolloverPercentage?: number;  // 0-100, percentage to roll over
  rolloverCap?: number;         // Optional maximum rollover amount
  accumulatedRollover?: number; // Current accumulated rollover
}
```

### Key Functions

- `getEffectiveBudgetAmount(budget)` - Returns budget amount + accumulated rollover
- `calculateRolloverAmount(budget, expenses, repayments, billingCycleDay)` - Calculates rollover at period end
- `getBillingCyclePeriod(billingCycleDay, date)` - Gets current billing cycle boundaries

### Integration Points

1. **BudgetForm** - UI for configuring rollover settings
2. **BudgetManager** - Displays rollover status and uses effective amounts
3. **BudgetProgressWidget** - Uses effective amounts for progress display
4. **budgetNotifications** - Uses effective amounts for alerts

## Translation Keys

- `rolloverBudget` - "Budget Rollover" / "預算結轉"
- `rolloverDescription` - "Carry remaining budget to next period" / "將剩餘預算結轉至下期"
- `rolloverPercentage` - "Rollover Percentage" / "結轉比例"
- `fullRollover` - "Full Rollover" / "全額結轉"
- `rolloverCap` - "Rollover Cap" / "結轉上限"
- `noLimit` - "No Limit" / "無上限"
- `accumulatedRollover` - "Accumulated Rollover" / "累計結轉"
- `rolloverEnabled` - "Rollover Enabled" / "已啟用結轉"

## Usage Notes

- Rollover is currently supported only for monthly budgets
- Rollover calculation happens when a new billing cycle begins
- The accumulated rollover resets if the user disables rollover
- Repayments are deducted from expenses when calculating remaining budget

## Future Enhancements

- Automatic rollover calculation via background service/cloud function
- Rollover history tracking
- Weekly/yearly budget rollover support
