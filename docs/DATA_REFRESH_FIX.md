# Data Refresh Race Condition Fix

## Issue Summary
Fixed a critical data refresh race condition affecting Cards, Banks, E-Wallets, Incomes, and Recurring Expenses. When users added or updated these entities, the UI would briefly show the new data, then immediately revert to stale cached data.

### Original Problem (Chinese)
> 信用卡新增回饋明顯的時候，資料刷新異常。就好像離綫的已經出現了新增的東西，然後被之後同步的ui蓋掉了，然後就不知道有沒有新增成功。

**Translation**: "When adding credit card rewards, data refresh is abnormal. It's like the offline data already shows the new item, then it gets overwritten by the subsequent UI sync, making it unclear whether the addition was successful."

## Root Cause
The race condition occurred due to improper cache management during CRUD operations:

1. **Optimistic Update**: User action triggers immediate UI state update
2. **API Call**: Change is sent to Firebase/Firestore
3. **Success Callback**: On success, `loadData()` is called to "refresh" data
4. **Cache Conflict**: `loadData()` fetches from sessionStorage cache which contains stale data
5. **State Override**: Stale cached data overwrites the optimistic update, reverting the UI

### Why Cache Had Stale Data
The cache was not being updated during the optimistic update phase. Only the React state was updated. When `loadData()` was called after the Firebase operation succeeded, it read from the outdated cache and restored the old values.

## Solution Implemented
Applied the same pattern already used for Expenses, Categories, and Budgets (documented in `OFFLINE_SYNC_FIX.md`):

### Pattern
```typescript
const handleAddEntity = async (data) => {
  if (!currentUser) return;
  
  // 1. Optimistic update - React state
  const tempId = `temp-${Date.now()}`;
  const optimisticEntity = { ...data, id: tempId, ...metadata };
  setEntities((prev) => [optimisticEntity, ...prev]);
  
  // 2. Optimistic update - Cache
  dataService.updateCache('entities', currentUser.uid, (cache) => 
    [optimisticEntity, ...cache]
  );

  await optimisticCRUD.run(
    { type: 'create', data },
    () => entityService.create({ ...data, userId: currentUser.uid }),
    {
      entityType: 'entity',
      retryToQueueOnFail: true,
      onSuccess: (result) => {
        // 3. Replace temp ID with real ID
        const newId = result as string;
        const realEntity = { ...optimisticEntity, id: newId };
        setEntities((prev) => prev.map((e) => (e.id === tempId ? realEntity : e)));
        dataService.updateCache('entities', currentUser.uid, (cache) => 
          cache.map((e) => (e.id === tempId ? realEntity : e))
        );
        // NO loadData() call here!
      },
      onError: () => {
        // 4. Rollback both state and cache
        setEntities((prev) => prev.filter((e) => e.id !== tempId));
        dataService.updateCache('entities', currentUser.uid, (cache) => 
          cache.filter((e) => e.id !== tempId)
        );
      },
    }
  );
};
```

### Key Changes
1. ✅ Update React state optimistically
2. ✅ Update cache optimistically using `dataService.updateCache()`
3. ✅ Remove `loadData()` calls from success callbacks
4. ✅ Add rollback logic to revert both state and cache on errors
5. ✅ Replace temporary IDs with real Firebase IDs in success callbacks

## Files Modified
- `web/src/pages/Dashboard.tsx` - Fixed CRUD handlers for multiple entities

## Entities Fixed

### ✅ Cards (3 handlers)
- `handleAddCard` - Creates new credit card
- `handleUpdateCard` - Updates card details
- `handleDeleteCard` - Deletes card

### ✅ Banks (3 handlers)
- `handleAddBank` - Creates new bank account
- `handleUpdateBank` - Updates bank details
- `handleDeleteBank` - Deletes bank account

### ✅ E-Wallets (3 handlers)
- `handleAddEWallet` - Creates new e-wallet
- `handleUpdateEWallet` - Updates e-wallet details
- `handleDeleteEWallet` - Deletes e-wallet
- **Bonus**: Fixed entityType from 'category' to proper 'ewallet'

### ✅ Incomes (3 handlers)
- `handleAddIncome` - Creates new income
- `handleInlineUpdateIncome` - Updates income inline
- `handleDeleteIncome` - Deletes income

### ✅ Recurring Expenses (4 handlers)
- `handleAddRecurring` - Creates new recurring expense
- `handleUpdateRecurring` - Updates recurring expense
- `handleDeleteRecurring` - Deletes recurring expense
- `handleToggleRecurring` - Toggles active status

### ℹ️ Repayments (Already Correct)
Repayment handlers were already using the correct pattern:
- Local state management within RepaymentManager component
- No `loadData()` calls
- Proper optimistic updates with rollback
- Parent notification via `onRepaymentChange` callback

## Testing Completed

### Build Verification
✅ TypeScript compilation successful
✅ No build errors
✅ All imports resolved correctly

### Code Review
✅ Patterns consistent across all handlers
✅ EntityType 'ewallet' verified as valid
✅ Error handling proper with rollbacks
✅ Cache and state updated in sync

### Security Scan (CodeQL)
✅ **0 alerts** found
✅ No security vulnerabilities introduced
✅ Proper error handling maintained
✅ No sensitive data exposure

## Manual Testing Recommendations

### Basic Operations
1. **Create**: Add new item, verify it appears and stays visible
2. **Update**: Edit item details, verify changes persist immediately
3. **Delete**: Remove item, verify immediate removal without revert

### Test Each Entity Type
- [ ] Credit Cards (with cashback rewards)
- [ ] Banks
- [ ] E-Wallets
- [ ] Incomes
- [ ] Recurring Expenses (including toggle active)

### Edge Cases
- [ ] Rapid successive operations
- [ ] Multiple tabs/windows open
- [ ] Offline mode (queue operations)
- [ ] Network errors (verify rollback)
- [ ] Page refresh after operations
- [ ] Browser navigation (back/forward)

### Expected Results
✅ Items appear immediately after creation
✅ Updates persist without reversion
✅ Deletions are immediate and final
✅ No "flickering" or temporary appearance/disappearance
✅ Data survives page refresh
✅ Offline operations queue correctly
✅ Errors trigger proper rollback

## Technical Benefits
1. **Improved UX**: No more jarring reverts after successful operations
2. **Better Performance**: Fewer unnecessary data fetches from Firebase
3. **Cleaner Code**: More predictable state management
4. **Offline Support**: Optimistic updates work better with offline queue
5. **Consistency**: Same pattern applied across all entity types
6. **Maintainability**: Easier to understand and modify in the future

## Related Documentation
- `OFFLINE_SYNC_FIX.md` - Original fix for Expenses, Categories, and Budgets
- `OFFLINE_SYNC_ARCHITECTURE.md` - Overall offline sync design
- `OFFLINE_FUNCTIONALITY.md` - Offline feature specifications
- `UX_OPTIMISTIC_CRUD.md` - Optimistic CRUD patterns

## Future Improvements
1. Create a shared utility function to reduce code duplication
2. Consider adding real-time sync with Firebase listeners for cross-tab updates
3. Add unit tests for cache update logic
4. Implement cache TTL for long-running sessions
5. Add telemetry to track cache hit rates and performance
