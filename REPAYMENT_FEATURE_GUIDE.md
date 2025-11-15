# Repayment Tracking Feature Guide

## Overview

This document describes the new repayment tracking feature that allows users to track multiple repayments against expenses and automatically handles excess repayments by converting them to income.

## Features

### 1. Expense Repayment Tracking
- **Multiple Repayments**: Track multiple repayment transactions for a single expense
- **Remaining Balance**: Automatically calculates and displays remaining amount
- **Fully Repaid Status**: Visual indicator when expense is fully repaid
- **Excess Repayment Handling**: Automatically creates income record when repayments exceed expense amount

### 2. Income Categories
- **Default Income**: Regular income entries
- **E-Wallet Reload**: Special category for credit card to e-wallet transfers
- **Other**: Miscellaneous income category

### 3. User Interface
- **Repayment Button (💰)**: Added to each expense in the expense list
- **Repayment Modal**: Full-featured modal for managing repayments
- **Repayment Form**: Add/edit individual repayment entries
- **Repayment List**: View all repayments with edit/delete options
- **Summary View**: Shows original expense, total repaid, and remaining amount

## How to Use

### Adding a Repayment

1. Navigate to the Expenses tab
2. Find the expense you want to add a repayment for
3. Click the repayment button (💰) next to the expense
4. In the repayment modal, click "Add Repayment"
5. Fill in the repayment details:
   - **Amount**: How much was repaid
   - **Date**: When the repayment occurred
   - **Payer Name** (optional): Who made the repayment
   - **Note** (optional): Any additional details
6. Click "Add" to save

### Viewing Repayments

1. Click the repayment button (💰) on any expense
2. The modal shows:
   - Original expense amount
   - Total repaid amount
   - Remaining balance (or excess if overpaid)
   - Complete list of all repayments
   - Status indicator if fully repaid

### Editing/Deleting Repayments

1. Open the repayment modal for the expense
2. Click the edit (✏️) or delete (🗑️) button on any repayment
3. Make your changes and save, or confirm deletion

### Excess Repayments

When the total repayment amount exceeds the original expense amount:
- The excess amount is automatically recorded as income
- The income is created with type "repayment"
- The income is linked to the original expense
- A notification confirms the excess was converted to income

### Income Categories

When adding or editing income:
1. Navigate to the Incomes tab
2. Add or edit an income entry
3. Select an Income Category:
   - **Default Income**: Regular income (salary, bonuses, etc.)
   - **E-Wallet Reload**: For credit card to e-wallet transfers
   - **Other**: Other types of income

The E-Wallet Reload category is useful for tracking when you reload an e-wallet using a credit card, as it's technically a transfer rather than true income or expense.

## Data Model

### Repayment Type
```typescript
interface Repayment {
  id?: string;
  userId: string;
  expenseId: string; // Links to the expense being repaid
  amount: number; // Amount repaid (positive number)
  date: string; // Date of repayment (YYYY-MM-DD)
  payerName?: string; // Optional: who made the repayment
  note?: string; // Optional: additional notes
  createdAt: Date;
  updatedAt: Date;
}
```

### Income Category
```typescript
type IncomeCategory = 'default' | 'ewallet_reload' | 'other';

interface Income {
  // ... existing fields ...
  category?: IncomeCategory; // New optional category field
}
```

## Security

Firestore security rules have been updated to protect the repayments collection:
- Users can only read their own repayments
- Users can only create repayments for their own expenses
- Amount must be positive
- Repayment must be linked to a valid expense
- Only the owner or admin can update/delete repayments

## Translation Support

The feature includes full translation support for:
- English (en)
- Traditional Chinese (zh)
- Simplified Chinese (zh-CN)

All UI labels, messages, and descriptions are available in all supported languages.

## Technical Implementation

### Components
- **RepaymentForm**: Form for adding/editing repayments
- **RepaymentList**: Displays list of repayments with actions
- **RepaymentManager**: Main container managing form, list, and logic
- **Modal**: Generic modal component for displaying the manager

### Services
- **repaymentService**: CRUD operations for repayments
  - `create()`: Create new repayment
  - `getAll()`: Get all repayments for a user
  - `getByExpenseId()`: Get repayments for specific expense
  - `update()`: Update existing repayment
  - `delete()`: Delete repayment
  - `getTotalRepaidForExpense()`: Calculate total repaid amount

### Key Features
- Automatic excess repayment to income conversion
- Real-time calculation of remaining balance
- Form validation with error messages
- Optimistic UI updates
- Proper cleanup of optional fields before Firestore storage

## Use Cases

### 1. Shared Expense Tracking
**Scenario**: You paid for dinner with friends, and they're paying you back over time.
- Create the expense for the full amount
- As friends pay you back, add repayments with their names
- Track who still owes money and how much

### 2. Reimbursement Tracking
**Scenario**: You paid for a business expense and expect reimbursement from your company.
- Create the expense
- When reimbursed, add a repayment entry
- If over-reimbursed, the excess becomes tracked income

### 3. Partial Payments
**Scenario**: You made a large purchase and are paying it off in installments.
- Create the expense for the full amount
- Add repayment entries as you make payments
- Track your remaining balance

### 4. E-Wallet Reloads
**Scenario**: You reload an e-wallet using a credit card.
- Create an income entry for the reload amount
- Set category to "E-Wallet Reload"
- This helps distinguish it from actual income

## Migration Notes

### Deprecated Feature
The old system allowed linking income directly to expenses through `linkedExpenseId`. While this field still exists for backwards compatibility, the new repayment system is the recommended approach because:
- Supports multiple repayments per expense
- Better tracking of remaining balance
- Clearer separation of income vs. repayment
- Automatic handling of excess repayments

### Existing Data
- Existing income records with `linkedExpenseId` continue to work
- No data migration is required
- New repayments and old income links work independently

## Future Enhancements

Potential improvements for future versions:
- Bulk repayment entry
- Repayment reminders/notifications
- Export repayment history
- Analytics on repayment patterns
- Integration with payment processors
- Recurring repayment schedules

## Troubleshooting

### Repayment Button Not Visible
- Ensure you're viewing the Expenses tab
- Check that the expense has been successfully created
- Verify you're logged in with the correct user account

### Cannot Add Repayment
- Check that the expense ID exists
- Verify you have proper permissions
- Ensure amount is positive
- Check Firestore security rules are deployed

### Excess Not Converting to Income
- Verify the total repayments exceed the expense amount
- Check browser console for errors
- Ensure incomeService has proper permissions

## Support

For issues or questions about the repayment feature:
1. Check this guide for common scenarios
2. Review the translations file for available text keys
3. Check Firestore rules if experiencing permission errors
4. Review component code for implementation details
