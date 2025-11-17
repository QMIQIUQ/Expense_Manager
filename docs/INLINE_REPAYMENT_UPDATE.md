# Inline Repayment Display Update

## Overview

This document describes the updates made to convert the repayment system from modal-based to inline display, along with enhanced visualization and tracking features.

## Changes Summary

### 1. Inline Repayment Display (Instead of Modal)

**Before:**
- Clicking 💰 button opened a modal overlay
- Modal covered the entire screen
- Could not see other expenses while managing repayments

**After:**
- Clicking 💰 button expands repayment section inline below the expense
- Section collapses when clicking 💰 again
- Button shows green background when expanded
- Can see other expenses and context while managing repayments

**Files Changed:**
- `ExpenseList.tsx`: Changed from modal to inline expansion
- `RepaymentManager.tsx`: Added inline mode support with compact styling
- Removed `Modal` import and usage

### 2. Net Amount Display (Expense - Repayments)

**Visual Breakdown:**
When an expense has repayments, the amount display shows:
```
$20.00 (gray, strikethrough)  ← Original amount
-$10.00 (green)               ← Total repaid
=$10.00 (bold, orange/blue)   ← Net amount
```

**Color Coding:**
- Gray strikethrough: Original expense amount
- Green: Repaid amount
- Orange: Remaining to collect
- Blue: Excess repayment (if overpaid)

**No Repayments:**
- Shows normal single amount: `$20.00`

**Files Changed:**
- `ExpenseList.tsx`: Added repayment totals calculation and amount breakdown display
- `Dashboard.tsx`: Pass repayments prop to ExpenseList

### 3. Repayment Tracking System

**New Fields:**
- `needsRepaymentTracking`: Boolean flag for tracking in dashboard
- `repaymentTrackingCompleted`: Boolean flag for marking as done

**Expense Form:**
- Checkbox: "Track repayment in dashboard (to collect money from friends)"
- Checked expenses appear in dashboard tracking section

**Dashboard Section:**
- Yellow/gold highlighted section at top
- Shows all tracked expenses that aren't completed
- For each expense displays:
  - Title and date
  - Total amount, repaid, remaining
  - Progress bar showing collection percentage
  - ✓ button to mark as completed
- Section auto-hides when empty

**Files Changed:**
- `types/index.ts`: Added tracking fields to Expense type
- `ExpenseForm.tsx`: Added tracking checkbox
- `DashboardSummary.tsx`: Added tracked expenses section
- `Dashboard.tsx`: Added mark complete handler

## User Workflows

### Workflow 1: Quick Expense Repayment

1. View expense list
2. Click 💰 on an expense
3. Repayment section expands inline
4. Add repayment with amount and date
5. See updated net amount immediately
6. Click 💰 again to collapse

### Workflow 2: Track Friend Repayment

1. Create new expense: "Dinner with friends - $60"
2. Check "Track repayment in dashboard"
3. Submit expense
4. Dashboard shows in yellow "Tracked Expenses" section
5. When friend pays back $20:
   - Click 💰 on expense
   - Add repayment for $20
   - Progress bar shows 33% collected
6. Repeat for other friends
7. When fully collected, click ✓ to mark complete
8. Expense disappears from tracking section

### Workflow 3: Overpayment

1. Expense: $50
2. Add repayment: $60
3. Display shows:
   - $50.00 (strikethrough)
   - -$60.00
   - =$10.00 (超額) in blue
4. System auto-creates income record for $10 excess

## UI Components

### ExpenseList
- **Inline Expansion**: `expandedRepaymentId` state tracks which expense is expanded
- **Amount Display**: Conditional rendering based on repayment totals
- **Repayment Section**: Rendered inline with light gray background

### RepaymentManager
- **Inline Mode**: `inline` prop enables compact styling
- **Compact Header**: Smaller title and close button for inline
- **Simplified Info**: Less padding, white background with border

### DashboardSummary
- **Tracked Section**: Yellow background, prominent placement
- **Progress Cards**: White cards with amount grid and progress bar
- **Complete Button**: Green checkmark to mark done

## Technical Details

### State Management

```typescript
// ExpenseList
const [expandedRepaymentId, setExpandedRepaymentId] = useState<string | null>(null);

// Repayment totals calculation
const repaymentTotals = useMemo(() => {
  const totals: { [expenseId: string]: number } = {};
  repayments.forEach((repayment) => {
    if (repayment.expenseId) {
      totals[repayment.expenseId] = (totals[repayment.expenseId] || 0) + repayment.amount;
    }
  });
  return totals;
}, [repayments]);
```

### Inline Display Logic

```typescript
// Toggle inline display
onClick={() => {
  if (expandedRepaymentId === expense.id) {
    setExpandedRepaymentId(null);  // Collapse
  } else {
    setExpandedRepaymentId(expense.id!);  // Expand
  }
}}

// Show green background when expanded
style={{
  ...styles.iconButton,
  ...styles.successChip,
  ...(expandedRepaymentId === expense.id ? 
    { backgroundColor: '#4CAF50', color: 'white' } : {})
}}
```

### Net Amount Calculation

```typescript
const repaid = repaymentTotals[expense.id!] || 0;
const netAmount = expense.amount - repaid;
const hasExcess = netAmount < 0;

if (repaid > 0) {
  return (
    <div style={styles.amountBreakdown}>
      <div style={styles.originalAmount}>${expense.amount.toFixed(2)}</div>
      <div style={styles.repaidAmount}>- ${repaid.toFixed(2)}</div>
      <div style={{...styles.netAmount, color: hasExcess ? '#2196F3' : '#ff9800'}}>
        = ${Math.abs(netAmount).toFixed(2)}
        {hasExcess && <span>({t('excessAmount')})</span>}
      </div>
    </div>
  );
}
```

### Tracked Expenses Filter

```typescript
const trackedExpenses = expenses.filter(exp => 
  exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted
);
```

## Styling

### Inline Repayment Section
```typescript
inlineRepaymentSection: {
  marginTop: '12px',
  padding: '16px',
  backgroundColor: '#f9f9f9',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
}
```

### Amount Breakdown
```typescript
amountBreakdown: {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '2px',
}

originalAmount: {
  fontSize: '14px',
  color: '#999',
  textDecoration: 'line-through',
}

repaidAmount: {
  fontSize: '14px',
  color: '#4CAF50',
  fontWeight: '500',
}

netAmount: {
  fontSize: '18px',
  fontWeight: '700',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}
```

### Tracked Expenses Section
```typescript
trackedExpensesSection: {
  backgroundColor: '#fff9e6',
  border: '2px solid #ffc107',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
}

completeButton: {
  padding: '6px 12px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600',
}
```

## Translations Added

```typescript
// Inline display
repaymentHistory: 'Repayment History' / '還款歷史'

// Net amount
excessAmount: 'Excess Amount' / '多還金額'

// Tracking
trackRepaymentInDashboard: 'Track repayment in dashboard (to collect money from friends)' / '在儀表板追蹤還款（記得向朋友拿錢）'
trackedExpenses: 'Tracked Expenses' / '追蹤中的支出'
markAsCompleted: 'Mark as Completed' / '標記為已完成'
collected: 'Collected' / '已收回'
totalAmount: 'Total Amount' / '總金額'
repaid: 'Repaid' / '已還'
```

## Benefits

### User Experience
1. **Better Context**: See other expenses while managing repayments
2. **Faster Interaction**: No modal animations, instant inline display
3. **Clear Visualization**: Net amount breakdown is easy to understand
4. **Never Forget**: Tracking section reminds you to collect money
5. **Visual Progress**: Progress bars show collection status

### Technical
1. **Less Code**: No modal component needed
2. **Simpler State**: Just track expanded ID instead of modal state
3. **Better Performance**: No overlay rendering
4. **More Maintainable**: Inline is simpler than modal

## Migration Notes

### From Old System
- Old modal-based approach removed
- No breaking changes to data model
- All existing repayments still work
- UI is just different presentation

### Backwards Compatibility
- All existing expenses work unchanged
- Tracking fields are optional (backward compatible)
- Old expenses can add tracking checkbox when editing

## Future Enhancements

Potential improvements:
1. Bulk mark as completed
2. Filter tracked expenses by date range
3. Sort tracked expenses by urgency
4. Notification reminders for tracked expenses
5. Export tracked expenses report
6. Share tracking link with friends

## Testing Checklist

### Inline Display
- [x] Click 💰 expands section
- [x] Click 💰 again collapses
- [x] Button shows green when expanded
- [x] Multiple expenses can't expand simultaneously
- [x] Expanding one collapses others

### Net Amount
- [x] No repayments: Shows single amount
- [x] With repayments: Shows breakdown
- [x] Correct colors for each element
- [x] Excess badge shows when overpaid
- [x] Math is correct

### Tracking
- [x] Checkbox appears in form
- [x] Checked expenses appear in dashboard
- [x] Unchecked expenses don't appear
- [x] Mark complete removes from section
- [x] Progress bar updates with repayments
- [x] Section hides when empty

### Responsive
- [ ] Works on mobile
- [ ] Works on tablet
- [ ] Works on desktop
- [ ] Layout doesn't break

## Deployment

1. Build passes: ✓
2. Lint passes: ✓
3. All features implemented: ✓
4. Translations added: ✓
5. Ready for production: ✓

## Commits

1. `2708c81` - Convert repayment modal to inline display below expenses
2. `106e00c` - Add net amount display showing expense minus repayments
3. `a5d0548` - Add repayment tracking checkbox to expense form
4. `0c506e6` - Add tracked expenses dashboard section with mark complete button
