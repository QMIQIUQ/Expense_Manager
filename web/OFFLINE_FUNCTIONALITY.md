# Offline Functionality Documentation

## Overview

The Expense Manager now supports comprehensive offline functionality, allowing users to:
- Continue working when internet connection is lost
- View cached data from their last online session
- Queue operations for automatic sync when connection is restored
- Manually trigger sync operations
- Clear pending operations if needed

## Architecture

### Components

1. **Data Cache Service** (`src/services/dataCacheService.ts`)
   - Uses `sessionStorage` for data caching
   - Stores all user data (expenses, categories, budgets, etc.)
   - Includes metadata (last sync time, staleness)
   - 24-hour cache expiry

2. **Network Status Service** (`src/services/networkStatusService.ts`)
   - Monitors online/offline status using browser APIs
   - Provides subscription mechanism for components
   - Manual connectivity check functionality

3. **Sync Service** (`src/services/syncService.ts`)
   - Manages synchronization of offline operations
   - Automatic sync when connection is restored
   - Manual sync trigger
   - Progress tracking and reporting
   - Supports all entity types

4. **Offline Queue** (`src/utils/offlineQueue.ts`)
   - Uses `localStorage` for persistence across sessions
   - Stores failed operations with retry mechanism
   - Maximum 3 retry attempts per operation
   - Queue management functions

5. **Network Status Indicator** (`src/components/NetworkStatusIndicator.tsx`)
   - Visual indicator of online/offline status
   - Shows pending operation count
   - Manual sync controls
   - Sync progress display

## User Experience

### When Connection is Lost

1. User sees **red "Offline" indicator** in the header
2. App automatically falls back to cached data
3. User can continue performing CRUD operations
4. Operations are queued for later sync
5. Toast notification: "Using cached data (offline mode)"

### When Performing Operations Offline

1. User adds/edits/deletes data normally
2. Operation appears immediately (optimistic update)
3. If operation fails:
   - Automatically added to offline queue
   - Counter badge shows pending operations
   - User sees info notification about queued operation

### When Connection is Restored

1. User sees **green "Online" indicator**
2. Automatic sync begins (if auto-sync enabled)
3. Sync progress shown in header
4. Success notification when sync completes
5. Failed operations remain in queue

### Manual Sync

Users can manually trigger sync:
1. Click the pending operations badge (📤 with count)
2. Click "Sync Now" button
3. View sync progress
4. Option to clear queue if needed

## Technical Details

### Cache Strategy

```typescript
// Cache Structure
interface CachedData {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  recurringExpenses: RecurringExpense[];
  incomes: Income[];
  cards: Card[];
  ewallets: EWallet[];
  banks: Bank[];
  repayments: Repayment[];
  metadata: {
    lastSync: number;
    isStale: boolean;
    userId: string;
  };
}
```

### Cache Behavior

- **On App Load (Online):**
  1. Load data from Firebase
  2. Cache data in sessionStorage
  3. User can work normally

- **On App Load (Offline):**
  1. Check for cached data
  2. Load from cache if available
  3. Show offline notification
  4. User can view/edit cached data

- **On Data Change (Online):**
  1. Optimistic UI update
  2. Save to Firebase
  3. Update cache on success
  4. Rollback on failure

- **On Data Change (Offline):**
  1. Optimistic UI update
  2. Add operation to queue
  3. Show info notification
  4. Sync when connection restored

### Offline Queue

```typescript
interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'category' | 'budget' | 'recurring' | 'income' | 'card' | 'ewallet' | 'bank' | 'repayment';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}
```

### Auto-Sync Mechanism

1. **Trigger:** Network status changes from offline to online
2. **Process:**
   - Get all queued operations
   - Execute each operation sequentially
   - Remove successful operations from queue
   - Increment retry count for failures
   - Remove after max retries (3)
3. **Progress:** Real-time updates to UI
4. **Notification:** Success/failure summary

## Configuration

### Auto-Sync Setting

Users can enable/disable auto-sync:
- Default: **Enabled**
- Stored in: `localStorage`
- Key: `'autoSyncEnabled'`

### Cache Expiry

- Default: **24 hours**
- Configurable in: `dataCacheService.ts`
- Constant: `CACHE_EXPIRY_MS`

### Max Retry Attempts

- Default: **3 attempts**
- Configurable in: `offlineQueue.ts`
- Constant: `MAX_RETRY`

## API Reference

### Data Cache Service

```typescript
// Initialize cache
dataCacheService.initCache(userId, data);

// Get cached data
const cached = dataCacheService.getCache(userId);

// Update specific entity
dataCacheService.updateCacheEntity(userId, 'expenses', expenses);

// Clear cache
dataCacheService.clearCache(userId);

// Check cache availability
const hasCache = dataCacheService.hasCacheAvailable(userId);
```

### Network Status Service

```typescript
// Initialize (call once on app start)
networkStatusService.initialize();

// Subscribe to changes
const unsubscribe = networkStatusService.subscribe((isOnline) => {
  console.log('Network status:', isOnline);
});

// Check status
const isOnline = networkStatusService.isOnline;

// Manual connectivity check
const hasInternet = await networkStatusService.checkConnectivity();

// Cleanup (call on app unmount)
networkStatusService.cleanup();
```

### Sync Service

```typescript
// Initialize (call once on app start)
syncService.initialize();

// Manual sync
const result = await syncService.syncAll();
// Returns: { success: number, failed: number }

// Subscribe to progress
const unsubscribe = syncService.subscribe((progress) => {
  console.log('Sync progress:', progress);
});

// Enable/disable auto-sync
syncService.setAutoSync(true);

// Check auto-sync status
const enabled = syncService.isAutoSyncEnabled();

// Check if syncing
const isSyncing = syncService.syncing;
```

### Offline Queue

```typescript
// Add operation
const opId = offlineQueue.enqueue({
  type: 'create',
  entity: 'expense',
  payload: expenseData
});

// Get all operations
const operations = offlineQueue.getAll();

// Get count
const count = offlineQueue.count();

// Remove operation
offlineQueue.dequeue(opId);

// Clear queue
offlineQueue.clear();

// Check for pending operations
const hasPending = offlineQueue.hasPendingOperations();
```

## Troubleshooting

### Cache Not Loading

**Problem:** Cached data not showing when offline

**Solutions:**
1. Check browser sessionStorage quota
2. Verify user was online at least once
3. Check console for cache errors
4. Ensure cache hasn't expired (>24 hours)

### Sync Not Triggering

**Problem:** Operations not syncing when online

**Solutions:**
1. Check auto-sync setting
2. Verify operations in queue: `offlineQueue.count()`
3. Check network status indicator
4. Manually trigger sync
5. Check browser console for errors

### Queue Growing Too Large

**Problem:** Too many pending operations

**Solutions:**
1. Manually trigger sync
2. Check for persistent network issues
3. Review failed operations
4. Clear queue if operations are obsolete
5. Check max retry setting

## Best Practices

### For Users

1. **Keep data synced:** Regularly use the app while online
2. **Monitor queue:** Check pending operations badge
3. **Manual sync:** Trigger sync when connection is stable
4. **Cache refresh:** Open app while online to refresh cache

### For Developers

1. **Error handling:** Always handle offline scenarios
2. **Optimistic updates:** Use for better UX
3. **Cache updates:** Update cache after successful operations
4. **Queue management:** Add retry logic for failed operations
5. **User feedback:** Show clear offline/sync status

## Future Enhancements

Potential improvements for offline functionality:

1. **Conflict Resolution:**
   - Detect conflicts between cached and server data
   - Let users choose which version to keep
   - Merge changes intelligently

2. **Selective Sync:**
   - Allow users to choose which entities to sync
   - Priority-based sync queue
   - Batch operations for efficiency

3. **Advanced Caching:**
   - IndexedDB for larger storage
   - Background sync API for PWA
   - Service worker integration

4. **Data Compression:**
   - Compress cached data
   - Reduce storage usage
   - Faster load times

5. **Offline Analytics:**
   - Track offline usage patterns
   - Measure sync success rates
   - Optimize caching strategy

## Translations

The following translation keys are available:

- `networkOnline` - "Online"
- `networkOffline` - "Offline"
- `pendingOperations` - "Pending operations"
- `syncing` - "Syncing"
- `syncComplete` - "Sync complete"
- `synced` - "synced"
- `syncFailed` - "failed"
- `offlineOperations` - "Offline Operations"
- `syncNow` - "Sync Now"
- `clearOfflineQueue` - "Clear Queue"
- `syncOfflineNote` - "Connect to internet to sync"
- `confirmClearOfflineQueue` - "Are you sure you want to clear all pending offline operations?"
- `usingCachedData` - "Using cached data (offline mode)"
- `pendingUploads` - "pending uploads"

## Version History

- **v1.0** - Initial offline functionality implementation
  - Data caching in sessionStorage
  - Network status monitoring
  - Automatic sync on reconnection
  - Manual sync controls
  - Visual status indicators
