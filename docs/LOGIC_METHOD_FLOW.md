# 主要 Method 與端到端流程

> 靜態核對範圍：`web/src`、Firestore rules 與 Functions。文件描述目前程式行為，包含 app queue 與 Firestore SDK 離線持久化兩條不同路徑。最後核對：2026-10-17。此文件記錄程式碼檢查結果；本次沒有執行測試或 Firebase 實機同步。

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
| `ThemeContext`, `LanguageContext`, `NotificationContext`, `PWAContext`, `UserSettingsContext` | `useTheme`, `useLanguage`, `useNotification`, `usePWA`, `useUserSettings` | 共用主題/字體、語言翻譯、通知佇列、PWA 安裝/更新狀態和使用者偏好；Provider 在 `App.tsx` 組合。 |
| `useNetworkStatus` (`hooks/useNetworkStatus.ts`) | 回傳 `networkStatus.isOnline` 並訂閱 online/offline | React 元件取得 browser 網路狀態。 |
| 共用 UI hooks | `useCurrencyConversionMapState`, `useCurrencyConversionMap`, `useMultiSelect`, `useLongPress`, `useTouchReorder`, `useToday` | 提供跨頁的多幣別轉換資料、選取、長按/觸控排序與本地日期；不直接存取 Firebase。 |

| Service / Hook | 主要 methods | 用途 |
|---|---|---|
| `dataService` (`services/dataService.ts`) | `getExpenses`, `getCategories`, `getBudgets`, `getRecurringExpenses`, `getIncomes`, `getCards`, `getEWallets`, `getBanks`, `getRepayments`, `getData`, `getDataWithRevalidate`, `areDataEqual`, `updateCache`, `invalidateCache`, `clearUserCache` | 以 `sessionCache` 支援快取讀取、離線回退及 stale-while-revalidate。Dashboard 初始讀取直接使用 `getDataWithRevalidate`。 |
| `sessionCache` (`utils/sessionCache.ts`) | `set`, `get`, `getMetadata`, `has`, `remove`, `clearUser`, `clearAll`, `clearOldCaches`, `getCacheSize` | 以 userId/entity key 保存 app 快取；set 寫入 sessionStorage 並盡力複製到 localStorage。localStorage 快取讀取時檢查 24 小時 TTL。 |
| `networkStatus` (`utils/networkStatus.ts`) | `isOnline`, `subscribe`, `testConnectivity`, `destroy` | 監聽瀏覽器 `online`/`offline` 事件並通知訂閱者。它表示瀏覽器網路狀態，不保證 Firebase 權限或服務可用。 |
| `offlineQueue` (`utils/offlineQueue.ts`) | `enqueue`, `getAll`, `count`, `save`, `dequeue`, `incrementRetry`, `retry`, `retryExpenseOperationsForId`, `updatePayload`, `hasPendingExpenseOperations`, `hasPendingExpenseDelete`, `hasPendingBudgetOperations`, `removeBudgetOperationsForId`, `clear`, `processQueue` | `localStorage` app outbox；操作類型為 create/update/delete，最多重試 3 次。不同 entity 的終止策略不同，見 [離線同步架構](OFFLINE_SYNC_ARCHITECTURE.md)。 |
| `syncService` (`services/syncService.ts`) | `onSyncProgress`, `setAutoSync`, `isSyncInProgress`, `pendingCount`, `syncOfflineQueue`, `refreshCache`, `refreshAllCaches` | app queue 協調器。網路恢復且 auto-sync 開啟時延遲 1 秒執行；也由狀態元件手動觸發。 |
| `useSyncStatus` (`hooks/useSyncStatus.ts`) | `syncProgress`, `isSyncing`, `pendingCount`, `syncNow` | `NetworkStatusIndicator` 使用的 React adapter；每秒更新佇列/同步數量並暴露手動同步。 |
| `useOptimisticCRUD` (`hooks/useOptimisticCRUD.ts`) | `run`, `isPending`, `getPendingOperation`, `pendingCount` | 先登記 UI pending 狀態，再呼叫 service；錯誤依 error code 判斷是否放入 app queue，否則顯示重試/儲存離線操作並呼叫 rollback callback。 |

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

### 跨功能 domain / utility methods

這些函式集中純計算、驗證與共用 mutation 保護；它們不取代各領域 service 的 Firestore 權限及寫入責任。

| 模組 | 主要 methods | 邏輯 |
|---|---|---|
| `domain/money.ts`, `utils/currencyUtils.ts` | `parseCurrencyCode`, `requireCurrencyCode`, `roundMoney`, `toMinorUnits`, `fromMinorUnits`, `convertWithSnapshot`, `getCurrencyBaseAmount`, `getExpenseDisplaySource`, `buildExpenseCurrencyFields` | 金額精度、minor units、匯率快照換算、原幣/基準幣欄位與顯示來源。 |
| `utils/budgetAllocation.ts`, `budgetCurrencyUtils.ts` | `getAllocatedBudgetMinorUnits`, `validateOverallBudgetLimit`, `validateBudgetAllocationChange`, `validateBudgetAllocationBatch`, `toBudgetBaseAmount`, `convertBudgetAmount` | 將各幣別預算正規化至基準幣 minor units，驗證單筆或批次配置不超整體限額。 |
| `utils/budgetMutationLock.ts`, `budgetMutationTransaction.ts` | `withBudgetMutationLock`, `runBudgetMutationTransaction` | 同一 client 序列化預算變更；transaction 讀取伺服器快照、確認 settings revision 未變後才提交。 |
| `utils/budgetRollover.ts`, `budgetNotifications.ts` | `getBillingCyclePeriod`, `getPreviousBillingCyclePeriod`, `calculateSpentInPeriod`, `calculateRolloverAmount`, `shouldCalculateRollover`, `getEffectiveBudgetAmount`, `calculateBudgetPeriod`, `calculateBudgetSpending`, `checkBudgetAlerts`, `getBudgetSummary` | 依帳單週期計算支出、結轉額及預算提醒。 |
| `utils/budgetAnalysis.ts`, `budgetSuggestions.ts`, `budgetTemplates.ts` | `getSpendingHistory`, `analyzeBudget`, `getAllBudgetSuggestions`, `calculateBudgetSuggestions`, `getAllTemplates`, `calculateBudgetsFromTemplate` | 從歷史支出分析配置、提出建議並把模板轉成 budget input。 |
| `utils/dateUtils.ts`, `expensePeriodUtils.ts` | `getTodayLocal`, `formatDateLocal`, `formatDateWithUserFormat`, `getExpensePeriodBounds`, `filterExpensesByPeriod`, `filterAndSortExpenses` | 本地日期格式、週期邊界及支出期間篩選/排序；日期範圍採本地日曆語意。 |
| `utils/cardUtils.ts`, `categoryOrder.ts` | `getCurrentBillingCycle`, `getNextBillingDate`, `calculateCurrentCycleSpending`, `calculateRuleCashback`, `calculateCardStats`, `sortCategories`, `getRecentlyUsedCategories` | 信用卡帳單週期/消費與回饋統計、分類排序和常用分類排序。 |
| `utils/expenseMutationLock.ts` | `withExpenseMutationLock`, `markExpenseCreateFailed`, `markExpenseDeleted` 及對應查詢/清除方法 | 同一 expense 的 create/update/delete 排隊，並記錄待補救的失敗或刪除狀態。 |
| `utils/recurringUtils.ts`, `friendSpendingUtils.ts` | `getNextDueDate`, `isDueToday`, `shouldShowDueNotification`, `getDueRecurringExpenses`, `getFriendSpendingDateRange`, `presentFriendSpending` | 舊 recurring model 的到期判斷；將好友摘要整理成畫面區間和呈現資料。 |

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

## 4. 靜態邏輯檢查發現

以下是目前程式路徑中可由 source 確認的差異；本次只整理與記錄，沒有改動應用程式邏輯。

| 優先 | 發現 | 影響位置與結果 |
|---|---|---|
| 高 | Scheduled Payment/Payment Record 把 `entityType` 設成 `recurring`。 | `Dashboard.tsx` 的定期付款建立/更新/刪除、付款紀錄建立/刪除都放入 app queue 後，`syncService.executeRecurringOperation()` 呼叫 `recurringExpenseService`，目標是舊 `recurringExpenses`，不是 `scheduledPayments`/`scheduledPaymentRecords`。更新 payload 還缺 id；線上失敗後重播可能失敗、刪錯同 ID 舊文件或操作被移除。付款紀錄重播也不會觸發 `autoGenerateExpense` callback。 |
| 高 | Income 的 app queue payload 未保留必要的完整 service 輸入。 | Dashboard 將不含 `userId` 的新增資料和不含 `id` 的更新資料交給 `useOptimisticCRUD`；`syncService` 直接以 payload 呼叫 `incomeService`。離線新增可能缺 owner 而無法由 userId 查回，更新則因沒有 id 而無法執行。重播也不會呼叫 Dashboard 的餘額成功 callback；刪除重播同樣不會回復帳戶餘額。非 expense operation 達三次重試後會從 app queue 移除。 |
| 高 | Category app queue 也有 payload 不完整。 | 新增 queue payload 不含 `userId`；更新 payload 不含 `id`。重播新增可能成為無 owner 文件/遭 Rules 拒絕，更新會被 executor 略過並在重試上限移除。 |
| 高 | Card/Bank/E-Wallet app queue 的新增/更新 payload 也未按 executor 需要正規化。 | 新增 payload 沒有 `userId`；Bank/Card 更新 payload 沒有 `id`；E-Wallet 更新 payload 是 `{ id, updates }`，executor 卻把整個 payload 傳給 `ewalletService.update()`。這些操作可能被 Rules 拒絕、更新失敗或寫入錯誤欄位，非 expense entity 達三次重試後會移除。 |
| 高 | Feature Settings 將 queue entity 錯標為 `budget`。 | payload 沒有 budget 所需的 `userId` 和 budget id；`syncService` 會跳過該 operation 而不消耗重試，佇列項目會持續留下，且不會呼叫 `featureSettingsService`。 |
| 高 | 支出編輯未同步重算 bank/e-wallet balance。 | UI 可經 `StepByStepExpenseForm` 傳入支出欄位變更，但 `expenseService.update` 只更新 expense/summary；沒有對舊帳戶做反向調整並對新值套用新調整。金額或付款帳戶被編輯時，帳戶餘額會與支出紀錄不一致。 |
| 中 | 轉帳 fallback 未接入 app queue，刪除與餘額回復也分開寫。 | create/delete 只設 `retryToQueueOnFail`，未傳 `entityType`，且 `transfer` 不在 `offlineQueue` entity union，因此 hook 不會建立 app queue 操作或顯示 app queue 的「儲存離線」動作。Firestore SDK 自己的持久快取仍是另一條路徑。delete 成功後餘額才另外更新，更新失敗不會復原 transfer delete。 |
| 中 | 其餘 entity 操作重試達三次會直接從 app queue 移除。 | `offlineQueue.incrementRetry()` 對 expense 設 `needs-attention`，budget 走拒絕/回滾通知；category、income、recurring、card、bank、ewallet、repayment 則會移除。需要新增一致的可見失敗/保留資料策略。 |
| 中 | 漢堡選單的「重新上傳」按鈕沒有呼叫 app queue sync。 | `Dashboard.tsx` 此按鈕將 queue count 暫設為 0 後呼叫 `loadData()`，並顯示成功訊息；只有 network status event 或頁首 `NetworkStatusIndicator.syncNow()` 會直接呼叫 `syncService.syncOfflineQueue()`。 |
| 中 | 清除 app queue 沒有確認步驟。 | `handleClearOfflineQueue()` 直接呼叫 `offlineQueue.clear()` 並顯示成功訊息；操作會一次刪掉所有 app queue 項目。 |

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
