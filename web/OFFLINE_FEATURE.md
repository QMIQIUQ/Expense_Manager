# 离线功能说明 / Offline Feature Guide

## 中文说明

### 功能概述

现在支持完整的离线功能！即使没有网络连接，您也可以：
- ✅ 查看所有数据（费用、分类、预算等）
- ✅ 添加、编辑、删除费用
- ✅ 管理分类和预算
- ✅ 所有更改会自动排队
- ✅ 网络恢复后自动同步

### 工作原理

#### 当您有网络时：
1. 应用会自动下载所有数据到本地缓存
2. 您的操作会立即保存到云端
3. 数据会定期自动刷新

#### 当您离线时：
1. 应用会从本地缓存加载数据
2. 您可以正常使用所有功能
3. 所有更改会保存到待同步队列
4. 右下角会显示"离线模式"

#### 当网络恢复时：
1. 应用会自动检测到网络连接
2. 1秒后自动开始同步
3. 右下角显示同步进度
4. 同步完成后数据会自动刷新

### 使用指南

#### 查看同步状态
- 查看右下角的状态指示器
- **红点** = 离线模式
- **蓝色带数字** = 有待同步的更改
- **绿色转圈** = 正在同步

#### 手动同步
如果自动同步没有启动：
1. 点击右下角的"立即同步"按钮
2. 等待同步完成
3. 查看通知了解同步结果

#### 注意事项
1. 关闭浏览器前请确保所有更改已同步
2. 如果多个设备同时离线编辑，最后同步的数据会覆盖之前的
3. 缓存会在浏览器标签页关闭后清除
4. 每次打开应用时都会自动刷新缓存

### 常见问题

**Q: 离线时能做什么？**
A: 几乎所有功能都可以使用，包括查看、添加、编辑、删除数据。

**Q: 数据会丢失吗？**
A: 不会。所有操作都会保存到队列，网络恢复后自动同步。

**Q: 同步失败怎么办？**
A: 应用会自动重试3次。如果还是失败，请检查网络连接后手动点击"立即同步"。

**Q: 缓存占用多少空间？**
A: 通常在1-5MB之间，浏览器有足够空间。

**Q: 缓存会过期吗？**
A: 缓存在浏览器标签页关闭后会清除，超过1小时的旧缓存也会自动清理。

---

## English Guide

### Feature Overview

Full offline support is now available! Even without internet, you can:
- ✅ View all data (expenses, categories, budgets, etc.)
- ✅ Add, edit, delete expenses
- ✅ Manage categories and budgets
- ✅ All changes are automatically queued
- ✅ Auto-sync when connection is restored

### How It Works

#### When You're Online:
1. App automatically downloads all data to local cache
2. Your operations are saved to cloud immediately
3. Data refreshes periodically

#### When You're Offline:
1. App loads data from local cache
2. You can use all features normally
3. All changes are saved to a sync queue
4. "Offline Mode" indicator appears in bottom-right

#### When Connection is Restored:
1. App automatically detects network connection
2. Auto-sync starts after 1 second
3. Sync progress shown in bottom-right
4. Data automatically refreshes after sync

### User Guide

#### Check Sync Status
- Look at the indicator in bottom-right corner
- **Red dot** = Offline Mode
- **Blue with number** = Pending changes to sync
- **Green spinning** = Syncing in progress

#### Manual Sync
If auto-sync doesn't start:
1. Click "Sync Now" button in bottom-right
2. Wait for sync to complete
3. Check notifications for results

#### Important Notes
1. Ensure all changes are synced before closing browser
2. If multiple devices edit offline, last sync wins
3. Cache clears when browser tab is closed
4. Cache automatically refreshes on each app load

### FAQ

**Q: What can I do offline?**
A: Almost everything - view, add, edit, delete data.

**Q: Will I lose data?**
A: No. All operations are queued and synced when online.

**Q: What if sync fails?**
A: App retries 3 times automatically. If still failing, check network and click "Sync Now" manually.

**Q: How much space does cache use?**
A: Usually 1-5MB, well within browser limits.

**Q: Does cache expire?**
A: Cache clears when browser tab closes. Old cache (>1 hour) is auto-cleaned.

---

## Technical Details

### Storage
- **Session Storage**: Stores cached data (cleared on tab close)
- **Local Storage**: Stores sync queue (persists across sessions)

### Entities Cached
- Expenses
- Categories
- Budgets
- Recurring Expenses
- Incomes
- Cards
- Banks
- E-wallets
- Repayments
- Feature Settings
- User Settings

### Sync Mechanism
1. Operations queued in localStorage
2. Automatic retry up to 3 times
3. Progressive sync with progress indicator
4. Background cache refresh after sync

### Performance
- Cache read: < 1ms
- Cache write: < 5ms
- Sync speed: ~10-20 operations/second

---

**Enjoy seamless offline editing!** 🎉
