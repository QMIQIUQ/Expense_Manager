# 離線保存與 Firebase 同步架構

> 本文件是目前離線流程的程式碼對照文件。主要執行路徑為 Firestore SDK 持久快取、`sessionCache`、`offlineQueue`、`dataService`、`useOptimisticCRUD` 和 `syncService`。最後核對：2026-10-17。

## 1. 先分清兩種「本機保存」

### Firestore SDK 本機持久快取

`web/src/config/firebase.ts` 用 `initializeFirestore()` 初始化 Firestore，並設定 `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`。這會啟用 Firestore Web SDK 的多分頁 IndexedDB 持久快取。SDK 在離線期間可使用本機已取用的文件，並保存 SDK 管理的待同步寫入；恢復連線後會自行同步。這條路徑不經過 app queue。Firebase 官方說明：[Access data offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline)。

Firestore 操作的本機快取由 Firebase SDK 管理。SDK `setDoc`/`updateDoc`/`runTransaction` 等呼叫有各自的離線/線上限制；不要假設所有 service Promise 都會在本機保存完成時 resolve。此應用同時有會等待 service Promise 的樂觀 UI callback。

### 應用資料快取與 app operation queue

這是應用自己的本機機制，和 Firestore IndexedDB 分開：

| 機制 | 實作 | 存放內容 | 主要用途 |
|---|---|---|---|
| `sessionCache` | `utils/sessionCache.ts` | 使用者讀取資料；sessionStorage 快取加可選的 localStorage 持久副本 | 快速首次顯示與應用層離線讀取。localStorage 副本讀取時檢查 24 小時 TTL；若沒有可用快取，`dataService.getData` 離線路徑回傳空陣列。 |
| `offlineQueue` | `utils/offlineQueue.ts` | CRUD 操作，key 為 `offline_operations_queue` | 對部分 handler 的網路錯誤重播。資料在 localStorage，可跨頁面重新載入保留。 |

因此「畫面先顯示/本機已保存」和「Firebase 雲端已確認」是兩個不同時點。Firestore SDK 可能自行保存待同步寫入；app queue 則只在特定 handler/錯誤分類符合條件時才新增操作。

## 2. 讀取路徑

Dashboard `loadData()` 為主要資料呼叫 `dataService.getDataWithRevalidate(entity, userId, fetchFn, onUpdate)`：

1. 有 app cache 且在線：立即把快取交給畫面，再於背景讀取 service/Firestore。
2. 背景資料與快取不同：更新 `sessionCache` 並呼叫 `onUpdate` 更新 state。
3. 離線：讀取 `sessionCache`；沒有資料時回傳 `[]`，不是等待 Firestore 網路請求。
4. Dashboard 對支出和預算資料再套用 app queue 的待處理操作，避免 server/cache refresh 把尚未同步的 UI 變更蓋掉。

`sessionCache.set()` 寫入 sessionStorage，並嘗試把副本寫到 localStorage；若 localStorage 容量不足，副本寫入失敗會被忽略。這不等同 Firestore SDK cache，也不代表 app cache 所有資料都是伺服器最新版。

## 3. 寫入與 app queue 路徑

```text
使用者操作
  → Dashboard handler 樂觀更新 React state / sessionCache
  → useOptimisticCRUD.run() 或該功能自己的處理
  → Firestore domain service
       ├─ 成功：執行 onSuccess callback、清除 pending UI
       ├─ Firestore SDK 本機持久化：由 Firebase SDK 在線恢復後同步
       └─ 可分類為網路錯誤，且設定 retryToQueueOnFail + entityType
            → offlineQueue.enqueue() 寫入 localStorage
            → 顯示「已儲存離線」並保留樂觀 UI
            → online event → syncService 延遲 1 秒讀取 app queue
            → 按順序呼叫對應 service → 成功後 dequeue
```

`useOptimisticCRUD` 只把 `unavailable`、`deadline-exceeded`、`network-request-failed` 等可分類網路錯誤視為可自動入列；`permission-denied`、`invalid-argument`、`failed-precondition` 不會被當作網路錯誤。即使 `retryToQueueOnFail` 為 true，也必須提供支援的 `entityType`，且 queue payload 必須是重播 service 所需的完整資料。

其他錯誤通常顯示重試動作；若設定 `entityType`，通知也可提供使用者手動選擇「儲存離線」。若 enqueue 寫入 localStorage 失敗，會顯示 queue save failed。

## 4. app queue entity 與重播路由

`QueuedOperation` 支援：`expense`、`category`、`budget`、`recurring`、`income`、`card`、`bank`、`ewallet`、`repayment`。`syncService.executeOperation()` 的對照如下：

| entity | 重播目標 | 注意事項 |
|---|---|---|
| `expense` | `expenseService.create/update/deleteWithRelatedTransfers` | create/delete 有專用 transaction 路徑；以當前登入者 UID 檢查 owner；相同支出後續操作在前一筆失敗時會暫停。三次失敗後保留 `needs-attention`，可由通知重試。 |
| `budget` | `budgetService.create/update/delete` | 先檢查登入者/操作 owner，再經 budget mutation lock 和最新配置 transaction。三次失敗後通知 Dashboard 做伺服器重讀/回滾；部分失敗會移除同一 budget 後續操作。 |
| `category` | `categoryService.create/update/delete` | executor 目前要求 update payload 自帶 id；create payload 需保留 userId。 |
| `income` | `incomeService.create/update/delete` | executor 需要可查 owner 的 create payload，以及含 id 的 update payload；重播不會自動執行 Dashboard 的成功 callback。 |
| `recurring` | `recurringExpenseService.create/update/delete` | 只對應舊 `recurringExpenses` 資料模型，不是 `ScheduledPaymentManager` 使用的 scheduled payment service。 |
| `card` / `bank` / `ewallet` | 各自 CRUD service | app queue payload 應包含 service 所需的 owner/ID；重播成功不會自動呼叫任何 Dashboard-only callback。 |
| `repayment` | `repaymentService.create/update/delete` | 不會自動執行 UI callback 中附加的其他收入/餘額副作用。 |

`transfer`、`scheduledPayment`、`scheduledPaymentRecord`、`featureSettings` 不在 queue entity union。Firestore SDK 的本機寫入是獨立機制；應用 queue 對這些資料沒有正確的通用重播路由。

## 5. 同步觸發、順序及重試

- `SyncService` 建構時訂閱 `networkStatus`。瀏覽器發出 `online` 事件且 `autoSyncEnabled` 為 true 時，1 秒後呼叫 `syncOfflineQueue()`。預設為 true；`setAutoSync()` 僅改變執行階段值，沒有對應的使用者設定 UI/持久化選項。
- Dashboard 頁首 `NetworkStatusIndicator` 顯示 browser online/offline、app queue 數量、同步中狀態；有 queue 時可呼叫 `syncNow()`。它顯示的是 app queue count，不是 Firestore IndexedDB 所有待同步寫入的數量。
- 頁首 pending 數字可點擊並呼叫 `syncOfflineQueue()`。漢堡選單的另一個「重新上傳」按鈕目前只呼叫 `loadData()`，沒有直接呼叫 queue sync，雖然 UI 會顯示成功訊息；不可把該訊息視為 queue 已同步證據。
- 同一時間只允許一個 `syncOfflineQueue()` 執行。同步開始時取得 queue 快照並逐筆依序執行；成功即移除，失敗會增加 retryCount。同步期間新加入的操作會排程再跑一輪。
- 最大 retry 為 3。Expense 達上限留在 queue 並設為 `needs-attention`；Budget 觸發拒絕事件及 Dashboard 回復流程；其他 entity 達上限會從 app queue 移除。失敗是否在 UI 清楚可見，依 entity 路徑而異。
- Expense/Budget executor 驗證 userId，會把其他帳戶或舊格式 queue 操作留在 queue，且不消耗重試次數。queue key 本身並未按 userId 分開。
- Dashboard 漢堡選單的「清除佇列」會直接呼叫 `offlineQueue.clear()`，沒有確認步驟，會移除整個 app queue。它不會清掉 Firestore SDK IndexedDB 的待同步寫入；清除 app queue 後，其中待處理的 app operation 沒有復原功能。

## 6. 已知 app queue 路由/資料完整性缺口

這些項目是 source 靜態檢查結果，不代表本次已修正：

1. **定期付款被送往舊 recurring service**：`Dashboard.tsx` 的 scheduled payment 和 payment record handlers 傳 `entityType: 'recurring'`，但 executor 固定呼叫 `recurringExpenseService`。因此 app queue 重播不會寫回 `scheduledPayments`/`scheduledPaymentRecords`；payment record 排程成功 callback 內的 auto-generate-expense 也不會執行。
2. **Income queue payload 缺欄位/副作用**：新增 payload 缺 `userId`，更新 payload 缺 `id`；重播不呼叫成功 callback 的帳戶餘額更新。刪除重播亦不會回復帳戶餘額。
3. **Category queue payload 缺欄位**：新增 payload 未帶 `userId`；更新 payload 未帶 `id`。executor 可能拒絕寫入或略過 update，之後被 retry cap 移除。
4. **Card/Bank/E-Wallet queue payload 未配合 executor**：create payload 缺 `userId`；Bank/Card update 缺 `id`；E-Wallet update 以 `{ id, updates }` 包裝，但 executor 將整個物件傳進 `ewalletService.update()`。
5. **Feature Settings 誤用 Budget entity**：queue payload 不含 budget 必需的 `userId`，Budget executor 會略過而使 queue 操作停留。
6. **Transfer app queue fallback 未接線**：transfer handlers 沒傳 `entityType`，所以 `useOptimisticCRUD` 不會建立 transfer app queue；刪除的餘額回復也是刪除成功後另一個呼叫。
7. **支出更新不改帳戶餘額**：`expenseService.update` 更新支出和朋友摘要，不套用舊付款帳戶反向調整/新值調整。

具體 handler/service 對照和其他流程見 [`LOGIC_METHOD_FLOW.md`](LOGIC_METHOD_FLOW.md)。

## 7. 不應視為目前主路徑的舊實作

`utils/offlineSyncManager.ts` 和 `hooks/useOfflineSync.ts` 還在 source tree，但目前 Dashboard 沒有掛載該 hook，且未找到對 `setOperationExecutor()` 的應用注入。此 manager 的週期性流程/API 不是目前 `NetworkStatusIndicator` 使用的同步路徑。舊文件中提到的 `networkStatusService.initialize()`、`syncService.initialize()`、可設定的 `autoSyncEnabled` localStorage key、整體 `dataCacheService` 快取結構和「所有 entity 都離線支援」均不是目前主程式的實際 API/保證。

`offlineQueue.processQueue()` 仍存在，但目前 `syncService` 使用自己的逐 entity executor/重試處理，不呼叫此 helper。
