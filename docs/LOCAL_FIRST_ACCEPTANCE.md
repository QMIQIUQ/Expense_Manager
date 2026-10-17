# 本機優先功能驗收

本機接受表示操作已保存於目前瀏覽器的 durable queue，畫面可繼續使用；Firebase 確認表示領域 service 已完成寫入。兩種狀態分開呈現。根目錄 `AGENTS.md` 規定未來功能也必須遵循相同行為。

## 功能對照

| 功能 | 畫面與本機寫入入口 | 保存與讀取防護 |
|---|---|---|
| 支出（含快速新增、OCR 確認後新增） | Dashboard handler 更新清單/快取；新增表單立即關閉 | 固定 ID、durable queue、expense mutation lock、領域 transaction |
| 收入 | Dashboard handler 更新清單/快取 | `useOptimisticCRUD` → `writeLocalFirst`；讀取套用 pending income |
| 轉帳 | Dashboard provisional row 及正規化後資料 | 同一 outbox 固定 ID；帳戶建立尚未完成時後續轉帳先排隊 |
| 分類及排序 | Dashboard 更新 state/cache | 單筆共用 helper；排序用 `writeLocalFirstBatch` 一次持久化所有順序 |
| 信用卡、銀行、電子錢包 | Dashboard handlers 與各 Manager | 本機快取先回畫面，所有 collection 讀取重套用 pending CRUD |
| 預算 | Dashboard 樂觀資料與配置驗證 | budget queue、領域驗證/鎖；整體限額仍須線上驗證並可回復 |
| 定期付款及啟用狀態 | Dashboard handlers | 專用 `scheduledPayment` executor 與本機 projection |
| 付款紀錄與自動支出 | provisional record、固定 ID expense | `scheduledPaymentRecord` outbox；摘要/本期付款狀態使用本機紀錄 |
| 還款 | ExpenseList 本機紀錄、金額合計與快取 | 正規化後使用共用 helper；重新讀取及 props 更新保留 pending rows |
| 快速支出預設 | QuickAddWidget、ExpenseList | 共用 outbox、快取與 projection；兩個入口都使用穩定空陣列預設值 |
| 日期、時間、幣別、帳單日、日期捷徑偏好 | UserSettingsContext、UserProfile | 本機設定先顯示；重新載入/背景設定讀取保留待同步偏好 |
| 功能選單偏好、儀表板配置與排序 | Dashboard、CustomizableDashboard | singleton projection 與專用 executor |
| 好友摘要顯示偏好 | FriendSpendingWidget | 自己的偏好使用 `friendPreference` outbox 與獨立本機快取 |
| CSV/Excel 匯入 | 每列驗證/換算完成後產生固定 ID | 寫入前保存 outbox；顯示逐列結果，列表讀取包含 pending 匯入資料 |
| 主題、字體、語言、篩選、日期導覽 | 原有本機 state/storage | 不需要等待 Firebase |

身份認證、管理員帳戶操作、好友邀請/分享授權仍由伺服器判定。多幣別保存前需要有效的匯率快照。正式帳戶餘額由領域 transaction 確認。這些前置條件不等同於一般 CRUD 等待雲端完成後才刷新畫面。

## 回歸證據

2026-10-18：`npm run test:run -- --maxWorkers=1` 通過 36 個檔案、215 個測試；`npm run build` 與 `npm run lint` 通過。

- `utils/localFirstMutation.test.ts`：各 collection 的離線提交/快取恢復、固定 ID、伺服器 Promise 未完成時已保存資料、跨功能先後順序、永久拒絕/儲存失敗、批次排序、undefined 清除欄位、singleton 偏好與自動生成支出。
- `services/dataService.localFirst.test.ts`：背景回應不得移除執行中或剛完成的本機寫入；沒有 updatedAt 的欄位/順序變化也能更新。
- `services/syncService.localFirst.test.ts`：逐 entity executor、失敗 create 阻擋後續 update/delete、直接寫入不重複重播、不同帳戶隔離與 needs-attention 復原順序。
- `services/scheduledPaymentService.localFirst.test.ts`：未同步付款立即參與摘要；統計不重新查詢 Firebase。
- 既有頁面/表單測試、TypeScript production build 與 ESLint 一併執行。測試使用可控的延遲/錯誤與 service mocks；沒有使用正式使用者帳戶建立測試資料，不能把它描述為 Firebase 正式資料的端到端驗證。

排程付款紀錄與自動支出是兩個可冪等重試的寫入階段，第二階段永久失敗時仍可能部分完成；queue 保留失敗操作供處理。清除整個 queue 會丟棄所有未同步操作，操作前須確認可以捨棄。
