# Migration to New Repayment System

## Overview

This document explains the changes made to migrate from the old income-based repayment tracking to the new dedicated Repayment system.

## Changes Made

### 1. ExpenseForm Component

**File:** `web/src/components/expenses/ExpenseForm.tsx`

**Removed Fields:**
- `originalReceiptAmount` - Original receipt amount for tracking reimbursements
- `payerName` - Who paid for the expense
- `isReimbursable` - Checkbox to enable reimbursable expense tracking

**Reason for Removal:**
These fields are now deprecated. The new Repayment system provides a dedicated way to track multiple repayment entries per expense through the 💰 button interface.

**Before:**
```typescript
// Old fields in form state
originalReceiptAmount: initialData?.originalReceiptAmount || undefined,
payerName: initialData?.payerName || '',

// Old UI section
<div className="border-t pt-4">
  <input type="checkbox" id="isReimbursable" ... />
  <label>這是可報銷支出 (例如：為他人代付)</label>
  
  {isReimbursable && (
    <div>
      <input name="originalReceiptAmount" ... />
      <input name="payerName" ... />
    </div>
  )}
</div>
```

**After:**
```typescript
// Simplified form - removed reimbursable fields
// Users now use the 💰 repayment button in ExpenseList
```

### 2. DashboardSummary Component

**File:** `web/src/components/dashboard/DashboardSummary.tsx`

**Updated Logic:**

**Old Approach (Income-based):**
```typescript
// Calculate unrecovered amounts from Income.linkedExpenseId
const incomesByExpense: { [expenseId: string]: number } = {};
incomes.forEach((inc) => {
  if (inc.linkedExpenseId) {
    incomesByExpense[inc.linkedExpenseId] = 
      (incomesByExpense[inc.linkedExpenseId] || 0) + inc.amount;
  }
});

const unrecoveredExpenses = expenses
  .filter((exp) => exp.originalReceiptAmount || incomesByExpense[exp.id || ''])
  .map((exp) => {
    const targetAmount = exp.originalReceiptAmount || exp.amount;
    const recovered = incomesByExpense[exp.id || ''] || 0;
    const unrecovered = Math.max(0, targetAmount - recovered);
    return { expense: exp, recovered, unrecovered, targetAmount };
  })
  .filter((item) => item.unrecovered > 0)
  .sort((a, b) => b.unrecovered - a.unrecovered);
```

**New Approach (Repayment-based):**
```typescript
// Calculate unrecovered amounts from Repayment collection
const repaymentsByExpense: { [expenseId: string]: number } = {};
repayments.forEach((rep) => {
  if (rep.expenseId) {
    repaymentsByExpense[rep.expenseId] = 
      (repaymentsByExpense[rep.expenseId] || 0) + rep.amount;
  }
});

const unrecoveredExpenses = expenses
  .filter((exp) => repaymentsByExpense[exp.id || ''])
  .map((exp) => {
    const targetAmount = exp.amount; // Use actual expense amount
    const recovered = repaymentsByExpense[exp.id || ''] || 0;
    const unrecovered = Math.max(0, targetAmount - recovered);
    return { expense: exp, recovered, unrecovered, targetAmount };
  })
  .filter((item) => item.unrecovered > 0)
  .sort((a, b) => b.unrecovered - a.unrecovered);
```

**Key Differences:**
1. Uses `repayments` array instead of `incomes` array
2. Looks for `rep.expenseId` instead of `inc.linkedExpenseId`
3. Uses `expense.amount` as target (not `originalReceiptAmount`)
4. Only shows expenses that have at least one repayment entry

### 3. Dashboard Component

**File:** `web/src/pages/Dashboard.tsx`

**Added:**
- Import `Repayment` type
- Import `repaymentService`
- Add `repayments` state: `const [repayments, setRepayments] = useState<Repayment[]>([]);`
- Load repayments in data loading:
  ```typescript
  const [expensesData, incomesData, categoriesData, budgetsData, recurringData, repaymentsData] = 
    await Promise.all([
      expenseService.getAll(currentUser.uid),
      incomeService.getAll(currentUser.uid),
      categoryService.getAll(currentUser.uid),
      budgetService.getAll(currentUser.uid),
      recurringExpenseService.getAll(currentUser.uid),
      repaymentService.getAll(currentUser.uid), // NEW
    ]);
  ```
- Pass repayments to DashboardSummary:
  ```typescript
  <DashboardSummary 
    expenses={expenses} 
    incomes={incomes} 
    repayments={repayments} // NEW
  />
  ```

## Behavior Changes

### Before Migration

**ExpenseForm:**
- Had optional "reimbursable expense" checkbox
- Could set original receipt amount
- Could specify who paid

**Dashboard "Unrecovered Expenses":**
- Showed expenses with `originalReceiptAmount` set OR with linked income
- Used `originalReceiptAmount` as target if available, otherwise `expense.amount`
- Calculated recovery from Income records with `linkedExpenseId`

### After Migration

**ExpenseForm:**
- Clean, simplified form
- No reimbursable fields
- Users track repayments via 💰 button

**Dashboard "Unrecovered Expenses":**
- Shows only expenses that have repayment entries
- Always uses `expense.amount` as target
- Calculates recovery from Repayment collection
- More accurate tracking with detailed repayment history

## User Experience Impact

### Existing Data

**Old expenses with originalReceiptAmount/payerName:**
- These fields remain in Firestore but are no longer editable
- Will NOT appear in "Unrecovered Expenses" unless repayments are added
- Users should add repayment entries via 💰 button to track these

**Old income records with linkedExpenseId:**
- Still exist but no longer affect dashboard calculations
- Can be kept for historical records
- New repayment system is recommended going forward

### New Workflow

1. **Create Expense:** Simple form, no reimbursable fields
2. **Track Repayment:** Click 💰 button on expense
3. **Add Repayment Entry:** Fill amount, date, payer, notes
4. **View Progress:** Dashboard shows remaining amount automatically

### Migration Steps for Users

If users have existing expenses with the old system:

1. **Identify old reimbursable expenses** - Look for expenses with originalReceiptAmount
2. **Click 💰 button** on each expense
3. **Add repayment entries** - Create repayment records for amounts already received
4. **Monitor dashboard** - "Unrecovered Expenses" will now show accurate data

## Technical Benefits

1. **Cleaner Data Model:** Dedicated Repayment type instead of overloading Income
2. **Multiple Repayments:** Can track many repayments per expense with full details
3. **Better UX:** Clear 💰 button interface vs. hidden checkbox section
4. **Accurate Tracking:** Separate collection prevents income/repayment confusion
5. **Excess Handling:** Automatic conversion of overpayments to income

## Backwards Compatibility

**Existing Data:**
- Old fields (`originalReceiptAmount`, `payerName`) remain in Expense type for backwards compatibility
- Old Income records with `linkedExpenseId` still work
- No data loss or breaking changes

**Gradual Migration:**
- Users can continue to view old data
- New repayments use dedicated system
- Both systems coexist without conflict

## Testing Recommendations

1. **Test Expense Form:**
   - Verify reimbursable section is removed
   - Ensure form submits successfully
   - Check no console errors

2. **Test Dashboard:**
   - Add expense
   - Add repayment via 💰 button
   - Verify appears in "Unrecovered Expenses"
   - Check calculation is correct

3. **Test Existing Data:**
   - Old expenses still display correctly
   - Old income records don't break anything
   - Can add new repayments to old expenses

## Future Enhancements

Potential improvements:
- Data migration tool to convert old income links to repayments
- Warning message for expenses with old `originalReceiptAmount` field
- Bulk repayment import feature
- Analytics on repayment patterns

## Questions & Answers

**Q: What happens to my old reimbursable expenses?**
A: They remain in the system but won't show in "Unrecovered Expenses" until you add repayment entries via 💰 button.

**Q: Can I still see old income records linked to expenses?**
A: Yes, they're still there. They just don't affect the dashboard calculations anymore.

**Q: Do I need to delete old data?**
A: No, keep it for historical records. Just use the new system going forward.

**Q: What if I already have income records for an expense?**
A: Create matching repayment entries. You can keep the old income records or delete them - they won't affect the new calculations.

**Q: How do I track who paid me back?**
A: Use the "Payer Name" field when adding a repayment via 💰 button.

## Commit History

- **Initial Implementation:** bd2023b - Add repayment tracking feature with UI components
- **Security Rules:** 5d52f96 - Add Firestore security rules for repayments collection
- **Migration:** 13b46fd - Update expense form and dashboard to use new repayment logic

## Related Documentation

- `REPAYMENT_FEATURE_GUIDE.md` - User guide for repayment feature
- `REPAYMENT_ARCHITECTURE.md` - Technical architecture details
- `REPAYMENT_QUICK_REFERENCE.md` - Quick reference for common tasks
