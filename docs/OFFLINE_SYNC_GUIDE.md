# Offline Save and Background Sync Guide

This guide explains the enhanced offline functionality and background synchronization system implemented in the Expense Manager application.

## Overview

The application now features a robust offline-first architecture that:
- **Caches data locally** when you have internet connection
- **Works fully offline** - view and edit data without network
- **Queues changes** made while offline
- **Automatically syncs** when connection is restored
- **Shows sync status** with a visual indicator

## Architecture

### Core Components

#### 1. Session Cache (`sessionCache.ts`)
- Stores Firestore data in browser's `sessionStorage`
- Provides fast access to cached data
- Automatically clears old cache entries (older than 1 hour)
- Cache persists during the browser session

**Key Features:**
```typescript
// Save data to cache
sessionCache.set('expenses', userId, expensesData);

// Get data from cache
const expenses = sessionCache.get('expenses', userId);

// Check if cache exists
if (sessionCache.has('expenses', userId)) {
  // Use cached data
}
```

#### 2. Network Status Monitor (`networkStatus.ts`)
- Monitors online/offline status in real-time
- Detects when network connection is restored
- Allows subscribing to network status changes

**Usage:**
```typescript
// Check current status
if (networkStatus.isOnline) {
  // Online operations
}

// Subscribe to changes
const unsubscribe = networkStatus.subscribe((isOnline) => {
  console.log('Network status:', isOnline ? 'Online' : 'Offline');
});
```

#### 3. Offline Queue (`offlineQueue.ts`)
- Stores operations (create, update, delete) when offline
- Retries failed operations up to 3 times
- Persists queue in localStorage across sessions

**Supported Entities:**
- Expenses
- Categories
- Budgets
- Recurring Expenses
- Incomes
- Cards
- Banks
- E-wallets
- Repayments

#### 4. Sync Service (`syncService.ts`)
- Manages background synchronization
- Processes offline queue when online
- Refreshes cache with latest data
- Reports sync progress

**Features:**
```typescript
// Manually trigger sync
await syncService.syncOfflineQueue();

// Refresh cache for specific entity
await syncService.refreshCache('expenses', userId);

// Refresh all caches
await syncService.refreshAllCaches(userId);

// Subscribe to sync progress
const unsubscribe = syncService.onSyncProgress((progress) => {
  console.log(`Syncing: ${progress.completed}/${progress.total}`);
});
```

#### 5. Data Service (`dataService.ts`)
- Unified interface for data operations
- Automatically uses cache when offline
- Falls back to cache if fetch fails

**Usage:**
```typescript
// Get expenses (uses cache if offline)
const expenses = await dataService.getExpenses(userId);

// Force refresh from server
const expenses = await dataService.getExpenses(userId, true);

// Update cache after local modification
dataService.updateCache('expenses', userId, (data) => {
  return [...data, newExpense];
});
```

### React Hooks

#### `useNetworkStatus()`
React hook for monitoring network connectivity:
```typescript
const isOnline = useNetworkStatus();

return (
  <div>
    Status: {isOnline ? 'Online' : 'Offline'}
  </div>
);
```

#### `useSyncStatus()`
React hook for monitoring sync progress:
```typescript
const { syncProgress, isSyncing, pendingCount, syncNow } = useSyncStatus();

return (
  <div>
    {isSyncing && <span>Syncing...</span>}
    {pendingCount > 0 && (
      <button onClick={syncNow}>
        Sync {pendingCount} pending changes
      </button>
    )}
  </div>
);
```

### UI Components

#### `NetworkStatusIndicator`
Visual indicator showing:
- **Offline Mode** - Red dot with "Offline Mode" message
- **Pending Changes** - Blue indicator with count and "Sync Now" button
- **Syncing** - Green indicator with spinner and "Syncing..." message

The indicator automatically appears/disappears based on network status and sync state.

## How It Works

### When You Have Internet

1. **Initial Load:**
   - Dashboard fetches all data from Firestore
   - Data is automatically cached in sessionStorage
   - UI displays the fetched data

2. **Making Changes:**
   - Changes are sent to Firestore immediately
   - Cache is updated optimistically
   - If successful, cache stays updated
   - If failed, change is queued and cache is rolled back

3. **Background Refresh:**
   - Cache is refreshed periodically with latest data
   - Ensures cache stays up-to-date

### When You Go Offline

1. **Viewing Data:**
   - Dashboard loads data from sessionStorage cache
   - UI shows cached data with full functionality
   - Bottom-right indicator shows "Offline Mode"

2. **Making Changes:**
   - Changes are applied to local state immediately
   - Operations are queued in localStorage
   - Cache is updated optimistically
   - UI works normally without delays

3. **Queued Operations:**
   - All CRUD operations are queued
   - Queue persists even if you close the browser
   - Indicator shows number of pending changes

### When Connection is Restored

1. **Automatic Sync:**
   - System detects network connection
   - After 1 second delay, sync starts automatically
   - Queued operations are processed in order

2. **Sync Process:**
   - Operations are executed one by one
   - Success: Operation removed from queue
   - Failure: Operation retried (max 3 times)
   - Progress shown in indicator

3. **Cache Refresh:**
   - After sync completes, cache is refreshed
   - Ensures local data matches server
   - Dashboard reloads with latest data

## User Experience

### Normal Flow (Online)
1. Open app → Data loads from server
2. Add expense → Instantly appears, saved to server
3. Edit expense → Changes appear immediately
4. Delete expense → Removed instantly
5. All operations complete in milliseconds

### Offline Flow
1. Open app (offline) → Data loads from cache
2. See message: "Offline Mode"
3. Add expense → Appears instantly, queued for sync
4. Edit expense → Changes appear, queued
5. Delete expense → Removed, queued
6. Indicator shows: "3 pending changes"
7. Connection restored → Auto-sync starts
8. Indicator shows: "Syncing..."
9. Sync completes → "Sync Now" button appears if manual sync needed

### Manual Sync
If auto-sync doesn't trigger or you want to sync immediately:
1. Click "Sync Now" button in indicator
2. Watch progress as operations sync
3. Check for any errors in notifications

## Best Practices

### For Users

1. **Check Sync Status:**
   - Always look at the bottom-right indicator
   - Make sure pending changes sync before closing the app

2. **Manual Sync:**
   - Use "Sync Now" button if auto-sync doesn't start
   - Especially important before closing the browser

3. **Conflicts:**
   - If same data is edited on multiple devices offline
   - Last sync wins (most recent changes overwrite)

### For Developers

1. **Cache Updates:**
   ```typescript
   // Always update cache when modifying data locally
   setExpenses(newExpenses);
   dataService.updateCache('expenses', userId, () => newExpenses);
   ```

2. **Error Handling:**
   ```typescript
   try {
     await expenseService.create(expense);
   } catch (error) {
     if (!networkStatus.isOnline) {
       // Queue for later
       offlineQueue.enqueue({
         type: 'create',
         entity: 'expense',
         payload: expense
       });
     }
   }
   ```

3. **Optimistic Updates:**
   ```typescript
   // Update UI first
   setExpenses([newExpense, ...expenses]);
   
   // Then sync with server
   try {
     await expenseService.create(newExpense);
   } catch (error) {
     // Rollback on failure
     setExpenses(expenses);
   }
   ```

## Technical Details

### Storage Limits

- **sessionStorage**: ~5-10 MB per origin
- **localStorage**: ~5-10 MB per origin (for queue)
- Cache automatically clears when:
  - Browser tab is closed (sessionStorage)
  - Cache is older than 1 hour
  - Storage limit is reached

### Performance

- **Cache Read**: < 1ms (from sessionStorage)
- **Cache Write**: < 5ms (to sessionStorage)
- **Sync Speed**: Depends on queue size and network
  - ~10-20 operations per second
  - Shows progress indicator

### Security

- All data stored locally is:
  - Tied to user's browser session
  - Cleared when browser is closed (sessionStorage)
  - Not accessible to other websites
  - Subject to browser's same-origin policy

## Troubleshooting

### Issue: Data not loading offline
**Solution:**
1. Ensure you loaded the app at least once while online
2. Check browser's sessionStorage (DevTools → Application → Session Storage)
3. Try refreshing the page while online to rebuild cache

### Issue: Sync not starting automatically
**Solution:**
1. Click "Sync Now" button manually
2. Check browser console for errors
3. Verify network connection is stable

### Issue: Sync fails repeatedly
**Solution:**
1. Check Firebase console for errors
2. Verify Firestore security rules are correct
3. Try clearing offline queue and syncing fresh:
   ```typescript
   offlineQueue.clear();
   ```

### Issue: Cache too large
**Solution:**
1. Browser will automatically clear old cache entries
2. Can manually clear cache:
   ```typescript
   sessionCache.clearAll();
   ```
3. Reduce amount of cached data if possible

## Future Enhancements

Potential improvements:
- [ ] Use IndexedDB for larger storage capacity
- [ ] Implement conflict resolution strategies
- [ ] Add progress bar for large syncs
- [ ] Support partial sync (by entity type)
- [ ] Add cache versioning for data migrations
- [ ] Implement background sync API (Service Worker)
- [ ] Add offline indicator in header always
- [ ] Show last sync time
- [ ] Add manual cache refresh button

## API Reference

### sessionCache

```typescript
// Set cache
sessionCache.set(entity: CacheableEntity, userId: string, data: T): void

// Get cache
sessionCache.get<T>(entity: CacheableEntity, userId: string): T | null

// Check if cache exists
sessionCache.has(entity: CacheableEntity, userId: string): boolean

// Remove cache
sessionCache.remove(entity: CacheableEntity, userId: string): void

// Clear all cache for user
sessionCache.clearUser(userId: string): void

// Clear all cache
sessionCache.clearAll(): void
```

### networkStatus

```typescript
// Check online status
networkStatus.isOnline: boolean

// Subscribe to status changes
networkStatus.subscribe(callback: (isOnline: boolean) => void): () => void

// Test connectivity
networkStatus.testConnectivity(): Promise<boolean>
```

### offlineQueue

```typescript
// Add to queue
offlineQueue.enqueue(operation: QueuedOperation): string

// Get all queued operations
offlineQueue.getAll(): QueuedOperation[]

// Remove from queue
offlineQueue.dequeue(id: string): void

// Get queue count
offlineQueue.count(): number

// Clear queue
offlineQueue.clear(): void

// Process queue
offlineQueue.processQueue(executor: Function): Promise<{success: number, failed: number}>
```

### syncService

```typescript
// Sync offline queue
syncService.syncOfflineQueue(): Promise<{success: number, failed: number}>

// Refresh cache
syncService.refreshCache(entity: CacheableEntity, userId: string): Promise<void>

// Refresh all caches
syncService.refreshAllCaches(userId: string): Promise<void>

// Subscribe to sync progress
syncService.onSyncProgress(callback: Function): () => void

// Check sync status
syncService.isSyncInProgress: boolean
syncService.pendingCount: number
```

### dataService

```typescript
// Get data with caching
dataService.getExpenses(userId: string, forceRefresh?: boolean): Promise<Expense[]>
dataService.getCategories(userId: string, forceRefresh?: boolean): Promise<Category[]>
// ... similar for other entities

// Update cache
dataService.updateCache<T>(entity: CacheableEntity, userId: string, updater: (data: T) => T): void

// Invalidate cache
dataService.invalidateCache(entity: CacheableEntity, userId: string): void

// Clear user cache
dataService.clearUserCache(userId: string): void
```

---

**Happy offline editing!** 🚀
