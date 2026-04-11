# Offline/Online Sync Fix - Expense Date Editing Issue

## Problem Description

When editing an expense date, the following behavior was observed:
1. Create an expense
2. Edit the date field
3. Save the changes
4. The UI updates correctly showing the new date
5. **BUG**: After 1 second, the date reverts to the original creation date
6. Only after refreshing the entire page does the edited date appear correctly

## Root Cause Analysis

The issue was caused by improper cache management during CRUD operations:

1. **Optimistic Update**: When a user edits an expense, the UI state is updated immediately (optimistic update)
2. **Firebase Operation**: The change is sent to Firebase/Firestore
3. **Success Callback**: On success, `loadData()` was called to refresh all data
4. **Cache Conflict**: `loadData()` fetched data from sessionStorage cache, which had stale/old data
5. **State Override**: The stale cached data overwrote the optimistic update, reverting the UI

### Why Cache Had Stale Data

The cache was not being updated during the optimistic update phase, only the React state was updated. When `loadData()` was called after the Firebase operation succeeded, it read from the outdated cache and restored the old values.

## Solution Implemented

### Key Changes

1. **Update Cache Optimistically**: Along with updating React state, we now also update the sessionStorage cache immediately
2. **Remove Unnecessary loadData()**: Instead of reloading all data after each operation, we keep the optimistic updates
3. **Proper ID Management**: For create operations, we replace temporary IDs with real Firebase IDs without reloading everything
4. **Rollback on Error**: If an operation fails, both the state and cache are rolled back to the original values

### Code Pattern Applied

```typescript
// BEFORE (problematic):
const handleInlineUpdateExpense = async (id: string, updates: Partial<Expense>) => {
  setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  await optimisticCRUD.run(
    { type: 'update', data: updates },
    () => expenseService.update(id, updates),
    {
      onSuccess: () => {
        loadData(); // ❌ This reloads from stale cache!
      }
    }
  );
};

// AFTER (fixed):
const handleInlineUpdateExpense = async (id: string, updates: Partial<Expense>) => {
  // Update state optimistically
  setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  
  // ✅ Update cache optimistically
  if (currentUser) {
    dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => 
      data.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }

  await optimisticCRUD.run(
    { type: 'update', data: updates },
    () => expenseService.update(id, updates),
    {
      onSuccess: () => {
        // ✅ Cache already updated, no need to reload
      },
      onError: () => {
        // ✅ Rollback both state and cache
        setExpenses((prev) => prev.map((e) => (e.id === id ? originalExpense : e)));
        if (currentUser) {
          dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => 
            data.map((e) => (e.id === id ? originalExpense : e))
          );
        }
      }
    }
  );
};
```

## Files Modified

- `web/src/pages/Dashboard.tsx`:
  - Fixed `handleAddExpense`
  - Fixed `handleInlineUpdateExpense`
  - Fixed `handleDeleteExpense`
  - Fixed `handleAddCategory`
  - Fixed `handleUpdateCategory`
  - Fixed `handleDeleteCategory`
  - Fixed `handleAddBudget`
  - Fixed `handleUpdateBudget`
  - Fixed `handleDeleteBudget`

## Entities Fixed

✅ **Expenses** - The primary issue reported
✅ **Categories** - Applied same fix for consistency
✅ **Budgets** - Applied same fix for consistency

## Entities Not Yet Fixed

The following entities still use the old pattern with `loadData()` calls and may exhibit similar issues:
- Recurring Expenses
- Incomes
- Cards
- Banks
- E-Wallets
- Repayments

These can be fixed using the same pattern if similar issues are reported.

## Manual Testing Instructions

### Test Scenario 1: Edit Expense Date
1. Log into the application
2. Create a new expense with today's date
3. Click edit on the expense
4. Change the date to a different date
5. Save the changes
6. **Expected**: The date should update and stay updated (not revert after 1 second)
7. Refresh the page
8. **Expected**: The date should still show the edited value

### Test Scenario 2: Edit Expense Amount
1. Create an expense with amount $100
2. Edit the expense and change amount to $200
3. Save
4. **Expected**: Amount should show $200 and not revert
5. Refresh page
6. **Expected**: Amount should still be $200

### Test Scenario 3: Offline Editing
1. Create an expense while online
2. Go offline (disable network in browser dev tools)
3. Edit the expense date
4. Save (should be queued for sync)
5. Go back online
6. **Expected**: The edit should sync and the date should update correctly
7. **Expected**: No reversion should occur after sync completes

### Test Scenario 4: Category Updates
1. Create a category
2. Edit the category name or icon
3. Save
4. **Expected**: Changes should persist without reverting

### Test Scenario 5: Budget Updates
1. Create a budget
2. Edit the budget amount or period
3. Save
4. **Expected**: Changes should persist without reverting

## Technical Benefits

1. **Improved UX**: No more jarring reverts after successful operations
2. **Better Performance**: Fewer unnecessary data fetches from Firebase
3. **Cleaner Code**: More predictable state management
4. **Offline Support**: Optimistic updates work better with offline queue
5. **Consistency**: Same pattern applied across multiple entity types

## Potential Edge Cases

1. **Rapid Edits**: If a user makes multiple rapid edits, each edit updates the cache correctly
2. **Concurrent Edits**: If the same data is edited in multiple tabs, cache is per-session so each tab maintains its own state
3. **Network Failures**: On failure, both state and cache are rolled back together
4. **Offline Queue**: Queued operations still work as the cache is updated when operations are queued

## Future Improvements

1. **Refactor to Shared Utility**: Create a helper function to reduce code duplication across handlers
2. **Apply to Remaining Entities**: Fix income, recurring expenses, cards, banks, e-wallets, and repayments
3. **Real-time Sync**: Consider adding Firebase realtime listeners for cross-tab synchronization
4. **Cache TTL**: Implement cache expiration for long-running sessions
5. **Unit Tests**: Add tests for cache update logic once test infrastructure is added

## Related Documentation

- `web/OFFLINE_SYNC_ARCHITECTURE.md` - Overall offline sync design
- `web/OFFLINE_FUNCTIONALITY.md` - Offline feature specifications
- `web/OFFLINE_TESTING_GUIDE.md` - Testing offline features
- `web/UX_OPTIMISTIC_CRUD.md` - Optimistic CRUD patterns
