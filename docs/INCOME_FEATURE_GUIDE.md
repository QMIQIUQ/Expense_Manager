# Income Feature Implementation Guide

## Overview

This document describes the newly implemented income tracking feature that allows users to:
- Track income (salary, reimbursements, repayments, etc.)
- Link income records to expenses for tracking reimbursements
- View recovery status for expenses with outstanding amounts
- See monthly cashflow (income vs expenses)

## Data Model

### Income Type
```typescript
interface Income {
  id?: string;
  userId: string;
  title?: string; // Optional title/source description
  amount: number; // Positive number
  date: string;
  type: IncomeType; // 'salary' | 'reimbursement' | 'repayment' | 'other'
  payerName?: string; // For repayments from friends
  linkedExpenseId?: string; // FK to expenses.id
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Expense Updates
New optional fields added to Expense:
```typescript
interface Expense {
  // ... existing fields
  originalReceiptAmount?: number; // Original receipt/invoice amount
  payerName?: string; // Who paid (e.g., "Me", "Friend A")
}
```

## Database Schema (Firebase Firestore)

### Collections
- **expenses**: Existing collection with two new optional fields
- **incomes**: New collection with the structure described above

### Relationships
- **One-to-Many**: One Expense can have multiple Incomes linked to it
- **Optional Link**: Income can exist without being linked to an expense
- **FK Reference**: `linkedExpenseId` in Income document references `id` in Expense document

### Migration Strategy
No explicit migration is required because:
1. Firestore is schemaless
2. New fields are optional/nullable
3. Existing data continues to work without these fields
4. Application code handles missing fields gracefully

## Features

### 1. Income Management
- **Location**: Dashboard → Incomes tab
- **Operations**: Create, Read, Update, Delete incomes
- **Types**: Salary, Reimbursement, Repayment, Other
- **Linking**: Can optionally link income to an expense

### 2. Reimbursable Expenses
- **Location**: Dashboard → Expenses tab → Add/Edit Expense
- **Checkbox**: "This is a reimbursable expense"
- **Fields when checked**:
  - Receipt Amount: Original amount on receipt/invoice
  - Paid By: Who initially paid for this expense
- **Use Case**: When you pay for someone else and expect to be reimbursed

### 3. Dashboard Summary
- **4 Summary Cards**:
  - Monthly Expense
  - Monthly Income (green text)
  - Net Cashflow (color-coded: green if positive, red if negative)
  - Unrecovered Amount (orange text)
- **Top Unrecovered Expenses**: Shows top 5 expenses with outstanding amounts
  - Progress bar shows percentage recovered
  - Amount shown is what's still outstanding

### 4. Calculation Logic

#### Recovered Amount
```
recovered = SUM(incomes.amount WHERE incomes.linkedExpenseId = expense.id)
```

#### Unrecovered Amount
```
targetAmount = expense.originalReceiptAmount || expense.amount
unrecovered = MAX(0, targetAmount - recovered)
```

#### Net Cashflow
```
monthlyIncome = SUM(incomes.amount WHERE date in current month)
monthlyExpense = SUM(expenses.amount WHERE date in current month)
netCashflow = monthlyIncome - monthlyExpense
```

## Usage Examples

### Example 1: Friend Repayment
**Scenario**: You paid $50 for lunch with a friend. Friend owes you $25.

**Steps**:
1. Create Expense:
   - Description: "Lunch with John"
   - Amount: $50
   - Check "This is a reimbursable expense"
   - Receipt Amount: $50
   - Paid By: "Me"

2. When friend pays back:
   - Go to Incomes tab
   - Click Add Income
   - Amount: $25
   - Type: Repayment
   - Payer Name: "John"
   - Link to Expense: Select "Lunch with John"

3. Dashboard will show:
   - Unrecovered amount decreases by $25
   - Top Unrecovered Expenses shows "Lunch with John" at 50% recovered

### Example 2: Company Reimbursement
**Scenario**: You bought office supplies for $100, company will reimburse you.

**Steps**:
1. Create Expense:
   - Description: "Office Supplies"
   - Amount: $100
   - Check "This is a reimbursable expense"
   - Receipt Amount: $100
   - Paid By: "Me"

2. When company reimburses:
   - Go to Incomes tab
   - Amount: $100
   - Type: Reimbursement
   - Link to Expense: "Office Supplies"

3. Dashboard shows 100% recovered for this expense

### Example 3: Salary Income
**Scenario**: Track monthly salary.

**Steps**:
1. Go to Incomes tab
2. Add Income:
   - Title: "Monthly Salary"
   - Amount: $5000
   - Type: Salary
   - Leave expense link empty
3. Dashboard shows monthly income and net cashflow

## Local Testing

### Setup
1. Ensure Firebase configuration is set up in `.env`
2. Run development server: `npm run dev`
3. Create test user account

### Test Scenarios

#### Test 1: Basic Income CRUD
1. Navigate to Incomes tab
2. Add income with all fields
3. Verify it appears in list
4. Edit the income
5. Delete the income
6. Verify dashboard updates accordingly

#### Test 2: Expense-Income Linking
1. Create expense with "reimbursable" checkbox checked
2. Fill in receipt amount
3. Navigate to Incomes tab
4. Create income linked to that expense
5. Verify dashboard shows reduced unrecovered amount
6. Add another partial repayment
7. Verify dashboard shows cumulative recovery

#### Test 3: Dashboard Calculations
1. Add several expenses in current month
2. Add several incomes in current month
3. Verify:
   - Monthly Expense = sum of all expenses
   - Monthly Income = sum of all incomes
   - Net Cashflow = income - expense
   - Correct color coding

#### Test 4: Unrecovered Tracking
1. Create expense with receipt amount $100
2. Add income of $30 linked to it
3. Add another income of $40 linked to it
4. Verify unrecovered shows $30
5. Verify progress bar shows 70% recovered

### Seed Data Commands
Use the Firebase console or create a script to add test data:

```javascript
// Example expense (reimbursable)
{
  userId: "your-user-id",
  description: "Team Dinner",
  amount: 120,
  originalReceiptAmount: 120,
  payerName: "Me",
  category: "Food & Dining",
  date: "2024-11-10",
  createdAt: new Date(),
  updatedAt: new Date()
}

// Example income (partial repayment)
{
  userId: "your-user-id",
  title: "Sarah's share",
  amount: 40,
  type: "repayment",
  payerName: "Sarah",
  linkedExpenseId: "expense-id-from-above",
  date: "2024-11-11",
  createdAt: new Date(),
  updatedAt: new Date()
}
```

## Technical Implementation Notes

### Services
- **incomeService.ts**: CRUD operations for incomes
  - `create()`, `update()`, `delete()`
  - `getAll()`: Get all incomes for user
  - `getByDateRange()`: Filter by date
  - `getByExpenseId()`: Get incomes linked to an expense

### Components
- **IncomeForm**: Form for creating/editing income
- **IncomeList**: Display list of incomes
- **IncomesTab**: Main income management page
- **ExpenseForm**: Updated with reimbursable fields
- **DashboardSummary**: Updated with income/cashflow metrics

### State Management
- Income state managed in Dashboard.tsx
- Optimistic updates using `useOptimisticCRUD` hook
- Offline queue support for income operations

### Offline Support
- Income operations are queued when offline
- Automatically retry when connection restored
- Same mechanism as expenses/categories/budgets

## Future Enhancements

Potential improvements for future development:

1. **Partial Refund Reconciliation**: Auto-suggest matching incomes to expenses
2. **Export Unrecovered Report**: CSV export of outstanding amounts
3. **Notifications**: Remind about expenses with outstanding amounts
4. **Receipt Photos**: Attach photos to reimbursable expenses
5. **Multi-currency**: Support different currencies for incomes/expenses
6. **Recurring Income**: Similar to recurring expenses
7. **Income Categories**: Categorize income sources
8. **Advanced Filtering**: Filter incomes by type, date range, linked status

## Troubleshooting

### Issue: Incomes not showing
- Check Firebase rules allow read access to incomes collection
- Verify user is authenticated
- Check browser console for errors

### Issue: Dashboard not updating
- Refresh the page
- Check that income dates are in the correct format (YYYY-MM-DD)
- Verify amounts are positive numbers

### Issue: Linking not working
- Ensure expense exists before creating linked income
- Verify expense ID is correct
- Check that both records have same userId

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Firebase configuration
3. Check Firestore rules allow access
4. Review this documentation

## License

Same as main project license.
