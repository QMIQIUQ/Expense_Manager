# Offline Sync Testing Guide

This guide provides step-by-step instructions for testing the offline sync functionality.

## Prerequisites

1. Firebase configuration set up (`.env` file with Firebase credentials)
2. Application running locally (`npm run dev`)
3. Browser DevTools open (for network throttling)

## Test Scenarios

### Scenario 1: Basic Offline Create

**Goal:** Verify that expenses created while offline are synced when connection is restored.

**Steps:**
1. Open the application and log in
2. Open Browser DevTools (F12)
3. Go to Network tab
4. Select "Offline" from the throttling dropdown
5. Verify the network indicator shows 🔴 "Offline"
6. Create a new expense:
   - Description: "Test Offline Expense"
   - Amount: 100
   - Category: Food
   - Click "Add Expense"
7. Verify:
   - Expense appears in the list immediately (optimistic update)
   - Hamburger menu shows "1 pending uploads"
   - Notification shows "Operation saved offline"
8. Change network throttling back to "Online" or "No throttling"
9. Verify:
   - Network indicator changes to 🔄 "Syncing..."
   - After a moment, indicator shows 🟢 or disappears
   - Notification shows "Successfully synced"
   - Hamburger menu shows no pending uploads
10. Refresh the page to confirm the expense persists

**Expected Result:** ✅ Expense is created and synced successfully

---

### Scenario 2: Offline Update

**Goal:** Verify that expenses updated while offline are synced correctly.

**Steps:**
1. Ensure you're online and have at least one expense
2. Go offline (Network tab → Offline)
3. Edit an existing expense:
   - Change amount from 100 to 150
   - Click "Save"
4. Verify expense shows updated amount
5. Check hamburger menu for pending uploads
6. Go back online
7. Wait for auto-sync (should happen within 30 seconds)
8. Refresh and verify the updated amount persists

**Expected Result:** ✅ Updated expense syncs correctly

---

### Scenario 3: Offline Delete

**Goal:** Verify that deleted expenses are removed when connection is restored.

**Steps:**
1. Create a test expense while online
2. Go offline
3. Delete the test expense
4. Verify it disappears from the list
5. Check hamburger menu shows pending operation
6. Go back online
7. Wait for auto-sync
8. Refresh and verify expense is permanently deleted

**Expected Result:** ✅ Deletion syncs successfully

---

### Scenario 4: Multiple Operations Queue

**Goal:** Test multiple queued operations sync in correct order.

**Steps:**
1. Go offline
2. Perform these operations in order:
   - Create expense A (amount: 50)
   - Create expense B (amount: 75)
   - Update expense A (amount: 60)
   - Delete expense B
3. Verify hamburger menu shows "3 pending uploads"
4. Go online
5. Wait for sync to complete
6. Verify:
   - Expense A exists with amount 60
   - Expense B doesn't exist
   - All operations processed correctly

**Expected Result:** ✅ All operations sync in correct order

---

### Scenario 5: Cache Persistence

**Goal:** Verify cached data is shown when starting offline.

**Steps:**
1. While online, navigate through the app to load all data
2. Verify you have expenses, categories, etc.
3. Go offline (or close network connection)
4. Refresh the page (F5)
5. Verify:
   - "Offline mode - showing cached data" notification appears
   - All previously loaded data is still visible
   - Network indicator shows 🔴 "Offline"
6. Try creating a new expense
7. Verify it's queued for sync

**Expected Result:** ✅ Cached data loads immediately when offline

---

### Scenario 6: Manual Sync

**Goal:** Test the manual sync button functionality.

**Steps:**
1. Go offline
2. Create 2-3 expenses
3. Go online but don't wait for auto-sync
4. Open hamburger menu
5. Click "重新上传" (Retry Upload) button
6. Verify:
   - Button shows spinning icon and "处理中..."
   - Notification shows "Syncing..."
   - After completion, shows success message
   - Queue count resets to 0

**Expected Result:** ✅ Manual sync works correctly

---

### Scenario 7: Network Interruption During Sync

**Goal:** Test resilience when network fails during sync.

**Steps:**
1. Go offline and create 5 expenses
2. Go online to trigger sync
3. Immediately go offline again (within 1-2 seconds)
4. Check hamburger menu
5. Verify some operations may have synced, others remain
6. Go back online
7. Verify remaining operations sync

**Expected Result:** ✅ Partial sync handled gracefully, remaining ops retry

---

### Scenario 8: Auto-Sync Interval

**Goal:** Verify automatic sync happens periodically.

**Steps:**
1. Go offline
2. Create an expense
3. Go online
4. DO NOT trigger manual sync
5. Wait and observe (check every 10 seconds)
6. Within 30 seconds, verify sync happens automatically

**Expected Result:** ✅ Auto-sync triggers within 30 seconds

---

### Scenario 9: Multi-Tab Sync

**Goal:** Verify sync works across multiple browser tabs.

**Steps:**
1. Open the app in two browser tabs (Tab A and Tab B)
2. In Tab A, go offline
3. In Tab A, create an expense
4. In Tab A, go online
5. Wait for sync
6. In Tab B, refresh the page
7. Verify the expense appears in Tab B

**Expected Result:** ✅ Changes sync across tabs via Firebase

---

### Scenario 10: Clear Queue

**Goal:** Test clearing the offline queue.

**Steps:**
1. Go offline
2. Create 3 expenses
3. Verify hamburger menu shows "3 pending uploads"
4. Click "Clear Queue" button
5. Verify:
   - Queue count becomes 0
   - Notification confirms queue cleared
6. Go online
7. Refresh page
8. Verify expenses don't exist (they were cleared before sync)

**Expected Result:** ✅ Queue can be cleared without syncing

---

## Network Simulation Tips

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Click "No throttling" dropdown
4. Select "Offline" or use "Add custom profile" for slow 3G

### Firefox DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Click throttling dropdown
4. Select "Offline"

### Actual Network Disconnection
- Turn off WiFi
- Unplug ethernet cable
- Enable airplane mode (mobile)

## Common Issues

### Issue: Sync not triggering
**Solution:** 
- Check network indicator shows online
- Try manual sync via button
- Check browser console for errors

### Issue: Cached data not loading
**Solution:**
- Session cache clears on browser close
- Make sure you had loaded data before going offline
- Try clearing cache and reloading online first

### Issue: Operations sync in wrong order
**Solution:**
- Check timestamp in localStorage queue
- This shouldn't happen - report as bug if it does

### Issue: Network indicator stuck on "Syncing..."
**Solution:**
- Check for failed operations in queue
- Try manual sync
- Check browser console for errors

## Monitoring Tools

### Browser Console
Watch for these logs:
- `[OfflineSyncManager] Network connection detected`
- `[OfflineSyncManager] Starting sync of X operations...`
- `[OfflineSyncManager] Sync completed: X succeeded, Y failed`

### localStorage Inspector
1. Open DevTools → Application tab (Chrome) or Storage tab (Firefox)
2. Check localStorage for:
   - `offline_operations_queue` - Pending operations
   - `lastSyncTime` - Last successful sync timestamp

### sessionStorage Inspector
Check for cached data:
- `expense_cache_expenses`
- `expense_cache_categories`
- `expense_cache_budgets`
- etc.

## Performance Testing

### Large Queue Test
1. Go offline
2. Create 50+ expenses using bulk operations
3. Go online
4. Measure time to sync all operations
5. Verify all operations succeed

**Expected:** Should complete within 1-2 minutes

### Cache Size Test
1. Load app with 100+ expenses
2. Check sessionStorage size
3. Verify app remains responsive

**Expected:** Storage under 5MB, no performance issues

## Automated Testing (Future)

Consider adding automated tests using:
- Playwright/Cypress for E2E testing
- Jest for unit testing sync logic
- Mock Service Worker for network simulation

Example test structure:
```javascript
describe('Offline Sync', () => {
  it('should queue operations when offline', async () => {
    // Simulate offline
    // Create expense
    // Verify queue count = 1
  });
  
  it('should sync when online', async () => {
    // Queue operations
    // Simulate online
    // Wait for sync
    // Verify queue count = 0
  });
});
```

## Reporting Issues

When reporting sync issues, include:
1. Browser and version
2. Steps to reproduce
3. Screenshots of network indicator
4. Browser console logs
5. localStorage queue state
6. Network conditions during test

## Success Criteria

All scenarios should pass with:
- ✅ No data loss
- ✅ Correct operation order
- ✅ Clear user feedback
- ✅ Automatic recovery
- ✅ Reasonable sync times (<30s for normal queues)
- ✅ No UI blocking during sync
