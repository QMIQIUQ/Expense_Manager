# 主要 Method 與端到端流程

> 目前程式碼核對基準：`main@9fce5d7`（2026-10-25）。領域流程與離線 queue 的詳細 source-level 盤點原以 `main@a9a9d7c` 為基礎；後續 main 變更限於 UI 呈現樣式，沒有改動這些資料流程。沒有執行 Firebase 實機同步；執行流程仍以當前 TypeScript source 為準。

## 1. 程式職責與狀態擁有者

| 區域 | 主要檔案 | 擁有的責任 |
|---|---|---|
| 啟動與 Provider | `web/src/main.tsx`, `web/src/App.tsx` | Service Worker、PWA 外殼、主題、語言、身份、通知、使用者設定和路由。 |
| 畫面協調 | `web/src/pages/Dashboard.tsx` | 主頁籤、主要資料 state、讀取與 CRUD handler、樂觀 UI、快取更新、app queue 套用/回滾及同步事件。 |
| 功能 UI | `web/src/pages/tabs/`, `web/src/components/` | 表單、列表、管理器、Widget、設定面板；透過 props/context 呼叫 Dashboard 或 service。 |
| Firebase 存取 | `web/src/services/*Service.ts` | Firestore 查詢、寫入、交易，以及少數 Callable Function。 |
| 領域/共用邏輯 | `web/src/domain/`, `web/src/utils/`, `web/src/hooks/` | 金額/日期/預算驗證、樂觀 CRUD、匯率、離線快取與佇列等。 |
| 權限 | `web/firestore.rules`, `web/functions/` | Firestore 文件存取條件及需 Admin 權限的伺服器端操作。 |

`AuthContext` 擁有目前 Firebase 使用者與登入狀態；`UserSettingsContext` 擁有使用者偏好；Dashboard 擁有大部分功能資料的 React state。`sessionCache` 和 Firestore SDK 快取是各自的本機資料副本，兩者都不是伺服器已確認狀態的同義詞。

## 2. 主要 method 索引

下表列主要匯出的 service API；私有 helper、純呈現元件及 component callback 未逐一列出。實際參數/型別請以各檔案的 TypeScript 簽名為準。

### 讀取、快取、網路與同步

| Context / Hook | 主要 methods | 用途 |
|---|---|---|
| `AuthContext` (`contexts/AuthContext.tsx`) | `signup`, `login`, `logout`, `loginWithGoogle`, `changePassword`, `changeEmail` | Firebase 身份操作與目前使用者狀態；Email 登入可選 session/local auth persistence，Google 登入採 local persistence。 |
| `useNetworkStatus` | 回傳 `networkStatus.isOnline` 並訂閱 online/offline | React 元件取得 browser 網路狀態。 |

| Service / Hook | 主要 methods | 用途 |
|---|---|---|
| `dataService` (`services/dataService.ts`) | `getExpenses`, `getCategories`, `getBudgets`, `getRecurringExpenses`, `getIncomes`, `getCards`, `getEWallets`, `getBanks`, `getRepayments`, `getData`, `getDataWithRevalidate`, `areDataEqual`, `updateCache`, `invalidateCache`, `clearUserCache` | 以 `sessionCache` 支援快取讀取、離線回退及 stale-while-revalidate。Dashboard 初始讀取直接使用 `getDataWithRevalidate`。 |
| `sessionCache` (`utils/sessionCache.ts`) | `set`, `get`, `getMetadata`, `has`, `remove`, `clearUser`, `clearAll`, `clearOldCaches`, `getCacheSize` | 以 userId/entity key 保存 app 快取；set 寫入 sessionStorage 並盡力複製到 localStorage。localStorage 快取讀取時檢查 24 小時 TTL。 |
| `networkStatus` (`utils/networkStatus.ts`) | `isOnline`, `subscribe`, `testConnectivity`, `destroy` | 監聽瀏覽器 `online`/`offline` 事件並通知訂閱者。它表示瀏覽器網路狀態，不保證 Firebase 權限或服務可用。 |
| `offlineQueue` (`utils/offlineQueue.ts`, `utils/indexedDbOutbox.ts`) | `initialize`, `refresh`, `enqueue`, `enqueueMany`, `getAll`, `count`, `claimNext`, `renew`, `complete`, `release`, `fail`, `retry`, `clear` | IndexedDB app outbox，舊 `offline_operations_queue` localStorage 資料於初始化時遷移；enqueue/retry/claim/completion 為非同步。最多重播 5 次後保留為 `needs-attention`；單一執行者由 `syncService` 協調。 |
| `syncService` (`services/syncService.ts`) | `onSyncProgress`, `setAutoSync`, `isSyncInProgress`, `pendingCount`, `syncOfflineQueue`, `refreshCache`, `refreshAllCaches` | app queue 協調器。網路恢復且 auto-sync 開啟時延遲 1 秒執行；也由狀態元件手動觸發。 |
| `useSyncStatus` (`hooks/useSyncStatus.ts`) | `syncProgress`, `isSyncing`, `pendingCount`, `syncNow` | 訂閱 sync progress、`offline-queue-changed` 及 browser online/offline events；不以每秒 storage polling 讀 queue。 |
| `useOptimisticCRUD` (`hooks/useOptimisticCRUD.ts`) | `run`, `isPending`, `getPendingOperation`, `pendingCount` | 先登記 UI pending 狀態；只有呼叫端提供 `retryToQueueOnFail` 和 `entityType` 時，才透過 `writeLocalFirst` 將操作保存後交由 sync worker 執行。其他直接 service 路徑需另外核對。 |

### 財務紀錄、帳戶與預算

| Service | Methods | 責任 |
|---|---|---|
| `expenseService` | `createId`, `create`, `getAll`, `getAllFromServer`, `update`, `delete`, `deleteWithRelatedTransfers`, `getByDateRange`, `getByCategory` | 支出 CRUD、服務端讀取及刪除時辨認/清理已連結轉帳。`create` 可在同一 Firestore transaction 更新帳戶餘額和朋友支出摘要。 |
| `incomeService` | `create`, `getAll`, `getByDateRange`, `getByExpenseId`, `update`, `delete` | 收入 CRUD 與關聯/日期查詢；帳戶餘額副作用由 Dashboard 成功 callback 呼叫 `balanceService`。 |
| `transferService` | `createId`, `create`, `getAll`, `update`, `delete`, `getByDateRange` | 轉帳 CRUD；`create` 交易會同步更新來源/目的帳戶餘額並寫入支出關聯。刪除時餘額回復目前由 Dashboard 成功 callback 另行執行。 |
| `repaymentService` | `create`, `getAll`, `getByExpenseId`, `update`, `delete`, `getTotalRepaidForExpense` | 還款紀錄 CRUD、依支出查詢及金額加總。還款 UI 在部分流程會另外建立 Income 紀錄。 |
| `categoryService` | `initializeDefaults`, `create`, `getAll`, `updateOrder`, `update`, `delete` | 初始化預設分類、分類 CRUD 與排序。 |
| `budgetService` | `createId`, `create`, `getAll`, `update`, `delete`, `getByCategory` | 預算 CRUD；create/update/delete 走 `runBudgetMutationTransaction`，以伺服器最新預算及設定檢查整體配置。 |
| `bankService` | `create`, `getAll`, `update`, `delete`, `getById`, `updateBalance` | 銀行帳戶 CRUD 與餘額更新。 |
| `ewalletService` | `initializeDefaults`, `create`, `getAll`, `search`, `update`, `delete`, `getById`, `updateBalance`, `findByName` | 電子錢包 CRUD、預設項目初始化、依名稱/條件找錢包及餘額更新。 |
| `cardService` | `create`, `getAll`, `update`, `delete` | 信用卡 CRUD；帳單週期/回饋統計主要由 utility 計算。 |
| `balanceService` | `prepareBalanceAdjustments`, `applyBalanceAdjustmentsInTransaction`, `handleExpenseCreated/Deleted`, `handleIncomeCreated/Deleted`, `handleTransferCreated/Deleted`, `updateBalanceForExpense/Income/TransferSource/TransferDestination` | 依付款帳戶幣別換算增減額；transaction helper 驗證帳戶所有權及幣別後以 increment 更新。部分舊式 `handle*` 會直接更新帳戶，並捕捉錯誤只寫 log。 |

### 設定、排程、匯率與其他領域

| Service | Methods | 責任 |
|---|---|---|
| `scheduledPaymentService` | `calculateInstallmentAmount`, `calculateRemainingAmount`, `create`, `getAll`, `getActive`, `update`, `delete`, `toggleActive`, `markCompleted`, `createPaymentRecord`, `getPaymentRecords`, `getAllPaymentRecords`, `updatePaymentRecord`, `deletePaymentRecord`, `getPaymentSummary`, `isPeriodPaid`, `getPendingPayments`, `exportPaymentHistoryToCSV`, `downloadPaymentHistoryCSV`, `getUpcomingReminders` | 定期付款計劃與付款紀錄、期別付款狀態、分析/提醒及 CSV 匯出。付款紀錄成功後，Dashboard 可按計劃設定新增支出。 |
| `recurringExpenseService` | `create`, `getAll`, `getActive`, `update`, `delete`, `toggleActive` | 舊式 `recurringExpenses` 資料服務；其 `RecurringExpenseManager`/`RecurringTab` 不在目前 Dashboard 掛載流程。 |
| `userSettingsService` | `get`, `create`, `update`, `setOverallBudgetLimit`, `getOrCreate` | 使用者設定及整體預算限制。部分讀取可指定強制伺服器讀取。 |
| `featureSettingsService` | `getOrCreate`, `update`, `resetToDefaults` | 主頁籤與選單功能偏好。 |
| `dashboardLayoutService` | `get`, `fetchFromFirebase`, `getOrCreate`, `update`, `updateWidgets`, `toggleWidget`, `reorderWidgets`, `resetToDefault`, `updateColumns` | Dashboard Widget 顯示、順序及欄數配置。 |
| `currencyRateService` | `getHistoricalRate`, `convertAmountToCurrency`, `resolveAmountCurrencyFields`, `resolveExpenseCurrencyFields` | 取歷史匯率、快取匯率、計算原幣/基準幣欄位；對外提供 `currencyRateService` object。 |
| `quickExpenseService` | `getPresets`, `create`, `update`, `delete`, `updateOrder` | 快速支出預設 CRUD 與排序；快速新增最後仍呼叫 Dashboard 支出建立流程。 |
| `friendSpendingService` | `getConnections`, `listenSpendingSummary`, `mutateFriendship`, `getPreference`, `savePreference` | 好友邀請/接受/拒絕/移除、分享開關、即時摘要訂閱及每位好友的檢視偏好。 |
| `friendSpendingSummaryService` | `friendSpendingSummaryStateRef`, `isFriendSpendingSummaryReady`, `applyExpenseSummaryChange`, `rebuildFriendSpendingSummary`, `listenFriendSpendingSummary` | 建立或更新每日/分類支出摘要桶；expense create/update/delete transaction 在摘要已就緒時同步增減桶資料。 |
| `adminService` | `isAdmin`, `sendPasswordReset`, `getAllUsers`, `createUser`, `createUserMetadata`, `updateUserMetadata`, `deactivateUser`, `activateUser`, `deleteUserMetadata`, `getUserById` | 管理員與使用者 metadata；刪除 Auth 使用者會使用 Callable Function 路徑。 |
| 收據 OCR (`receiptOcrService`, `receiptOcrProviders`, `receiptOcrImage`) | `getReceiptOcrMode`, `setReceiptOcrMode`, `getReceiptOcrProviderLabel`, `getReceiptOcrModeLabel`, `parseReceiptText`, `recognizeReceiptText`, `compressReceiptImage`, `prepareReceiptImageForOcr`, `runPaddleReceiptOcr`, `runTesseractReceiptOcr`, `resetReceiptOcrServiceState` | 圖片壓縮/正規化 → PaddleOCR 或 Tesseract 辨識 → 解析金額、日期、商家、幣別、付款資訊及品項 → 表單草稿。 |
| `receiptDraftStore` (`utils/receiptDraftStore.ts`) | `createReceiptDraftId`, `loadReceiptDraft`, `loadLatestReceiptDraft`, `saveReceiptDraft`, `deleteReceiptDraft`, `cleanupReceiptDrafts`, `buildReceiptDraftImageName` | 在瀏覽器本機保存/恢復收據輸入草稿和圖片資料。 |
| 匯入匯出 (`utils/importExportUtils.ts`, `utils/exportUtils.ts`) | `downloadExpenseTemplate`, `exportToExcel`, `parseUploadedFile`, `matchCategories`, `importData`, `exportErrorsToCSV`, `exportToCSV`, `filterExpensesByDateRange` | CSV/Excel 匯出、讀取檔案、欄位/分類配對及逐筆匯入錯誤收集。 |

## 3. 關鍵流程

### 3.1 登入與主畫面載入

```text
Login → AuthContext.signup/login/loginWithGoogle
      → ensureUserMetadata(uid) → onAuthStateChanged
      → PrivateRoute → Dashboard
      → loadData() → sessionCache 快取先回畫面
                   → Firestore 背景 revalidate
                   → 套用 pending expense/budget queue → 更新 state/cache
```

登入支援 Email/Password 與 Google；Email 登入可選 browser session/local persistence，Google 登入固定 local persistence。認證只說明 Firebase 身份狀態；Firestore Rules 仍是資料授權依據。

### 3.2 新增支出

1. `handleAddExpense` 先呼叫 `expenseService.createId()`，建立固定 document ID，並立即更新 Dashboard state 和 `dataService` 快取。
2. `useOptimisticCRUD.run()` 呼叫 `expenseService.create(payload, { updateAccountBalances: true })`。
3. `expenseService.create` 將支出、銀行/電子錢包餘額增減，以及已啟用的朋友支出 summary 更新放進 Firestore transaction。
4. 成功後保留固定 ID、更新 pending 狀態並刷新資料/帳戶餘額；可辨識網路錯誤時，將同一 ID 和完整支出 payload 放入 `offlineQueue`，保留樂觀列項等待重播；其他失敗會 rollback 並標示建立失敗。
5. app queue 重播支出 create 時再次使用 `expenseService.create(..., { updateAccountBalances: true })`。固定 ID 和 create 的重複檢查避免同筆重播建立兩張支出。

### 3.3 編輯、刪除支出與關聯轉帳

- 編輯先更新 state/cache，再經 `withExpenseMutationLock` 串行執行；若該支出已有 pending queue 操作，會將後續變更追加為新操作。service transaction 會維護已啟用的朋友支出 summary。
- 刪除先從畫面移除，再經同一支出鎖處理。`deleteWithRelatedTransfers` 先讀支出/候選轉帳，檢查 userId、關聯與資料指紋，再以 transaction 回復帳戶餘額、刪除支出及明確連結的轉帳，並更新 summary。
- 舊轉帳若沒有 `expenseId`，Dashboard 會用日期、金額、付款方式提示可能有關聯；不會僅憑猜測自動刪除。
- 支出更新 service 目前未重新計算帳戶餘額；若修改金額或付款帳戶，會留下舊餘額。這是靜態檢查發現，列於第 4 節。

### 3.4 收入與帳戶餘額

新增收入先以 `resolveAmountCurrencyFields` 固定原幣、基準幣與匯率欄位，再樂觀加入列表並呼叫 `incomeService.create`。成功 callback 才呼叫 `balanceService.handleIncomeCreated`；刪除亦先刪收入，再由成功 callback 呼叫 `handleIncomeDeleted`。這些帳戶餘額更新與收入文件 CRUD 是分開寫入，且 `balanceService` 的直接更新 helper 會捕捉錯誤後只記錄 log。收入更新會重估幣別欄位，但沒有重新結算付款帳戶餘額。

### 3.5 轉帳

`handleAddTransfer` 先解析來源/目的幣別及換算欄位、產生固定 ID，再樂觀加入 state。`transferService.create` transaction 讀取可能關聯的 expense，驗證 owner 和連結，再同時寫 transfer、更新來源/目的 account balance、把 transfer ID 加進 expense。刪除時目前是先 `transferService.delete`，成功 callback 再執行 `balanceService.handleTransferDeleted`，非單一 transaction。

### 3.6 預算和整體限額

1. Dashboard 在新增/更新預算前嘗試伺服器讀取最新 budgets 和 user settings；讀取因離線失敗時使用畫面已有資料，預算 CRUD 可放入 budget queue。
2. `budgetAllocation.ts` 以預算幣別匯率換成 MYR minor units，檢查週期內個別預算配置是否超過整體限額；資料缺匯率時拒絕無法比較的操作。
3. `budgetService.create/update/delete` 呼叫 `runBudgetMutationTransaction`：伺服器端讀取 settings revision 前後快照和 budget 文件，在 Firestore transaction 驗證 revision 未變，再寫預算和配置 revision。`withBudgetMutationLock` 序列化同一 client 的 mutation。
4. app queue 重播 budget 亦使用 mutation lock 和 budget service；達重試上限時發出拒絕事件，Dashboard 重新讀伺服器資料或依 `previousBudget` rollback。
5. `setOverallBudgetLimit` 使用線上 server snapshot 與 transaction 驗證配置；離線時會回報失敗，沒有相同的 app queue fallback。

### 3.7 定期付款與付款紀錄

`ScheduledPaymentManager` 管理 `scheduledPayments` 和 `scheduledPaymentRecords`。確認付款時先解析實際金額的匯率並新增 payment record；只有該寫入的成功 callback 才會按 `autoGenerateExpense` 建立支出，因此 payment record 與產生支出是前後兩次動作，不是同一 transaction。目前它們呼叫 `useOptimisticCRUD` 時誤用 `entityType: 'recurring'`；app queue 重播會走舊 `recurringExpenseService`，不會呼叫 `scheduledPaymentService`。細節列於下一節。

### 3.8 幣別、收據、好友、匯入匯出

- 金額保存原始 `amount/currency` 及 `baseAmount/baseCurrency/exchangeRate*` 快照；`currencyRateService.getHistoricalRate` 先查本機 rate cache，否則取歷史匯率，換算使用相同交易日期。帳戶餘額再以帳戶自己的幣別換算。
- OCR 的 `recognizeReceiptText` 依模式呼叫 PaddleOCR、Tesseract 或 compare；`parseReceiptText` 解析結果回到支出表單。收據草稿和圖片資料由 `receiptDraftStore` 保存在瀏覽器本機，與 Firebase 支出保存分開。
- 好友分享先建立雙方 connection/request 狀態並維持各自分享選擇；支出摘要依授權按日/分類彙總，不以好友端即時掃描完整 expense collection。摘要未 ready 時需先 `rebuildFriendSpendingSummary`。
- CSV/Excel 匯入匯出由 `importExportUtils`/`exportUtils` 處理檔案與欄位；匯入每筆寫入仍需遵守所選資料 service 的驗證與權限。

## 4. main@a9a9d7c 的離線路徑核對

以下是 `main@a9a9d7c` 的 source-level 概況，不代表每個 mutation handler 已逐一完成端到端驗收：

| 區域 | main source 現況 | 核對邊界 |
|---|---|---|
| 持久佇列 | `offlineQueue` 經 `indexedDbOutbox` 存取 IndexedDB；舊 localStorage queue 有初始化遷移；enqueue、claim、retry、complete 都是非同步操作。 | IndexedDB outbox 與 Firestore SDK IndexedDB pending writes 是不同資料。 |
| 本機先接受 | `writeLocalFirst` / `writeLocalFirstBatch` 驗證 owner 和固定 ID，等待 `enqueueMany` 成功後更新應用快取，並把持久佇列交給背景 sync。 | 僅直接經這些 helper 或已正確串接的 handler 才能依此描述；hook 有 `entityType` 和 queue 設定條件。 |
| Replay | `syncService` 使用 `claimNext`、lease/fencing、entity 專屬 executor 及 `fail/complete`；目前有 Scheduled Payment、Payment Record、Income、Transfer、Feature Settings 等 executor。 | 每個 executor 的 payload、交易副作用及拒絕回復應和對應 Dashboard handler 一起檢查。 |
| 重試與狀態 | `offlineQueue` 的 `MAX_RETRY` 為 5；到達上限後 operation 保留為 `needs-attention`，可透過重試入口處理。 | Budget 驗證拒絕可能走 entity 專用回復；不要概括所有永久錯誤都採相同 rollback。 |
| 狀態訂閱 | `useSyncStatus` 訂閱 queue/sync/network events，不靠定時掃 storage 更新 pending count。 | UI 顯示的 app queue 數量不包含 SDK 自行同步的寫入。 |

較早的 2026-10-17 來源檢查列過部分 payload/entity 缺口，已不再作為目前 main 的結論；實作要點已改以當前 `Dashboard.tsx`、`useOptimisticCRUD.ts`、`localFirstMutation.ts`、`offlineQueue.ts` 和 `syncService.ts` 為準。財務交易、帳戶餘額及所有 handler 的延遲/離線/拒絕/replay 行為仍需相應測試證據，本文件沒有執行這些測試。

## 5. 未接入主流程的舊實作

- `utils/offlineSyncManager.ts` / `hooks/useOfflineSync.ts` 有另一組 sync API，但 `useOfflineSync` 未由 Dashboard/目前頁面掛載，且全 workspace 沒有 `setOperationExecutor` 的實際注入；不要把此 manager 的 30 秒週期同步描述為目前 app queue 流程。
- `services/dataCacheService.ts` 仍存在，但目前功能資料載入使用 `dataService` + `sessionCache`；它不是目前主要快取入口。
- `offlineQueue.processQueue()` 存在於 API，但目前 `syncService` 使用自己的逐 entity executor/重試處理，沒有呼叫它。
- `recurringExpenseService` 與 `components/recurring/` 保留舊式 recurring expense model；目前 Recurring 主頁籤掛載的是 `ScheduledPaymentManager`。

## 6. 主要來源檔案

- 啟動/路由：`web/src/main.tsx`, `web/src/App.tsx`, `web/src/components/PrivateRoute.tsx`
- 狀態/讀取：`web/src/pages/Dashboard.tsx`, `web/src/services/dataService.ts`, `web/src/utils/sessionCache.ts`
- 離線：`web/src/config/firebase.ts`, `web/src/utils/offlineQueue.ts`, `web/src/utils/networkStatus.ts`, `web/src/services/syncService.ts`, `web/src/hooks/useOptimisticCRUD.ts`
- 金額/交易：`web/src/services/expenseService.ts`, `incomeService.ts`, `transferService.ts`, `balanceService.ts`, `budgetService.ts`, `web/src/utils/budgetMutationTransaction.ts`
- 權限/伺服器：`web/firestore.rules`, `web/functions/`
