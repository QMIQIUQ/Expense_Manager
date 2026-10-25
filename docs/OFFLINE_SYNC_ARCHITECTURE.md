# 本機優先與 Firebase 同步架構

> 本文件定義所有一般使用者資料異動的必要行為，並對照目前程式路徑。程式碼基準：`main@a9a9d7c`（2026-10-25）。各功能 handler 是否完整遵守契約仍須依實際 payload、service 與 executor 檢查；摘要見 [主要 Method 流程](LOGIC_METHOD_FLOW.md)。

## 1. 必要原則

所有一般使用者資料的新增、編輯、刪除與排序，都必須先反映在目前畫面及應用快取。完整操作在呼叫 Firebase 前就必須保存到 durable app queue；成功同步後才移除。網路錯誤保留操作與樂觀結果；永久錯誤或無法保存 queue 時必須回復原狀並清楚告知使用者。此規則也已加入根目錄 `AGENTS.md`，適用於後續新功能。

新增操作使用先產生的固定 document ID，並將同一 ID 用於 UI、queue 和 Firebase。這可讓重播保持冪等，避免重試時產生重複資料。交易型副作用（例如支出/收入/轉帳與帳戶餘額）必須和主文件一起在 Firestore transaction 中處理，不可只依賴 Dashboard 成功 callback。

```text
使用者送出
  → 立刻更新 React state / 本機資料快取
  → writeLocalFirst / writeLocalFirstBatch：將完整 owner / ID / payload 保存到 IndexedDB outbox
      ├─ 已知離線或前面還有未完成寫入：本機接受，保留 queue，立即解除等待
      ├─ 線上：領域 service 成功後移除 queue，校正相關畫面/餘額
      ├─ 可重試網路錯誤：保留已保存的 queue 與樂觀結果
      └─ 永久錯誤或 queue 寫入失敗：回復樂觀結果並顯示錯誤
  → 網路恢復或使用者手動同步
      → 依序重播對應 entity service
      → 成功後移除 queue 項目、發出同步事件、重新載入伺服器資料
```

資料輸入需要先完成的驗證或換算（例如歷史匯率快照）可在送出流程中先執行；一旦資料已具備寫入條件，畫面更新不得再等待 Firestore Promise。表單應在本機結果已套用後即可結束或回到可用狀態。

## 2. 本機資料與 Firebase SDK 快取

應用有三種不同的本機狀態，彼此不可混為「已同步」：

| 機制 | 實作 | 用途 |
|---|---|---|
| React state | Dashboard、各功能元件及 `UserSettingsContext` | 讓本次操作立即反映在畫面。 |
| 應用資料快取 | `dataService`、`sessionCache`（sessionStorage，並可選擇性複製到 localStorage） | 先顯示近期讀取資料，並在重新整理時支援應用層離線讀取。持久副本有 24 小時 TTL；localStorage 容量不足時副本可能無法保存。 |
| Firestore SDK 快取 | `config/firebase.ts` 的多分頁 IndexedDB 持久快取 | SDK 管理已讀文件及 SDK 可離線保存的寫入，連線恢復後自行同步。它不會替應用 queue 中的自訂操作執行領域副作用。 |

`offlineQueue` 是第四種狀態：應用層尚待執行的操作 outbox，內容保存在 IndexedDB，透過交易、跨分頁 lease 與 fencing token 保護；舊版 `offline_operations_queue` localStorage 資料會在初始化時遷移。Firebase SDK 的 IndexedDB 待同步寫入不計入 app queue 數量。

## 3. 載入與本機先顯示

Dashboard `loadData()` 與 `dataService.getDataWithRevalidate()` 有快取時先顯示，再背景讀取 Firebase。所有 collection（包含收入、轉帳、帳戶、還款、定期付款、付款紀錄、快速預設）都經 `applyPendingOperations()` 套用尚未同步的新增/編輯/刪除；偏好設定與 layout 也有對應的 singleton projection。沒有快取時仍可由 queue 恢復尚未同步的新增資料。

讀取開始時記下 queue revision；若等待期間發生本機寫入或確認同步，較早的背景回應不會覆蓋較新的本機快取。資料比較也會檢查欄位和順序，不再只比較 ID/updatedAt，因此沒有 updatedAt 的分類改名或排序仍能更新。

每次成功重播會送出 `offline-operation-synced` 事件。Dashboard 依使用者重新載入資料；快速支出預設及使用者設定也會更新其擁有的本機狀態。queue 項目只會由目前登入帳戶重播；其他帳戶或無法驗證 owner 的舊項目保留待原帳戶處理。

## 4. Queue entity 與重播目標

`syncService.executeOperation()` 依 entity 呼叫對應 service。payload 必須包含正確 `userId`；更新/刪除必須帶 document `id`。expense 與 budget 另有 owner/transaction/依賴排序處理。

| entity | Firebase 重播目標 | 重要行為 |
|---|---|---|
| `expense` | `expenseService.create/update/deleteWithRelatedTransfers` | create/update/delete 會在交易內處理帳戶餘額及適用的好友支出摘要。固定 ID 防止重複新增；同一支出的失敗操作會阻擋後續操作。 |
| `income` | `incomeService.create/update/delete` | 收入和付款帳戶餘額在同一交易內調整；重播不依賴 UI callback。 |
| `transfer` | `transferService.create/update/deleteWithBalanceReversal` | 建立及刪除的帳戶餘額變更和轉帳文件保持原子處理。 |
| `budget` | `budgetService.create/update/delete` | 經 mutation lock 及伺服器最新設定/配置 transaction 驗證；不能安全離線確認的限額變更仍回報失敗並回復。 |
| `category` | `categoryService.create/update/delete` | queue 保存 owner、固定 ID、更新欄位；分類排序可成批加入 queue。 |
| `scheduledPayment` | `scheduledPaymentService.create/update/delete` | 對應目前主畫面使用的排程付款資料。 |
| `scheduledPaymentRecord` | `scheduledPaymentService.createPaymentRecord/deletePaymentRecord` | create 使用固定 ID；若設定自動生成支出，queue 攜帶固定 ID 的支出 payload，重播時一併建立，任一部分重試不產生重複資料。 |
| `quickExpensePreset` | `quickExpenseService.create/update/delete` | Widget 與支出清單共用此 entity，Firebase 成功重播後刷新預設清單。 |
| `userSettings` | `userSettingsService.update` | 一般偏好和帳單週期日可排隊；整體預算限額仍需線上伺服器 transaction 驗證。 |
| `dashboardLayout` | `dashboardLayoutService.updateWidgets` | Widget 排序/配置立即更新；失敗時可排隊，重播後重新載入 layout。 |
| `friendPreference` | `friendSpendingService.savePreference` | 自己的好友摘要顯示偏好可先保存本機；不涉及好友邀請或分享授權。 |
| `card` / `bank` / `ewallet` | 對應 payment method service | queue 含 owner/ID；帳戶金額的支出、收入、轉帳副作用由相關交易處理。 |
| `repayment` | `repaymentService.create/update/delete` | repayment CRUD 可本機先更新並排隊；未掛載在主 Dashboard 的舊 `RepaymentManager` 仍有額外收入對帳流程，見第 7 節。 |
| `featureSettings` | `featureSettingsService.update/resetToDefaults` | 功能選單偏好以獨立 entity 重播。 |
| `recurring` | `recurringExpenseService.create/update/delete` | 僅供舊式 recurring expense model；目前主 Recurring 頁籤使用 `scheduledPayment`。 |

重播成功後操作自 queue 移除。同一帳戶依送出順序執行；較早的操作失敗、正在直接寫入或需要處理時，後面的操作先保留，避免新增尚未成功就先編輯/刪除，或使用尚未建立的帳戶。直接寫入中的 outbox 項目不會同時由 SyncService 再執行。重新載入後記憶體中的執行標記消失，durable queue 可繼續重播。

`offlineQueue` 的 `MAX_RETRY` 設為 5；第 5 次同步失敗後，操作仍留在 queue 並標記 `needs-attention`。重開頁面也會恢復通知與重試入口。Budget 伺服器驗證拒絕時則走 budget 專用回復處理，可能移除同一 budget 的依賴操作。queue 序列化保留明確的 undefined 欄位，避免離線更新遺失原本要求清除的可選值。

## 5. 同步觸發與使用者操作

- `SyncService` 訂閱 browser online/offline；恢復 online 後延遲約一秒啟動 queue sync。
- 登入及 queue 變更也會安排同步；同一帳戶直接寫入與 queue 重播互相避開，重試次數更新不會造成無限自動重試。
- 頁首 `NetworkStatusIndicator` 可顯示/手動啟動 app queue 同步。
- Dashboard 漢堡選單的「重新上傳」也直接呼叫 `syncOfflineQueue()`，並依 queue 剩餘數量回報結果，不以重新載入資料冒充同步成功。
- 同一時間僅執行一個 queue sync。操作依 queue 快照順序逐項處理；同步期間新增的操作會安排下一輪。
- IndexedDB outbox 寫入若失敗，UI 不應假稱「已離線保存」；需提示保存失敗並回復尚未能持久化的本機修改。
- 永久拒絕時只回復該筆失敗操作造成的欄位/資料列，並重新套用同一帳戶仍存在 outbox 的其他操作，避免較早操作的 rollback 蓋掉後來已接受的本機修改。
- 刪除支出時若同時刪除關聯轉帳，pending projection 也必須隱藏關聯轉帳；不能只更新 React state，讓背景讀取又把它顯示回來。
- 支出與定期付款記錄 outbox revision 變化會使支出摘要 query 失效，避免舊摘要在樂觀新增/刪除後短暫覆蓋新總額。
- 「清除佇列」會移除整個 app queue，不會清除 Firestore SDK IndexedDB 資料，且無法復原。只應在確認待處理操作都可丟棄後使用。

定期付款摘要與本期已付款判斷直接使用目前畫面的付款紀錄，包含尚未同步的紀錄，不再等待第二次 Firebase 查詢。帳戶餘額的正式數值仍由支出/收入/轉帳的領域 transaction 確認。

## 6. 線上驗證的例外

本機先更新仍是 CRUD 的顯示規則；下列操作有不可省略的線上前置條件或需明確失敗回復：

- 整體預算限額會與伺服器目前預算配置一同驗證並提高 revision，不能只使用過期快取判斷。
- 多幣別支出、收入、轉帳及排程付款紀錄需要保存交易日期的匯率快照。若本機沒有該匯率且無法取得，不能保存錯誤的基準幣金額；畫面需保留輸入上下文或清楚回復並提示匯率不可用。
- 權限拒絕、資料驗證錯誤、預算限制違規等永久錯誤不得排成可重試網路操作。
- CSV/Excel 匯入是具逐列結果的批次工作：顯示進度/錯誤，網路錯誤列以固定 ID 排入 expense/category queue，完成後列表會套用 pending operations；不可將部分成功的批次偽裝成整批成功。
- 管理員帳戶操作和好友邀請/分享權限依賴伺服器權限或跨使用者 transaction；應等待伺服器確認，不能當作一般離線 CRUD 任意重播。

## 7. 舊路徑與待檢查範圍

- `utils/offlineSyncManager.ts` / `hooks/useOfflineSync.ts` 還留在 source tree，但目前 Dashboard 主流程使用 `syncService`，且未找到應用對 `setOperationExecutor()` 的注入。
- `offlineQueue.processQueue()` 仍存在，但主流程使用 `syncService` 的 entity executor、owner 檢查、重試與同步事件。
- `services/dataCacheService.ts` 仍存在；Dashboard 主要資料使用 `dataService` + `sessionCache`。
- 舊式 `RepaymentManager` 有「超額還款對帳收入」的多次 Firestore 寫入流程，但未接入目前主 Dashboard 的還款 UI。若重新掛載，應改為可重試的領域交易/工作流程後再啟用。

更多 service/method 和業務流程見 [`LOGIC_METHOD_FLOW.md`](LOGIC_METHOD_FLOW.md)。使用者操作說明見 [`OFFLINE_SYNC_GUIDE.md`](OFFLINE_SYNC_GUIDE.md)。

功能對照與驗收證據見 [`LOCAL_FIRST_ACCEPTANCE.md`](LOCAL_FIRST_ACCEPTANCE.md)。
