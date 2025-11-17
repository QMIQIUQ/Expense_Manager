# Repayment Feature Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
├─────────────────────────────────────────────────────────────┤
│  ExpenseList.tsx                                             │
│  ├─ Expense Card                                             │
│  │  ├─ Edit Button                                           │
│  │  ├─ Delete Button                                         │
│  │  └─ 💰 Repayment Button ◄── NEW                          │
│  │     └─ Opens Modal                                        │
│  └─ Modal Component                                          │
│     └─ RepaymentManager                                      │
│        ├─ Expense Summary                                    │
│        ├─ Add Repayment Button                               │
│        ├─ RepaymentForm (when adding/editing)                │
│        └─ RepaymentList                                      │
│           └─ Repayment Cards                                 │
│              ├─ Edit Button                                  │
│              └─ Delete Button                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Business Logic                          │
├─────────────────────────────────────────────────────────────┤
│  RepaymentManager.tsx                                        │
│  ├─ loadRepayments()                                         │
│  ├─ handleAddRepayment()                                     │
│  │  ├─ Create repayment                                      │
│  │  ├─ Check if total > expense                              │
│  │  └─ If yes, create income for excess                      │
│  ├─ handleUpdateRepayment()                                  │
│  │  ├─ Update repayment                                      │
│  │  └─ Recalculate totals                                    │
│  └─ handleDeleteRepayment()                                  │
│     └─ Delete repayment                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       Data Services                          │
├─────────────────────────────────────────────────────────────┤
│  repaymentService.ts                                         │
│  ├─ create(repayment)                                        │
│  ├─ getAll(userId)                                           │
│  ├─ getByExpenseId(userId, expenseId)                        │
│  ├─ update(id, updates)                                      │
│  ├─ delete(id)                                               │
│  └─ getTotalRepaidForExpense(userId, expenseId)             │
│                                                              │
│  incomeService.ts                                            │
│  └─ create(income) ◄── Used for excess repayments           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        Firestore                             │
├─────────────────────────────────────────────────────────────┤
│  Collections:                                                │
│  ├─ expenses/                                                │
│  │  └─ {expenseId}                                           │
│  │     ├─ userId                                             │
│  │     ├─ description                                        │
│  │     ├─ amount (original)                                  │
│  │     └─ ... other fields                                   │
│  │                                                           │
│  ├─ repayments/ ◄── NEW                                      │
│  │  └─ {repaymentId}                                         │
│  │     ├─ userId                                             │
│  │     ├─ expenseId (FK to expenses)                         │
│  │     ├─ amount                                             │
│  │     ├─ date                                               │
│  │     ├─ payerName?                                         │
│  │     ├─ note?                                              │
│  │     ├─ createdAt                                          │
│  │     └─ updatedAt                                          │
│  │                                                           │
│  └─ incomes/                                                 │
│     └─ {incomeId}                                            │
│        ├─ userId                                             │
│        ├─ amount                                             │
│        ├─ type (e.g., 'repayment')                           │
│        ├─ category? ◄── NEW                                  │
│        ├─ linkedExpenseId?                                   │
│        └─ ... other fields                                   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Adding a Repayment

```
User                RepaymentManager        repaymentService       Firestore
  |                       |                        |                  |
  |-- Click 💰 --------->|                        |                  |
  |                       |                        |                  |
  |<-- Show Modal --------|                        |                  |
  |                       |                        |                  |
  |-- Click Add --------->|                        |                  |
  |                       |                        |                  |
  |<-- Show Form ---------|                        |                  |
  |                       |                        |                  |
  |-- Submit Form ------->|                        |                  |
  |                       |                        |                  |
  |                       |-- create() ----------->|                  |
  |                       |                        |                  |
  |                       |                        |-- addDoc() ----->|
  |                       |                        |                  |
  |                       |                        |<-- ID ----------|
  |                       |                        |                  |
  |                       |<-- Success ------------|                  |
  |                       |                        |                  |
  |                       |-- getByExpenseId() --->|                  |
  |                       |                        |                  |
  |                       |                        |-- query() ------>|
  |                       |                        |                  |
  |                       |                        |<-- data ---------|
  |                       |                        |                  |
  |                       |<-- repayments ---------|                  |
  |                       |                        |                  |
  |                       |-- Calculate Total -----|                  |
  |                       |                        |                  |
  |                       |-- If total > expense --|                  |
  |                       |   create income        |                  |
  |                       |                        |                  |
  |<-- Update UI ---------|                        |                  |
  |                       |                        |                  |
  |<-- Show Success ------|                        |                  |
```

### 2. Excess Repayment to Income Conversion

```
Scenario: Expense = $100, Repayment 1 = $60, Repayment 2 = $50

┌──────────────────────────────────────────────────┐
│ Before Repayment 2                                │
├──────────────────────────────────────────────────┤
│ Expense:        $100.00                          │
│ Total Repaid:   $ 60.00                          │
│ Remaining:      $ 40.00                          │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ User Adds Repayment 2: $50                       │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ System Calculation                                │
├──────────────────────────────────────────────────┤
│ Total Repaid:   $60 + $50 = $110                │
│ Expense Amount: $100                             │
│ Excess:         $110 - $100 = $10                │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ Automated Actions                                 │
├──────────────────────────────────────────────────┤
│ 1. Save Repayment 2 ($50) to Firestore          │
│ 2. Create Income:                                │
│    - Amount: $10                                 │
│    - Type: 'repayment'                           │
│    - LinkedExpenseId: expense.id                 │
│    - Title: "Excess repayment for [desc]"       │
│ 3. Show notification to user                     │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ After Repayment 2                                 │
├──────────────────────────────────────────────────┤
│ Expense:        $100.00                          │
│ Total Repaid:   $110.00                          │
│ Excess Amount:  $ 10.00 ✓                        │
│ Status:         Fully Repaid + Excess            │
│                                                   │
│ New Income Record Created:                       │
│ - Amount: $10.00                                 │
│ - Type: Repayment                                │
└──────────────────────────────────────────────────┘
```

## Component Hierarchy

```
ExpenseList
└── expenses.map(expense => (
    ExpenseCard
    ├── Description, Amount, Category
    ├── Edit Button
    ├── Delete Button
    └── 💰 Repayment Button
        └── onClick → setRepaymentModalOpen(true)
))

Modal (isOpen={repaymentModalOpen})
└── RepaymentManager (expense={selectedExpense})
    ├── Header (title + close button)
    ├── Expense Info Summary
    │   ├── Original Amount
    │   ├── Total Repaid
    │   └── Remaining/Excess
    ├── Add Repayment Button
    │   └── onClick → setShowForm(true)
    ├── Conditional: showForm
    │   └── RepaymentForm
    │       ├── Amount Input
    │       ├── Date Input
    │       ├── Payer Name Input
    │       ├── Note Textarea
    │       └── Submit/Cancel Buttons
    └── RepaymentList
        └── repayments.map(repayment => (
            RepaymentCard
            ├── Amount & Date
            ├── Payer Name
            ├── Note
            └── Actions
                ├── Edit Button
                └── Delete Button
        ))
```

## State Management

### RepaymentManager State

```typescript
const [repayments, setRepayments] = useState<Repayment[]>([]);
// Stores all repayments for the expense

const [showForm, setShowForm] = useState(false);
// Controls form visibility

const [editingRepayment, setEditingRepayment] = useState<Repayment | null>(null);
// Stores repayment being edited (null = adding new)

const [loading, setLoading] = useState(true);
// Loading state for initial data fetch

const [saving, setSaving] = useState(false);
// Saving state for create/update operations
```

### Calculated Values

```typescript
const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
// Sum of all repayment amounts

const remainingAmount = expense.amount - totalRepaid;
// Remaining balance (can be negative)

const isFullyRepaid = remainingAmount <= 0;
// Boolean flag for UI display

const hasExcess = remainingAmount < 0;
// Boolean flag for excess amount
```

## Security Rules

```javascript
// Firestore Security Rules for /repayments/{repaymentId}

match /repayments/{repaymentId} {
  // Users can read their own repayments or admins can read all
  allow read: if isAuthenticated() && 
                 (isOwner(resource.data.userId) || isAdmin());
  
  // Users can create repayments for their own expenses
  allow create: if isAuthenticated() && 
                   isOwner(request.resource.data.userId) &&
                   request.resource.data.amount is number &&
                   request.resource.data.amount > 0 &&
                   request.resource.data.expenseId is string;
  
  // Users can update their own repayments
  allow update: if isAuthenticated() && 
                   (isOwner(resource.data.userId) || isAdmin()) &&
                   request.resource.data.amount is number &&
                   request.resource.data.amount > 0;
  
  // Users can delete their own repayments
  allow delete: if isAuthenticated() && 
                   (isOwner(resource.data.userId) || isAdmin());
}
```

## Error Handling

### Form Validation

```typescript
// RepaymentForm validation
const errors = {};

if (!amount || amount <= 0) {
  errors.amount = "Please enter a valid amount";
}

if (!date) {
  errors.date = "Please select a date";
}

if (maxAmount && amount > maxAmount) {
  errors.amount = `Amount cannot exceed ${maxAmount}`;
}

// Display errors under fields
// Prevent submission if errors exist
```

### Service Error Handling

```typescript
try {
  await repaymentService.create(data);
  alert(t('repaymentAdded'));
} catch (error) {
  console.error('Failed to add repayment:', error);
  alert(t('errorSavingData'));
}
```

## Performance Considerations

### Optimizations
1. **Lazy Loading**: Repayments loaded only when modal opens
2. **Local Calculations**: Total/remaining calculated in React, not Firestore
3. **Optimistic Updates**: UI updates immediately, syncs to Firestore async
4. **Indexed Queries**: Firestore queries use userId + expenseId indexes

### Query Efficiency
```typescript
// Efficient: Uses compound index on userId + expenseId
const q = query(
  collection(db, 'repayments'),
  where('userId', '==', userId),
  where('expenseId', '==', expenseId),
  orderBy('date', 'desc')
);

// Result: Fast query even with thousands of repayments
```

## Future Scalability

### Potential Enhancements

1. **Batch Operations**
   - Add multiple repayments at once
   - Import repayments from CSV

2. **Analytics**
   - Track repayment velocity
   - Predict full repayment date
   - Generate repayment reports

3. **Notifications**
   - Remind about pending repayments
   - Alert when fully repaid
   - Email receipts for repayments

4. **Integration**
   - Link to payment processors
   - Auto-create from bank transactions
   - Export to accounting software

5. **Advanced Features**
   - Recurring repayment schedules
   - Split repayments across multiple payers
   - Interest calculation on overdue repayments

## Migration Strategy

### From Old to New System

**Old System**:
- Income record with `linkedExpenseId`
- Single income entry per expense
- No detailed repayment history

**New System**:
- Multiple repayment records
- Detailed history with dates/payers
- Automatic excess handling

**Migration Path**:
1. Keep old `linkedExpenseId` for compatibility
2. New repayments use separate collection
3. Both systems work independently
4. Optional: Create migration script to convert old links to repayments

**Backwards Compatibility**:
- Existing income records continue to work
- No breaking changes to Income type
- `linkedExpenseId` marked as deprecated in comments
- Users can continue using either approach

## Testing Checklist

### Unit Tests (Future)
- [ ] RepaymentForm validation
- [ ] RepaymentManager calculations
- [ ] Service CRUD operations
- [ ] Excess conversion logic

### Integration Tests (Future)
- [ ] Create repayment flow
- [ ] Update repayment flow
- [ ] Delete repayment flow
- [ ] Excess to income conversion
- [ ] Security rules enforcement

### Manual Tests (Current)
- [ ] Add single repayment
- [ ] Add multiple repayments
- [ ] Edit repayment
- [ ] Delete repayment
- [ ] Exceed expense amount
- [ ] Verify income created for excess
- [ ] Test in all languages
- [ ] Test on mobile
- [ ] Test with slow network
- [ ] Test with Firestore errors

## Deployment Steps

1. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Deploy Code**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

3. **Verify Deployment**
   - Test repayment creation
   - Test security rules
   - Check translations
   - Monitor errors

4. **User Communication**
   - Announce new feature
   - Share user guide
   - Collect feedback
   - Monitor usage

## Maintenance

### Monitoring
- Track Firestore read/write operations
- Monitor error rates
- Check performance metrics
- Review user feedback

### Updates
- Fix bugs as reported
- Add requested features
- Optimize performance
- Update documentation

### Support
- Answer user questions
- Troubleshoot issues
- Provide migration assistance
- Update guides as needed
