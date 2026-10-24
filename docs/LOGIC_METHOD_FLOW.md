# 主要 Method 與端到端流程

> 核對範圍：`web/src`、Firestore rules 與 Functions；app source 基準 `f864ecda8d28ebf45225d2b6aba15801b52ba872`（後續 `7332790` 僅更新文件）。文件描述目前程式行為，包含 app queue 與 Firestore SDK 離線持久化兩條不同路徑。最後靜態核對：2026-10-25。已記錄的測試、build 與 lint 證據見 `LOCAL_FIRST_ACCEPTANCE.md`；本次文件更新未重跑應用程式測試或正式 Firebase 同步。

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
| `offlineQueue` (`utils/offlineQueue.ts`) | `initialize`, `getAll`, `count`, `enqueue`, `enqueueMany`, `claimNext`, `renew`, `complete`, `release`, `fail`, `retry`, `recoverAmbiguous`, `rebaseExpenseUpdateChain`, `discardExpenseUpdateChain`, `clear` | IndexedDB app outbox；交易式跨分頁 lease/fencing，依帳戶順序及 operation dependency claim。同步失敗最多 5 次後保留並標為 `needs-attention`；Budget 驗證拒絕另走專用回復流程。 |
| `syncService` (`services/syncService.ts`) | `onSyncProgress`, `isSyncInProgress`, `pendingCount`, `syncOfflineQueue`, `refreshCache`, `refreshAllCaches` | 唯一 app queue executor。網路恢復、登入、queue 變更時安排同步；狀態元件也可手動觸發。 |
| `useSyncStatus` (`hooks/useSyncStatus.ts`) | `syncProgress`, `isSyncing`, `pendingCount`, `syncNow` | `NetworkStatusIndicator` 使用的 React adapter；初始讀值後訂閱 sync progress、queue change 與 online/offline 事件，不以週期性 storage polling 更新。 |
| `useOptimisticCRUD` (`hooks/useOptimisticCRUD.ts`) | `run`, `isPending`, `getPendingOperation`, `pendingCount` | 先登記 UI pending 狀態、保存 durable queue，再呼叫 service；網路錯誤保留 queue，永久錯誤呼叫 rollback callback。 |

### 財務紀錄、帳戶與預算

| Service | Methods | 責任 |
|---|---|---|
| `expenseService` | `createId`, `create`, `getAll`, `getAllFromServer`, `update`, `delete`, `deleteWithRelatedTransfers`, `getByDateRange`, `getByCategory` | 支出 CRUD、服務端讀取及刪除時辨認/清理已連結轉帳。create/update/delete 的帳戶餘額及可用的朋友支出摘要在 transaction 內調整。 |
| `incomeService` | `createId`, `create`, `getAll`, `getByDateRange`, `getByExpenseId`, `update`, `delete` | 收入 CRUD 與關聯/日期查詢；新增、編輯、刪除和付款帳戶餘額在同一 transaction 處理，queue 重播不依賴 UI callback。 |
| `transferService` | `createId`, `create`, `getAll`, `update`, `delete`, `deleteWithBalanceReversal`, `getByDateRange` | 轉帳 CRUD；建立和刪除會在 transaction 同步調整來源/目的帳戶餘額及支出關聯。 |
| `repaymentService` | `createId`, `create`, `getAll`, `getByExpenseId`, `update`, `delete`, `getTotalRepaidForExpense` | 還款紀錄 CRUD、依支出查詢及金額加總。主 Dashboard 還款清單支援本機先更新與 queue 重播。 |
| `categoryService` | `initializeDefaults`, `create`, `getAll`, `updateOrder`, `update`, `delete` | 初始化預設分類、分類 CRUD 與排序。 |
| `budgetService` | `createId`, `create`, `getAll`, `update`, `delete`, `getByCategory` | 預算 CRUD；create/update/delete 走 `runBudgetMutationTransaction`，以伺服器最新預算及設定檢查整體配置。 |
| `bankService` | `create`, `getAll`, `update`, `delete`, `getById`, `updateBalance` | 銀行帳戶 CRUD 與餘額更新。 |
| `ewalletService` | `initializeDefaults`, `create`, `getAll`, `search`, `update`, `delete`, `getById`, `updateBalance`, `findByName` | 電子錢包 CRUD、預設項目初始化、依名稱/條件找錢包及餘額更新。 |
| `cardService` | `create`, `getAll`, `update`, `delete` | 信用卡 CRUD；帳單週期/回饋統計主要由 utility 計算。 |
| `balanceService` | `prepareBalanceAdjustments`, `applyBalanceAdjustmentsInTransaction`, `handleExpenseCreated/Deleted`, `handleIncomeCreated/Deleted`, `handleTransferCreated/Deleted`, `updateBalanceForExpense/Income/TransferSource/TransferDestination` | 依付款帳戶幣別換算增減額；transaction helper 驗證帳戶所有權及幣別後以 increment 更新。部分舊式 `handle*` 會直接更新帳戶，並捕捉錯誤只寫 log。 |

### 設定、排程、匯率與其他領域

| Service | Methods | 責任 |
|---|---|---|
| `scheduledPaymentService` | `calculateInstallmentAmount`, `calculateRemainingAmount`, `createId`, `create`, `getAll`, `getActive`, `update`, `delete`, `toggleActive`, `markCompleted`, `createPaymentRecordId`, `createPaymentRecord`, `getPaymentRecords`, `getAllPaymentRecords`, `updatePaymentRecord`, `deletePaymentRecord`, `getPaymentSummary`, `isPeriodPaid`, `getPendingPayments`, `exportPaymentHistoryToCSV`, `downloadPaymentHistoryCSV`, `getUpcomingReminders` | 定期付款計劃與付款紀錄、期別付款狀態、分析/提醒及 CSV 匯出。record create 使用固定 ID；開啟自動生成支出時，record queue 帶同可冪等重播的 expense payload。 |
| `recurringExpenseService` | `create`, `getAll`, `getActive`, `update`, `delete`, `toggleActive` | 舊式 `recurringExpenses` 資料服務；其 `RecurringExpenseManager`/`RecurringTab` 不在目前 Dashboard 掛載流程。 |
| `userSettingsService` | `get`, `create`, `update`, `setOverallBudgetLimit`, `setIncomeLinkedBudget`, `getOrCreate` | 一般偏好樂觀更新並可排隊同步；整體預算限額和收入連動模式切換使用伺服器配置 transaction 驗證。部分讀取可指定強制伺服器讀取。 |
| `featureSettingsService` | `getOrCreate`, `update`, `resetToDefaults` | 主頁籤與選單功能偏好。 |
| `dashboardLayoutService` | `get`, `fetchFromFirebase`, `getOrCreate`, `update`, `updateWidgets`, `toggleWidget`, `reorderWidgets`, `resetToDefault`, `updateColumns` | Dashboard Widget 顯示、順序及欄數配置；編輯先更新本機 state，網路錯誤可由 `dashboardLayout` queue 重播。 |
| `currencyRateService` | `getHistoricalRate`, `convertAmountToCurrency`, `resolveAmountCurrencyFields`, `resolveExpenseCurrencyFields` | 取歷史匯率、快取匯率、計算原幣/基準幣欄位；對外提供 `currencyRateService` object。 |
| `quickExpenseService` | `createId`, `getPresets`, `create`, `update`, `delete`, `updateOrder` | 快速支出預設 CRUD 與排序；Widget 和支出清單使用同一 queue entity，快速新增最後呼叫 Dashboard 支出建立流程。 |
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
| `utils/incomeLinkedBudget.ts`, `services/incomeBudgetData.ts`, `hooks/useIncomeBudget.ts` | `incomeBudgetRange`, `calculateIncomeFunding`, `validIncomeLink`, `allocationLimitsForSettings`, `readIncomeBudgetCycle`, `useIncomeBudget` | 以帳單週期完整收入快照與 pending operations 計算月收入支持額度；資料不完整、無效匯率或設定錯誤時保留狀態，不把不完整列表當成完整收入。詳細收入資格及金額規則見 `INCOME_BUDGET_LINK_PLAN.md`。 |
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
2. `useOptimisticCRUD.run()` 先透過 `writeLocalFirst()` 保存完整操作，再呼叫 `expenseService.create(payload, { updateAccountBalances: true })`。已知離線或已有前序操作時只保存 queue，不等待 SDK 寫入 Promise。
3. `expenseService.create` 將支出、銀行/電子錢包餘額增減，以及已啟用的朋友支出 summary 更新放進 Firestore transaction。
4. 成功後移除已保存的 queue 項目、保留固定 ID、更新 pending 狀態並刷新資料/帳戶餘額；可辨識網路錯誤時保留同一 queue 項目等待重播；其他失敗移除失敗操作並 rollback，標示建立失敗。
5. app queue 重播支出 create 時再次使用 `expenseService.create(..., { updateAccountBalances: true })`。固定 ID 和 create 的重複檢查避免同筆重播建立兩張支出。

### 3.3 編輯、刪除支出與關聯轉帳

- 編輯先更新 state/cache，再經 `withExpenseMutationLock` 串行執行；若該支出已有 pending queue 操作，會將後續變更追加為新操作。service transaction 會維護已啟用的朋友支出 summary。
- 刪除先從畫面移除，再經同一支出鎖處理。`deleteWithRelatedTransfers` 先讀支出/候選轉帳，檢查 userId、關聯與資料指紋，再以 transaction 回復帳戶餘額、刪除支出及明確連結的轉帳，並更新 summary。
- 舊轉帳若沒有 `expenseId`，Dashboard 會用日期、金額、付款方式提示可能有關聯；不會僅憑猜測自動刪除。
- 支出更新會在同一 transaction 先依舊支出回復原帳戶，再依更新後支出套用新帳戶增減，並維護好友支出摘要。

### 3.4 收入與帳戶餘額

新增收入先以 `resolveAmountCurrencyFields` 固定原幣、基準幣與匯率欄位，再產生固定 ID、樂觀加入列表並呼叫 `incomeService.create`。income service 的 create/update/delete 以 transaction 同時更新收入文件與付款帳戶餘額；queue 重播會再次呼叫相同領域 service，不依賴 Dashboard 成功 callback。網路失敗時以完整 payload 排隊；永久失敗時回復列表。

### 3.5 轉帳

`handleAddTransfer` 先產生固定 ID 並把輸入轉帳立即顯示，再解析來源/目的匯率快照、更新樂觀資料並保存。`transferService.create` transaction 驗證可能關聯的 expense owner/連結，同時寫 transfer、更新來源/目的 account balance、把 transfer ID 加進 expense。刪除呼叫 `deleteWithBalanceReversal`，在 transaction 回復餘額後刪除轉帳。

### 3.6 預算和整體限額

1. Dashboard 在新增/更新預算前嘗試伺服器讀取最新 budgets 和 user settings；讀取因離線失敗時使用畫面已有資料，預算 CRUD 可放入 budget queue。
2. `budgetAllocation.ts` 以預算幣別匯率換成 MYR minor units，檢查週期內個別預算配置是否超過整體限額；資料缺匯率時拒絕無法比較的操作。
3. `budgetService.create/update/delete` 呼叫 `runBudgetMutationTransaction`：伺服器端讀取 settings revision 前後快照和 budget 文件，在 Firestore transaction 驗證 revision 未變，再寫預算和配置 revision。`withBudgetMutationLock` 序列化同一 client 的 mutation。
4. app queue 重播 budget 亦使用 mutation lock 和 budget service；達重試上限時發出拒絕事件，Dashboard 重新讀伺服器資料或依 `previousBudget` rollback。
5. `setOverallBudgetLimit` 使用線上 server snapshot 與 transaction 驗證配置；離線時會回報失敗，沒有相同的 app queue fallback。

收入連動月預算由 `IncomeBudgetSettingsModal`、`UserSettingsContext.setIncomeLinkedBudget`、`userSettingsService.setIncomeLinkedBudget`、`readIncomeBudgetCycle` 和 `useIncomeBudget` 串接。設定以 userSettings mutation 保存至 IndexedDB outbox，遠端模式切換仍由預算配置 transaction 驗證；收入來源、完整帳期、匯率和還款去重規則見 `INCOME_BUDGET_LINK_PLAN.md`。Dashboard 與 BudgetManager 共用收入支持額度計算，不將衍生額度寫回手動月上限。

### 3.7 定期付款與付款紀錄

`ScheduledPaymentManager` 管理 `scheduledPayments` 和 `scheduledPaymentRecords`。確認付款先以固定 ID 建立本機 provisional record，解析匯率快照後把 record 與可選的固定 ID 自動生成 expense payload 一起保存至 `scheduledPaymentRecord` outbox。`scheduledPaymentService.createPaymentRecord` 在同一個 `runFinancialTransaction` 中驗證付款計畫、既有 record/expense、套用帳戶餘額和朋友摘要、建立 expense、建立或修復 record，並原子寫入 mutation receipt。摘要與本期已付款判斷立即使用本機 record；重播使用原固定 ID。只有舊版已部分提交的 record 會進入既有連結修復分支；目前 handler 的新付款路徑不會分兩個 Firestore transaction 提交。

### 3.8 幣別、收據、好友、匯入匯出

- 金額保存原始 `amount/currency` 及 `baseAmount/baseCurrency/exchangeRate*` 快照；`currencyRateService.getHistoricalRate` 先查本機 rate cache，否則取歷史匯率，換算使用相同交易日期。帳戶餘額再以帳戶自己的幣別換算。
- OCR 的 `recognizeReceiptText` 依模式呼叫 PaddleOCR、Tesseract 或 compare；`parseReceiptText` 解析結果回到支出表單。收據草稿和圖片資料由 `receiptDraftStore` 保存在瀏覽器本機，與 Firebase 支出保存分開。
- 好友分享先建立雙方 connection/request 狀態並維持各自分享選擇；支出摘要依授權按日/分類彙總，不以好友端即時掃描完整 expense collection。摘要未 ready 時需先 `rebuildFriendSpendingSummary`。
- CSV/Excel 匯入匯出由 `importExportUtils`/`exportUtils` 處理檔案與欄位；匯入顯示逐列進度及部分成功/失敗，可重試網路錯誤的 category/expense 以固定 ID 入 queue，完成時 Dashboard 套用 pending category/expense。

## 4. 本次一致化內容與邊界

| 項目 | 已落實的行為 |
|---|---|
| 本機先顯示 | 一般資料變更及偏好先更新本機 state/cache，完整 owner/ID/payload 在呼叫 Firebase 前保存；同步成功後依 outbox claim/complete 移除操作並發事件刷新受影響資料。 |
| Queue 路由 | 所有已接入的本機優先操作使用共用 IndexedDB outbox 與唯一 `syncService` executor；失敗最多 5 次後保留 `needs-attention`，Budget 驗證拒絕走專用回復。 |
| 財務交易 | expense/income/transfer service 在同一 transaction 維護相關帳戶餘額；scheduled payment record、可選的生成 expense、帳戶餘額、摘要與 receipt 也在同一 transaction。支出編輯先反向調整舊付款資料，再套用新值。 |
| 手動同步 | 頁首和漢堡選單都呼叫 `syncOfflineQueue()`，並依 queue 剩餘數量顯示結果。 |

仍有明確邊界：整體預算限額必須線上 transaction 驗證；多幣別資料缺少交易日匯率快照時，不能保存未換算金額；管理員與跨使用者好友權限異動依賴伺服器確認。`scheduledPaymentRecord` 與可選自動支出在目前付款 handler 由同一 transaction 提交；舊版部分提交的 record 另有 idempotent repair 路徑。清除 app queue 仍會永久丟棄所有本機待同步操作。

## 5. 未接入主流程的舊實作

- `utils/offlineSyncManager.ts` / `hooks/useOfflineSync.ts` 有另一組 sync API，但 `useOfflineSync` 未由 Dashboard/目前頁面掛載，且全 workspace 沒有 `setOperationExecutor` 的實際注入；不要把此 manager 的 30 秒週期同步描述為目前 app queue 流程。
- `services/dataCacheService.ts` 仍存在，但目前功能資料載入使用 `dataService` + `sessionCache`；它不是目前主要快取入口。
- `offlineQueue.processQueue()` 存在於 API，但目前 `syncService` 使用自己的逐 entity executor/重試處理，沒有呼叫它。
- `recurringExpenseService` 與 `components/recurring/` 保留舊式 recurring expense model；目前 Recurring 主頁籤掛載的是 `ScheduledPaymentManager`。
- `components/repayment/RepaymentManager.tsx` 保留超額還款對帳 Income 的舊多步寫入流程，未接入主 Dashboard 還款清單；重新啟用前需將對帳改成可重試的領域工作流程。

## 6. 主要來源檔案

- 啟動/路由：`web/src/main.tsx`, `web/src/App.tsx`, `web/src/components/PrivateRoute.tsx`
- 狀態/讀取：`web/src/pages/Dashboard.tsx`, `web/src/services/dataService.ts`, `web/src/utils/sessionCache.ts`
- 離線：`web/src/config/firebase.ts`, `web/src/utils/offlineQueue.ts`, `web/src/utils/networkStatus.ts`, `web/src/services/syncService.ts`, `web/src/hooks/useOptimisticCRUD.ts`
- 金額/交易：`web/src/services/expenseService.ts`, `incomeService.ts`, `transferService.ts`, `balanceService.ts`, `budgetService.ts`, `web/src/utils/budgetMutationTransaction.ts`
- 權限/伺服器：`web/firestore.rules`, `web/functions/`

## 7. 共用本機保存與讀取防護

- `utils/localFirstMutation.ts`：`writeLocalFirst`, `writeLocalFirstBatch`, `getQueuedWriteId`, `isLocalWriteActive`；先持久化操作，已知離線時結束本機提交，線上成功才 dequeue，永久失敗則回復快取並交由 UI rollback。
- `utils/pendingOperations.ts`：`applyPendingOperations`, `cacheEntityFor`；涵蓋全部 collection 與偏好 singleton，並將待確認排程付款中的自動支出投影到支出清單。
- `dataService`、設定/layout/preference services 會保護讀取開始後新增的本機變更；Dashboard 與各功能元件不再讓舊 props 或背景回應移除待同步資料。
- `syncService` 按帳戶保存的順序重播，等待直接寫入完成；較早操作未成功時保留後續操作，不會先執行依賴的編輯或刪除。
- 逐功能對照與實際測試範圍見 [`LOCAL_FIRST_ACCEPTANCE.md`](LOCAL_FIRST_ACCEPTANCE.md)。
