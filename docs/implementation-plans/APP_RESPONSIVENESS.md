# 載入速度與操作反應優化

日期：2026-10-23

規劃與獨立覆核：Codex with ChatGPT · Expense_Manager。執行：Codex。

## 目標與範圍

讓 App 開啟時先有畫面，有本機資料就先顯示；搜尋、篩選與排序減少重複讀取；列表與 Dashboard 減少不相關的計算和重繪。

這次會將下列六項計畫實作並推送 `main`。原有工作目錄的文件修改保留，發布時只帶入此次程式、測試、量測工具與本文件。

## 計畫與實作

| 順序 | 修改 | 驗收方式 |
|---|---|---|
| 1. 啟動與本機資料 | React 先掛載；登入身分恢復不等 metadata；財務畫面透過 LocalDataBoundary 等待 durable outbox；舊快照不因超過 24 小時而消失；Dashboard 各集合獨立發布 | 延遲初始化、儲存失敗、帳號切換、7 天後重開、有 pending 時的畫面 |
| 2. 搜尋與統計 | 輸入即時更新，文字查詢停頓 300ms 後套用；完整期間資料由搜尋與統計共用；排序與結果篩選分開 | 快速輸入、排序不重抓、跨帳號舊回應、完整期間與分頁統計一致 |
| 3. 首次載入與 PWA | Dashboard route、圖表及匯入匯出按需載入；依實際依賴自動分包；只預先快取入口依賴；已使用功能由 service worker 快取；補上離線深層路由 | 比較正式建置、登入及快取重開；兩種部署路徑；未下載功能離線提示與連線重試 |
| 4. 列表 | 依 expenseId 建立還款索引、依日期縮小轉帳候選；分組與換算總額 memoize；批次刪除使用 Set | 多筆還款、候選順序、既有幣別顯示、批次操作及既有回歸測試 |
| 5. Dashboard | widget 依實際使用的資料及 callback 比較；保留各自的 completeness gate；memoize 設定與共用 props | 不相關更新不重繪；資料、幣別、語言、完整度與 callback 更新仍生效 |
| 6. 匯率換算 | 共用相同金額、來源幣別、目標幣別與日期的換算；保留既有歷史匯率快取；限制工作量 | 跨 widget 共用、舊 Promise、失敗重試、零與負值、JPY 小數位、160 組不同換算 |

文字、分類與付款方式決定哪些紀錄納入結果；顯示排序不會改變期間總額。

### 資料與記憶體邊界

- 搜尋共用的 confirmed raw period 以使用者、期間、來源模式、資料世代及該使用者的支出操作版本識別。
- 完成結果最多保留 4 份、合計 5,000 列、估計序列化大小 4 MiB，且重用窗口為 30 秒；任一限制達到就回收較舊結果。
- 超過上限的明確全歷史搜尋只共用正在進行的讀取。完成後由目前畫面持有，不再額外留在全域完成結果快取中。
- 手動重試、相關資料更新及離開該使用者頁面，會明確使舊結果失效；已失效的在途回應不能發布。
- outbox 的 lease、claim 與內容相同的 refresh，不代表支出資料改變。新增 expenseRevision 追蹤該 owner 的支出／scheduled payment 內容變更，避免同步取得工作權時反覆中斷查詢。
- 已接受的支出投影會保留到替代快照抵達；操作剛從 queue 完成時，不先回到更舊的 confirmed baseline。換帳號或期間立即隔離。
- 全頁面與分頁資料各自保留 scope 和 completeness。部分離線資料仍可顯示，但不能冒充完整總計。
- 換算完成值只保存在記憶體，上限 2,048 組；同時最多執行 8 組，hook 每批最多準備 64 筆，卸載後停止排入後續批次。失敗不快取成成功值。

### 保留的財務契約

本次沒有改變遠端財務交易、immutable receipt、穩定 document ID、跨分頁 claim/fencing 與依賴順序。每次使用者寫入仍先 await IndexedDB outbox 提交，之後才回報本機接受。財務畫面在 outbox 還原前不能進入可編輯狀態。

讀取快照仍沿用現有 localStorage／sessionStorage；IndexedDB 仍保存待同步操作與 Firestore SDK 快取。將所有讀取快照遷移至 IndexedDB 是另一項架構遷移，沒有在這次效能變更中宣稱完成。

## 驗證與量測

比較基準是當時的 `origin/main`：`3b37cfc`。前後都使用相同 demo Firebase 設定、同一台電腦的 installed Chrome headless、新的 browser context、本機正式版 preview，沒有 CPU／網路節流。

### 入口與安裝下載

下表使用 GitHub Pages 基底路徑。入口 JS 是 HTML 的 entry 與 modulepreload 檔案；傳輸值取瀏覽器 resource timing 的 JS transferSize。PWA 安裝量另採 Workbox 的 precache 報告，沒有把它混成入口壓縮大小。

| 指標 | 修改前 | 修改後 |
|---|---:|---:|
| 入口 JS，壓縮前 | 3,326,410 bytes | 881,699 bytes |
| 入口 JS，gzip | 963,694 bytes | 273,168 bytes |
| 冷開啟 JS 傳輸，單次樣本 | 966,694 bytes | 276,138 bytes |
| Workbox 預先快取 | 3,826.63 KiB | 約 1,323 KiB |
| 登入欄位可見，中位數／3 次 | 307 ms | 192 ms |
| 暖重開登入欄位可見，中位數／3 次 | 183 ms | 159 ms |

上述時間只代表本機小樣本的登入入口，不代表使用者手機、遠端網路或財務 Dashboard 的 p95。正式裝置的完整啟動時間仍應另外收集。

### 可重現的操作驗證

- 快速輸入 `c → co → coffee`：輸入立即可見；299ms 前沒有完整期間查詢，停頓 300ms 後一次讀取。搜尋清單與總計共用該次資料；排序不增加查詢或換算。
- 100 筆顯示支出、1,000 筆還款：建立索引只檢查 1,000 筆，再依 key 取用；保留各組的原有順序。
- 不相關預算更新：recent-expenses、圖表、summary 與 scheduled widget 的比較測試確認不會因無關資料而重畫；必要資料、完整度及 callback 變更仍更新。
- 相同換算由兩個 hook 共用一次工作；160 組不同換算的同時工作峰值不超過 8。
- 真實瀏覽器關閉頁面、時間推進 7 天後重開：保存資料與 pending create 同時還原；outbox 還未就緒時不能看到可操作的財務內容。
- 真實 Auth／Firestore emulator 的 1,105 筆多頁資料：串流統計與完整期間共用統計一致，包含 pending create/update/delete、generated scheduled payment expense、分類／付款方式、MYR／JPY 及 booked valuation。
- service worker 控制的正式版 App：登入後關閉並離線重開 `/dashboard`；未下載圖表顯示可重試提示；連線重試成功；已載入圖表再次離線重開可用。

### 驗證工具

從 `web/` 執行：

```text
npm run test:run
npm run lint
npm run build
# 設定 FIREBASE_DEPLOY=true 後，再執行 npm run build
npm run test:financial-emulator
npm run test:browser
node scripts/measure-startup.mjs URL OUTPUT_JSON DIST_DIRECTORY
node scripts/smoke-installed-pwa.mjs URL OUTPUT_JSON DIST_DIRECTORY
```

financial 與 browser 測試須先啟動 demo 專案的 Auth／Firestore emulators；可以由 Firebase CLI 的 emulators:exec 包住命令。未啟動 emulators 的第一次 browser run 有兩項既有整合測試失敗，啟動前置服務後五項全部通過。

PWA smoke 工具只接受 `127.0.0.1` 的正式版 preview，並驗證 demo build；使用拋棄式 emulator 帳號，測試資料不送往 production。它驗證 service worker 控制的離線行為，沒有聲稱替使用者安裝桌面 PWA。

## 發布

先完成 ChatGPT 的獨立覆核與回歸測試，僅提交此次檔案。再以最新 `origin/main` 建立隔離的發布版本、cherry-pick 此次提交、驗證實際 main 內容後，以一般 fast-forward push 發布，不帶入原分支其他提交。

推送後分別確認 GitHub Pages 與 Firebase Hosting workflow 的該 commit 結果。來源推送成功、建置成功與網站部署成功分開回報；部署失敗時保留證據，不調整 IAM 或 Firestore rules 來掩蓋問題。
