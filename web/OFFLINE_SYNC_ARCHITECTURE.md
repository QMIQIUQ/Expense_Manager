# Offline-First Sync Architecture

## Overview

This document describes the enhanced offline-first synchronization system implemented in the Expense Manager application. The system provides seamless offline functionality with automatic background synchronization when the network connection is restored.

## Architecture Components

### 1. Offline Sync Manager (`offlineSyncManager.ts`)

The core component that manages all offline synchronization logic.

**Key Features:**
- Network status monitoring using browser `online`/`offline` events
- Automatic background sync when connection is restored
- Periodic auto-sync every 30 seconds when online
- Session-based data caching for fast offline access
- Publisher-subscriber pattern for real-time UI updates
- Configurable retry logic with exponential backoff

**API:**
```typescript
// Set operation executor
offlineSyncManager.setOperationExecutor(executor);

// Subscribe to status changes
const unsubscribe = offlineSyncManager.subscribe(callback);

// Manual sync
await offlineSyncManager.manualSync();

// Cache data
offlineSyncManager.cacheData('key', data);

// Get cached data
const data = offlineSyncManager.getCachedData('key');

// Get current status
const status = offlineSyncManager.getStatus();
```

### 2. Offline Queue (`offlineQueue.ts`)

Manages the queue of pending operations when offline.

**Features:**
- Stores operations in localStorage for persistence
- Maximum retry count (default: 3)
- Operation deduplication by ID
- Support for all entity types (expenses, categories, budgets, etc.)

**Operation Structure:**
```typescript
interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'category' | 'budget' | 'recurring' | 'income' | 'card';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}
```

### 3. React Hook (`useOfflineSync.ts`)

Provides React components with easy access to sync functionality.

**Usage:**
```typescript
const {
  isOnline,
  isSyncing,
  queuedOperations,
  lastSyncTime,
  manualSync,
  cacheData,
  getCachedData,
} = useOfflineSync();
```

### 4. Network Status Indicator (`NetworkStatusIndicator.tsx`)

Visual component that displays sync status in the UI.

**States:**
- 🟢 Online (no queued operations)
- 🔴 Offline
- 🔄 Syncing
- ⚠️ Online with queued operations

## Data Flow

### When Online

1. User performs CRUD operation
2. Optimistic UI update (immediate feedback)
3. API call to Firebase
4. **Success:** Data cached in sessionStorage for offline access
5. **Failure:** Operation queued in offlineQueue for retry

### When Offline

1. User opens/refreshes app
2. System checks network status
3. Cached data loaded from sessionStorage
4. User can continue CRUD operations
5. All operations queued in offlineQueue
6. Optimistic UI updates continue working

### When Connection Restored

1. Browser fires `online` event
2. Sync manager detects event
3. Automatic sync begins
4. Operations processed from queue
5. **Success:** Operation removed from queue, data refreshed
6. **Failure:** Retry count incremented, operation remains in queue
7. UI updated with latest data from Firebase

## Integration with Firebase

The system works seamlessly with Firebase's built-in offline persistence:

```typescript
// firebase.ts
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
```

**Two-Layer Caching:**
1. **Firebase Cache (IndexedDB):** Automatic, handles Firestore queries
2. **Session Cache (sessionStorage):** Manual, for faster initial loads

## Operation Executor

The Dashboard component sets up the operation executor that processes queued operations:

```typescript
const executeQueuedOperation = async (operation) => {
  const { type, entity, payload } = operation;
  
  switch (entity) {
    case 'expense':
      if (type === 'create') await expenseService.create(payload);
      else if (type === 'update') await expenseService.update(...);
      else if (type === 'delete') await expenseService.delete(...);
      break;
    // Similar for other entities...
  }
  
  return true; // Success
};

offlineSyncManager.setOperationExecutor(executeQueuedOperation);
```

## Configuration

### Auto-Sync Interval
Default: 30 seconds (can be changed in `offlineSyncManager.ts`)

```typescript
private readonly AUTO_SYNC_INTERVAL_MS = 30000; // 30 seconds
```

### Max Retry Count
Default: 3 attempts (can be changed in `offlineQueue.ts`)

```typescript
const MAX_RETRY = 3;
```

## User Experience

### Offline Mode
- UI shows "Offline" indicator in header
- Cached data displayed immediately
- All CRUD operations work normally
- Operations queued for later sync
- User sees immediate feedback (optimistic updates)

### Online Mode
- UI shows online status
- Background sync happens automatically
- If there are queued operations, they sync in background
- User can trigger manual sync via "Retry Upload" button
- Sync progress shown in notification

### Sync Notifications
- "Syncing..." when sync starts
- "Successfully synced X operations" on success
- "X operations failed to sync" on partial failure
- Errors shown with retry option

## Best Practices

### For Developers

1. **Always cache data after successful API calls:**
   ```typescript
   const data = await service.getAll(userId);
   cacheData('expenses', data);
   ```

2. **Load cached data when offline:**
   ```typescript
   if (!isOnline) {
     const cached = getCachedData('expenses');
     if (cached) setExpenses(cached);
     return;
   }
   ```

3. **Use optimistic CRUD hook:**
   ```typescript
   await optimisticCRUD.run(
     { type: 'create', data: expense },
     () => expenseService.create(expense),
     { entityType: 'expense', retryToQueueOnFail: true }
   );
   ```

### For Users

1. Operations are automatically saved offline
2. Sync happens automatically when connection restored
3. Manual sync available via hamburger menu
4. Queue can be cleared if needed
5. Network status always visible in header

## Troubleshooting

### Operations Not Syncing

1. Check network status indicator
2. Verify queue count in hamburger menu
3. Try manual sync via "Retry Upload" button
4. Check browser console for errors
5. Clear queue and re-perform operations if needed

### Stale Data

1. Firebase cache may have old data
2. Clear browser cache and refresh
3. Session cache cleared on browser close
4. Manual refresh via pull-down or F5

### Performance

- Session cache is fast (memory-based)
- Auto-sync interval can be adjusted
- Large queues may take time to process
- Consider batch operations for bulk updates

## Future Enhancements

- [ ] Conflict resolution for concurrent edits
- [ ] Merge strategies for offline changes
- [ ] Background Sync API for service workers
- [ ] IndexedDB for larger offline storage
- [ ] Differential sync (only changed data)
- [ ] Sync progress percentage
- [ ] Selective sync by entity type
- [ ] Export/import offline queue

## Related Files

- `src/utils/offlineSyncManager.ts` - Core sync logic
- `src/utils/offlineQueue.ts` - Queue management
- `src/hooks/useOfflineSync.ts` - React hook
- `src/hooks/useOptimisticCRUD.ts` - Optimistic updates
- `src/components/NetworkStatusIndicator.tsx` - UI indicator
- `src/pages/Dashboard.tsx` - Integration example
- `src/config/firebase.ts` - Firebase persistence config

## Testing

### Manual Testing Scenarios

1. **Create While Offline**
   - Disconnect network
   - Create new expense
   - Reconnect network
   - Verify expense synced to Firebase

2. **Update While Offline**
   - Disconnect network
   - Edit existing expense
   - Reconnect network
   - Verify changes synced

3. **Delete While Offline**
   - Disconnect network
   - Delete expense
   - Reconnect network
   - Verify deletion synced

4. **Multiple Operations**
   - Disconnect network
   - Create, update, delete multiple items
   - Reconnect network
   - Verify all operations synced in order

5. **Cache Persistence**
   - Load app while online
   - Disconnect network
   - Refresh page
   - Verify cached data shown

6. **Auto-Sync**
   - Queue some operations
   - Wait 30 seconds
   - Verify auto-sync triggered
   - Check operations cleared from queue

## Conclusion

The offline-first sync architecture provides a robust and user-friendly experience for managing expenses even with unreliable network connections. The system is transparent to users, automatically handling all sync logic in the background while providing clear feedback about connectivity and sync status.
