# 離線儲存與啟動載入優化計畫

日期：2026-10-22

狀態：設計完成，尚未實作。本文的效能數字是後續驗收目標，不是已達成的測試結果。

檢查基準：`origin/main` 的 `1da2ade`。

## 1. 要解決的問題

使用者已經看過的資料，重新開啟 App 時應該先從本機顯示，再於背景更新。不能因為快取過期、其中一個查詢較慢，讓主畫面先空白或顯示 0。

本次交付是優化計畫與文件索引。執行下列階段、修改 App 行為及驗收紀錄，屬於後續實作工作。

## 2. 現況與原因

| 檔案 | 已確認的行為 | 影響 |
|---|---|---|
| `web/src/utils/sessionCache.ts` | 記憶體、sessionStorage、localStorage 都套用 24 小時有效期；讀取過期快照回傳 null | 資料仍在本機，畫面卻當成沒有資料 |
| 同上，`set` | 資料與 coverage 相同時直接返回，沒有更新 timestamp | 成功查到相同資料也不會延長目前的有效期 |
| `web/src/pages/Dashboard.tsx`，`initialRows` | 元件初始化會讀取快取，沒有快取則使用空陣列 | 已有本機優先入口，但過期後走向空資料狀態 |
| 同上，`loadData` | 第一階段等待 8 個查詢的 Promise.all 後才設定整批初始結果 | 無快取的集合可能拖延其他已完成集合的初始發布；單一失敗也會中斷這段批次流程 |
| `web/src/services/dataService.ts` | 有快取時會背景更新；離線且無快取時回傳空陣列 | 呼叫端無法單從陣列辨別「確實沒有紀錄」和「尚未取得紀錄」 |
| `web/src/contexts/AuthContext.tsx` | onAuthStateChanged 等待 ensureUserMetadata，才發布 currentUser 並結束 loading | 主畫面掛載前增加一段資料查詢等待 |
| `web/src/config/firebase.ts` | 已啟用 Firestore 的 IndexedDB 持久快取 | 不代表所有應用層讀取都會使用它；部分歷史查詢指定伺服器或透過財務查詢服務 |
| `web/src/utils/indexedDbOutbox.ts`、`offlineQueue.ts` | 待同步操作已存入 IndexedDB，啟動先恢復 queue | 這是既有資料保護，必須保留，不應為縮短啟動而跳過 |

上述程式能解釋症狀，但尚未讀取使用者裝置的儲存內容，不能將單次發生原因定為快取過期。

## 3. 目標行為

1. 已驗證的登入身分恢復後，先讀該使用者的本機資料，不等待遠端資料查詢。
2. 有效結構的舊資料可以顯示；過期代表需要更新，不代表資料不存在。
3. 每個集合、期間與 widget 分別載入。卡片或設定查詢較慢，不阻塞支出清單。
4. 資料缺失時顯示「尚未載入」；遠端確認完整且為空，才顯示 0 或空清單。
5. 背景更新失敗仍保留最後可用資料，顯示保存時間、離線或更新失敗狀態。
6. 待同步的新增、修改、刪除，在重開與背景更新後仍保持正確；不得重複調整餘額。
7. 快取過舊、資料期間不完整、待同步，是不同狀態，不能混成一個 loading 布林值。

## 4. 儲存架構決策

採兩階段落地。第一階段先改善現有快照與載入流程；第二階段把應用層持久快照遷移到 IndexedDB。兩階段完成後才算整體優化完成。

| 層 | 最終責任 |
|---|---|
| 記憶體 store | 目前使用者、目前 scope 的畫面快照與訂閱；減少 JSON 解析與重複計算 |
| IndexedDB read snapshots | 應用層持久資料、期間 coverage、版本、遠端確認時間；重新開啟的主要資料來源 |
| IndexedDB outbox | 唯一的持久待同步操作來源；沿用既有 claims、fencing、依賴與 receipt 流程 |
| Firestore SDK cache | 保留 SDK 自己管理的快取，不直接讀寫內部資料庫，也不當成應用快照一定存在的保證 |
| localStorage / sessionStorage | 遷移期間讀取舊快照；遷移完成後不再重複保存完整財務資料，僅保留適合的小型偏好 |

新增獨立的應用快照資料庫，避免因讀取快照升級而改動 outbox schema。IndexedDB 不可用時保留現有資料並顯示可重試的儲存錯誤；不得默默降級為只存在記憶體、卻聲稱可離線保存。

### 快照與查詢身分

快照 key 使用 `[userId, entity, scopeKey]`。scopeKey 至少區分 collection、dashboard 起訖期間、完整歷史與明確期間，並包含影響查詢結果的條件。分頁資料另存 cursor 與查詢身分，不能用一頁覆蓋完整期間。

每份快照一起保存：

- `schemaVersion`、`userId`、`entity`、`scopeKey`。
- `dataVersion`、`data`、`rowCount`；資料與 completeness 必須原子寫入。
- `coverage`：範圍、是否完整、可用的伺服器 readTime／generation。跨集合的財務總計需確認相容的讀取世代，不能把零散完成的頁面冒充一致總計。
- `savedAt`：本機資料內容保存時間。
- `lastValidatedAt`：最後成功遠端確認時間；不得用本機操作或失敗重試更新。
- `origin`：確認的遠端基底或 legacy projected 快照，明確區分來源。

成功遠端確認但內容相同時，只更新 `lastValidatedAt`，保留資料版本與參考，避免整個畫面重新計算。從 SDK 本機快取取得的內容不能標記為遠端確認。

### 可用性、時效與完整度分開

- 可用性：`hydrating / missing / ready / error`。
- 時效：`unknown / fresh / stale`，依 `lastValidatedAt` 計算；不影響舊資料可讀性。
- 更新狀態：`idle / refreshing / failed`。
- 完整度：該 scope 的 `partial / complete`。
- 同步狀態：由 outbox 的訂閱取得 pending、syncing、needs-attention。

新鮮度預設窗口先設為 5 分鐘，作為可調整策略；不是刪除期限。過期、手動更新、恢復連線或受影響集合失效時觸發背景更新。已有新鮮快照且未失效時可省略重複查詢；金融決策、伺服器交易與權限檢查仍走既有正確性流程。

## 5. 啟動與背景更新流程

```text
恢復 IndexedDB outbox + 還原 Firebase Auth 身分
  → 身分確定後讀取該使用者的畫面必要快照
  → 記憶體 store 發布本機資料 + 尚未同步的操作投影
  → 各 widget 依自己的依賴顯示可用資料或載入提示
  → 背景處理使用者 metadata、初始化與需要更新的集合
  → 遠端結果通過 owner / scope / generation 檢查
  → 原子保存確認快照，再發布含 pending 的畫面投影
  → 通知依賴該集合的 widget
```

Auth 狀態與 metadata 初始化分開。不能依靠 localStorage 保存的 userId 假裝登入，也不因本機快取存在而給予管理員權限。帳號切換、登出時立即隔離畫面與記憶體 store；所有晚到結果必須驗證目前 owner 與 session generation。

有快取的 widget 顯示舊資料與「正在更新／最後保存時間」。無快取的 widget 顯示載入或離線缺資料提示；每個集合完成就獨立發布，不等待整批 Promise.all。只把 Promise.allSettled 用於彙整狀態，不能等它結束才顯示各集合。

完整總計和列表分頁維持分離。已完成快照可以顯示帶時間的舊總計；不完整期間只顯示已保存紀錄及不完整提示，不給出看似確定的總計。需要多集合的 widget 應保留上一份一致的顯示結果，直到新一代依賴資料完整，不混算新收入與舊支出。

## 6. 實作順序與修改範圍

### 第一階段：先消除不必要等待

1. 修改 `sessionCache.ts`：移除以 24 小時判定資料不可讀的行為；結構、owner、schema 與 rowCount 驗證保留。增加 freshness metadata，區分保存與遠端確認時間。
2. 修改 `dataService.ts`：回傳可辨識 missing、partial、ready 的結果；本機讀取與背景更新分開。新增「遠端確認成功」入口，資料相同也能更新確認時間；更新失敗不能覆蓋快照。
3. 修改 `AuthContext.tsx`：Firebase Auth 回報身分後發布 currentUser；metadata 初始化放背景執行，處理錯誤與 owner 取消。保留真實身分恢復與權限驗證。
4. 拆分 `Dashboard.tsx` 的 hydrate 與 revalidate：依集合獨立發布；將初始化預設分類、帳戶與額外 metadata 移出必要顯示路徑。初始化寫入仍遵守現有交易與防重送機制。
5. 調整 `UserSettingsContext.tsx`、`CustomizableDashboard.tsx`、widget completeness 與必要 widget：使用依賴集合的可用性，避免空資料先算成 0；保留 stale 資料與狀態提示。
6. 檢查 `historyService.ts`、`useHistoryPages.ts`：保留明確 scope、完整期間與 cursor 約束；不得為了快速顯示改成讀取全部歷史。

第一階段交付條件：超過 24 小時的完整本機資料仍能顯示；攔截所有遠端回應時也能先呈現快照；單一集合失敗不會遮住其他已完成資料。

### 第二階段：統一持久快照與訂閱

1. 新增 `web/src/utils/indexedDbSnapshots.ts`：封裝版本化 schema、原子寫入、scope key、CAS／generation 檢查與明確錯誤處理。
2. 新增 `web/src/services/localDataStore.ts`：負責非同步 hydrate、記憶體快照與訂閱。React 使用 `useSyncExternalStore` 或等價的穩定訂閱方式，getSnapshot 需有穩定參考。
3. 將 `sessionCache.ts` 改為遷移／相容層；盤點所有呼叫端，逐步移除對同步持久讀取的假設。`main.tsx` 保留 outbox 恢復，再進行當前使用者必要 scope 的 hydrate，不等待所有歷史與無關頁面。
4. 遷移 `dataService.ts`、`historyService.ts`、設定與 layout/preset 等現有快取消費者，統一使用 store。盤點 `dataCacheService.ts`、`offlineSyncManager.ts` 的實際引用，對未使用舊服務移除或標記淘汰，避免兩套狀態繼續並存。
5. 透過 BroadcastChannel 與 store 事件通知其他分頁，只傳 key／version／失效資訊，收到通知再讀持久資料。復原分頁時補讀版本；不使用固定輪詢。
6. 現有 `refreshCoordinator.ts` 的合併失效與在途後再刷新機制保留。相同 owner、scope、查詢條件、generation 的讀取共用 Promise；單次訂閱取消不能取消其他訂閱者仍需要的查詢。

### 遷移、待同步操作與錯誤復原

- 逐 owner、entity 驗證舊 v2／legacy 快照，原子寫入新儲存並確認可讀後才標記遷移成功。過期但結構正確的資料可以遷移，freshness 設為 unknown 或 stale。
- 舊快照沒有可信期間資訊時只能列為 partial；不能因資料列數大於零就標記完整。損壞值保留供恢復，不能因解析失敗清除 outbox。
- 舊快照可能已包含 pending 操作。遷移時保留其 projected 來源並沿用已驗證的去重規則；不得直接把它當成純遠端基底再次套用餘額增減。
- 最終使用確認的遠端基底加 pending 投影。投影必須以穩定 document ID／operation ID 去重，特別驗證帳戶餘額、刪除及 scheduled payment；已套用的操作不再次計算。
- 每次使用者操作都先 await outbox enqueue，成功後才回報本機接受。快照寫入失敗時不能移除已提交 outbox，也不能聲稱資料已同步。
- syncService 維持唯一 queue executor；claims、fencing token、依賴排序、immutable receipt 與財務交易保持不變。快照遷移不觸發遠端財務寫入。
- 同步後先使 affected scopes 失效／重建，保留已接受的投影，直到確認快照含有該操作的結果再移除顯示 overlay，避免短暫回跳與重算。
- generation 或 owner 不符的晚到結果不得寫入目前快照。多分頁快照提交使用持久 generation／CAS 檢查，不只依賴單頁記憶體計數或客戶端時鐘。
- 儲存空間不足、交易失敗、upgrade blocked 顯示可處理提示與重試。舊快照和待同步資料保留；僅可回收未被使用、可重抓的歷史頁面，不刪除 outbox 或目前必要的最後可用快照。
- 遷移成功前保留舊值；先切讀再停止舊快照寫入，最後才在獨立清理版本移除舊值。回退版本期間保留可讀的舊格式或提供相容讀取，不要求使用者清除網站資料。

## 7. 驗收矩陣

| 情境 | 預期結果與驗證方式 |
|---|---|
| 本機快照 25 小時、7 天後重開 | 假時間單元測試及瀏覽器重開；資料仍顯示，標記 stale，不先顯示 0 |
| 成功遠端確認，但資料沒變 | lastValidatedAt 更新；dataVersion 不變，不重新發布整份列表 |
| 本機新增但未同步 | 不更新遠端確認時間；關閉重開仍保留操作與正確投影 |
| 所有遠端回應延遲 10 秒 | 瀏覽器攔截請求；已保存資料先顯示，metadata 延遲不阻塞主畫面 |
| 只有一類集合慢或失敗 | 其他集合獨立完成，相關 widget 局部顯示載入／失敗 |
| 首次開啟且沒有快照 | 線上顯示載入；離線顯示未保存；遠端完整空結果才顯示 0 |
| 完整與部分期間、跨日或跨月 | 舊 scope 不冒充新 scope；列表可顯示部分內容，完整總計有明確狀態 |
| 多集合分別更新 | 不發布混合世代的財務總計，上一份一致總計可帶時間保留 |
| 新增／修改／刪除後關閉重開 | IndexedDB 恢復；pending 不消失，背景讀取不回滾操作 |
| 帳戶／轉帳／scheduled payment 重送 | receipt 防止二次餘額調整；重開和過期 worker 不覆蓋較新資料 |
| 讀取途中發生操作或 scope 失效 | 舊回應被 fencing 拒絕，後續刷新不遺失 |
| 兩個分頁同時更新／離線轉在線 | queue claim 不重送；快照最終一致；相同讀取共用，無 storage 輪詢 |
| 切換帳號／登出時舊請求完成 | 畫面、快照與訂閱不混入另一使用者資料 |
| 權限失效或永久同步錯誤 | 不以快取推定授權；保留待同步資料並顯示 needs-attention |
| 遷移中斷、重開、損壞或無 coverage | 遷移可重入；來源保留；不升級完整度、不重複套用 pending |
| quota／IndexedDB 被阻擋／upgrade blocked | 顯示儲存錯誤、保留 queue 與舊快照，重試後可恢復 |
| 大量歷史紀錄與匯出 | 首屏不載入全歷史；穩定 cursor 分頁，匯出明確走完整歷史流程 |

測試落點：擴充 `sessionCache.test.ts`、`dataService.localFirst.test.ts`、history／widget completeness 測試；新增 IndexedDB migration、store subscription、Auth 與 Dashboard 啟動整合測試。真實重開、兩分頁、離線與慢網路由 Playwright 驗證；交易與 receipt 維持 financial emulator 測試。

後續實作驗證命令（在 `web/`）：`npm run test:run`、`npm run build`、`npm run test:browser`，以及啟動專案指定 Firebase emulators 後執行 `npm run test:financial-emulator`。lint 另以既有專案基準檢查，不把既有失敗算成此次通過。測試結果須記錄實際命令、環境、範圍與失敗，不能用單元測試宣稱裝置端已驗收。

## 8. 效能量測與完成標準

新增 `auth-restored`、`local-hydration-start/end`、`first-local-data-render`、每集合 refresh start/end 的 performance marks。記錄 entity、scope、cache hit／miss／stale、資料列數與耗時，不記錄財務內容、email 或登入憑證。

固定同一測試裝置／瀏覽器與種子資料：10,000 筆歷史支出、2,000 筆目前 scope 紀錄、200 筆 pending。分別跑桌機與手機節流配置，各做 30 次關閉頁面後重開，並記錄裝置、節流配置及 p50／p95。

- Auth 身分與 outbox 恢復完成後，到顯示第一份可用本機資料，桌機 p95 目標不超過 500 ms；手機 CPU 4 倍節流 p95 不超過 1.5 秒。
- 同時記錄「開啟頁面到本機資料顯示」總耗時，包含 outbox／Auth，不以排除前置等待掩蓋退步。
- 有完整本機資料時，遠端阻擋 10 秒仍能顯示快照；不出現先歸零再恢復。
- 相同查詢身分與 generation 的並行刷新只執行一次；同步後只刷新受影響 scope。
- 不引入固定 storage 輪詢；首屏不遍歷全部歷史；無待同步遺失、重複餘額調整或跨帳號顯示。

若效能未達標，先檢查 JSON 解析、重複 hydrate、同步計算與 widget 依賴；不能以刪掉正確性檢查或跳過 outbox 恢復達標。

## 9. 發布與回退

先完成第一階段與其回歸測試，再完成第二階段與遷移／跨分頁測試。兩階段都須能獨立驗收；整體完成以第 7、8 節全部條件為準。

後續程式變更預設先在 `firebase-testing` 驗證，生產部署另依使用者當次指示。此次使用者明確要求將完成的計畫直接 push 到 `main`，所以本次僅推送本文件與索引，並檢查該 commit 的部署 workflow。文件發布成功不代表上述 App 優化已上線。

回退以應用讀取路徑／相容層切換為主，保留持久資料與 outbox。遇到儲存錯誤時提供明確重試，不採取清空網站資料作為一般修復方式。
