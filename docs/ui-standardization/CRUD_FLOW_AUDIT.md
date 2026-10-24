# CRUD 表單、清單與 Overlay 流程盤點

> 範圍：`origin/main` 的目前掛載 UI；這份文件盤點入口、畫面、操作與需保留的資料流程，並非實作核准。未掛載、舊版或尚無新增入口的元件另行標示。樣式選擇見 [候選互動模式](INTERACTION_PATTERN_CANDIDATES.md)，逐檔安排見 [標準化計畫](PATTERN_STANDARDIZATION_PLAN.md)。

## 1. 共同流程基線

多數功能由 Dashboard 主頁籤或其中的 manager/list 進入，表單通常由 `PopupModal`、`BaseForm` 或功能自訂 panel 承載；刪除通常先選取對象，再開 `ConfirmModal`。功能入口受頁籤、權限、資料狀態或操作條件限制。實際掛載樹以 [UI 元件盤點](UI_COMPONENT_INVENTORY_AND_PLAN.md) 為準。

```text
清單／卡片／快速操作
  ├─ 新增 → 空白表單／步驟式表單／逐列匯入
  ├─ 檢視 → 清單明細、卡片、摘要或展開區
  ├─ 編輯 → 帶入既有值與穩定 ID → 驗證 → submit handler
  └─ 刪除 → 選取一筆／多筆 → 確認範圍與關聯影響 → domain callback
                                      ↓
                        React state + cache / durable outbox
                                      ↓
                         syncService 背景執行與回饋
```

樣式重構須保留以下界線：

- 元件只負責輸入、錯誤顯示、鍵盤/焦點和 callback，不在 UI wrapper 重算帳戶餘額或代替 domain transaction。
- 一般資料變更先呈現在 React state/cache，並在回報本機接受前完成 IndexedDB outbox 保存；同步由唯一 `syncService` executor 負責。每個改動需核對實際 handler，不可只根據表單外觀推定。
- 遠端永久拒絕、重試上限、衝突與離線狀態需留有可恢復提示；關閉 modal 不能默默丟掉尚未保存的草稿或 pending 操作。
- 刪除含關聯或批次選取時，確認文字需說明對象數量與實際影響；取消路徑不執行 mutation。

## 2. 目前掛載功能 CRUD 矩陣

| 功能 | 進入 / 檢視 | 新增 | 編輯 | 刪除 / 確認 | 表單與流程邏輯需保留 |
|---|---|---|---|---|---|
| 支出 | Dashboard 快速新增、Expenses 日期/期間清單、篩選與摘要 | `StepByStepExpenseForm`；可從一般入口或收據來源/OCR 草稿啟動；最後一步可「新增並繼續」 | `ExpenseList` 開 `PopupModal` + 同一 `StepByStepExpenseForm`；目前 3 個編輯 tabs：日期/金額、分類/描述、付款/應收追蹤 | 單筆及多選 `ConfirmModal`；可選擇還款、附件與分攤資料都不能因只改表單視覺而被移除 | 固定 expense ID / owner、`expectedRevision`、完整幣別與日期快照、分類/tag/payment method ID、receipt state、分攤參與者與已付份額；保存走既有 local-first 和 transaction / receipt 路徑。OCR 預覽草稿套用前可回編修。 |
| 支出快速預設 | Expenses 清單工具 | `ExpenseList` 快速預設 `PopupModal` | 在既有快速預設編輯入口調整欄位 | 由管理入口依現有 callback 刪除 | 預設資料只作表單填入來源，不能誤當已建立支出；存 preset 與新增 expense 是不同操作。 |
| 收入 | Incomes 頁籤、收入清單、關聯支出導覽 | `IncomeForm` / manager modal | `IncomeList` 開 `PopupModal`；另有 inline update | 單筆與多選 `ConfirmModal` | 保留 income ID、入帳日、幣別/換算快照、類型、帳戶付款來源、linked expense 導覽；收入連動月預算使用完整帳期讀取與 pending-operation reconciliation。 |
| 分類 | Categories manager 清單、排序及 icon | `CategoryForm` / `BaseForm` | `CategoryManager` 在 modal 載入既有分類 | 刪除先在 `PopupModal` 選「重新指派」或「刪除相關支出」等影響，再確認；多選入口另顯示數量 | `categoryOrder`、分類 ID/name 映射、被關聯支出、批次影響與順序需保留；取消不能先改資料。 |
| 分類預算 | Budgets manager、期間摘要、分析/歷史 | `BudgetForm`；亦能從建議或 template preview 產生草稿/配置 | `BudgetManager` 載入既有 period/category 欄位 | 單筆/多筆 `ConfirmModal` | 保留 billing cycle、月末截斷、category ID、rollover、allocation revision、限額 validation。收入連動模式另由 `IncomeBudgetSettingsModal` 處理，不能與手動上限混成同一欄位。 |
| 整體預算設定 | Budget manager 的上限按鈕 | 不建立獨立資料列；編輯目前上限或收入聯動設定 | 月份使用 `IncomeBudgetSettingsModal`；週/年仍使用 `PopupModal` 與手動金額 | 不使用一般刪除 | 遠端上限/模式切換要經 server transaction 驗證；收入模式和手動金額獨立保存，缺資料時顯示不完整而非假定零。 |
| 卡片、電子錢包、銀行 | Payment Methods 子頁、各自清單 | `CardForm`、`EWalletForm`、`BankForm`，以 `BaseForm` / manager modal 顯示 | 既有項目載入對應表單 | 各 manager 提供刪除 callback；需保留現有警示與關聯行為 | 保留 payment method ID、類型、幣別、排序、遮罩資訊與使用中狀態；表單關閉、取消與儲存狀態保持現有 callback 語意。 |
| 轉帳 | Payment Methods / Transfers 清單、期間與篩選 | **目前掛載流程未提供可用的 transfer-create 表單入口**；`TransferForm.tsx` 定義存在但 production 未掛載 | 目前列表的檢視/操作沒有可達的 transfer edit form | `TransferList` 由傳入 callback 刪除 | 不可把 unmounted `TransferForm` 草圖描述成現存 CRUD；若要增加新增/編輯屬於功能範圍變更，還要保留來源/目的帳戶餘額交易與固定 ID。 |
| 定期付款計畫 | Recurring 主頁籤實際掛載 `ScheduledPaymentManager`；卡片/日曆/分析 | `ScheduledPaymentForm` + modal | 編輯 modal 帶入付款計畫 | 單筆及批次 `ConfirmModal`；另可啟用/停用 | 付款日、週期、固定付款 ID 和付款規則保留；新付款記錄的遠端副作用見下一列。舊 `RecurringExpenseManager` 未掛載。 |
| 定期付款記錄 | 排程付款卡片的付款確認與歷史 | `PaymentRecordForm` / 卡片內付款 modal；確認後建立固定 ID record，可選生成 expense | `PaymentHistoryList` 顯示/編輯既有 record 的入口受傳入 callback 控制 | 記錄刪除 callback 由 manager 提供；刪除需辨識 record 與計畫不是同一物件 | 新路徑由 `scheduledPaymentService.createPaymentRecord` 在同一財務 transaction 寫入 record、可選 expense、帳戶變更/摘要和 receipt；不因分步 UI 重複入帳。 |
| 分攤與還款 | 支出明細的 `ExpenseSplitSummary`、ExpenseList 還款按鈕 | `RepaymentForm` 由支出列開啟；不是獨立 Repayments tab | 支出列的既有 repayment 編輯 modal | 單筆 delete `ConfirmModal`；會影響連結支出及還款摘要 | 保留 repayment ID、linked expense ID、participant、幣別/金額和過額收入語意；`splitPaidMinor` 是分攤結清狀態，不可在視覺移植時再建立重複還款。`RepaymentManager/List` 是 unmounted 舊鏈。 |
| 匯入/匯出 | Import/Export modal 及匯入進度/結果 | CSV/Excel 先解析、預覽，再逐列驗證/提交 | 匯入不是直接編輯既有表單；重複資料/錯列按現有結果頁處理 | 不使用一般 CRUD delete | 保存欄位映射、逐列錯誤、部分成功回饋、進度、owner 和穩定 ID。批次 UI 需要明確區分已接受、失敗與仍待同步。 |
| 偏好、Profile、管理 | Settings、頁首 Profile/Admin menu | 設定值首次初始化；Profile/Admin 各自表單/對話框 | theme、locale、功能排序、widget layout、user profile | 登出、移除帳戶等伺服器操作需確認及權限 | 需逐一區分本機偏好、持久化 userSettings、server-only permission/auth 操作；不能把管理操作包成一般離線 CRUD。 |

## 3. Overlay 與表單狀態檢視

| 元件/型態 | 目前用途 | 應標準化的外觀 | 互動/語意不可遺失 |
|---|---|---|---|
| `PopupModal` | 表單、一般內容/自訂面板；目前以 Portal 呈現，支援 Escape、遮罩關閉及 body scroll lock | 標題區、關閉按鈕、內容捲動、footer、寬度/手機視窗 | **目前限制：**元件未設 `role="dialog"` / `aria-modal` / `aria-labelledby`，也未在元件內管理初始焦點、focus trap 或關閉後焦點返回。這些是候選無障礙工作，不能寫成目前已具備。保留既有 Escape/遮罩關閉和表單提交行為；`isForm` 與非表單用途應區分。 |
| `ConfirmModal` | 刪除、批次刪除和不可逆動作；Escape、遮罩及取消按鈕呼叫 `onCancel` | 一致的標題、影響描述、取消/危險操作層級 | **目前提交順序：**確認按鈕先呼叫 `onCancel` 關閉 modal，再以 `setTimeout(..., 0)` 呼叫 `onConfirm`；不等待 mutation 結果，也沒有 modal 內的 loading/error 狀態。真正的 mutation callback 只由確認按鈕呼叫。候選需明確決定是否保留立即關閉，或等待結果；alertdialog role/ARIA/focus 也是待實作候選。 |
| `BaseForm` | 目前可達的收入、預算、分類、銀行、錢包、卡片、排程付款、還款表單 | Label、help、error、required、欄位間距、sticky/scroll footer、primary/secondary actions | 原生 form submit、欄位 name/id/ref/受控值、disabled/loading 狀態，submit 不得重複觸發。 |
| 支出建立 stepper / 編輯 tabs | 建立、OCR/收據、編輯模式 | step progress、tab active/focus、前進/返回、footer | step validation 與 edit tab semantics 不同；切換不能丟草稿、未完成附件、revision 或參與者。 |
| 卡片內聯展開 | 排程付款確認/歷史、分攤摘要、篩選、template preview | disclosure header、展開區間距與展開狀態 | 使用 disclosure pattern，不偽裝成 dialog 或 tab；保留狀態是否跟隨列表 filter 的既有行為。 |
| toast / alert / status bar | 本機接受、同步中/完成/需處理、錯誤、網路及匯入進度 | status icon/color、文字長度、重試/詳情 action | 區分「本機已儲存」和「雲端已同步」；錯誤不得只靠顏色；需處理操作有永久可達入口。 |

## 4. CRUD 端到端設計檢核

為後續共用 UI 提供逐功能 checklist；欄位設計選定後，按此列表驗收，而不是只截取一張空表單。

1. **Entry**：由目前可達的 tab、row action、FAB 或選單進入；顯示目前功能名稱和操作對象。權限/功能停用時不顯示可點但無作用的入口。
2. **View**：列表空、載入、錯誤、部分範圍和正常資料各自有內容；可由 ID 選取列，不以顯示文字當資料關聯鍵。
3. **Create/Edit**：同類控制按同一 label/hint/error/focus/disabled 規格呈現；Edit 預填既有值，關閉與取消不送出；輸入期間保留日期、幣別精度、選取 ID、draft 與 revision。Overlay 要在「目前已支援」和「候選 focus/ARIA 改善」間清楚標示，不可把 WAI-ARIA 要求描述為 `PopupModal` 現況。
4. **Validate**：先做可本機判定的欄位檢核；需要 server snapshot、權限或財務限額的檢核仍走既有交易/權限流程。錯誤連到欄位，鍵盤可聚焦第一個錯誤。
5. **Submit**：維持原 callback 順序；本機接受前完整 payload/owner/stable ID await outbox enqueue。若同步後端失敗，保留 pending 操作與可恢復提示，不把 modal 的本機關閉誤當作雲端完成。
6. **Delete**：單筆、多選、分類關聯刪除、還款或 scheduled payment record 都顯示正確對象和數量；確認才調用既有 domain callback。刪除交易的餘額、關聯和 receipt 不搬入 component。
7. **Reload/Replay**：離線保存後重新整理或重登入時，pending operation 還原；讀取資料經 `applyPendingOperations`，不能被較舊背景快照覆蓋。重試/永久拒絕/跨分頁競態依 IndexedDB outbox contract 顯示。

## 5. 可核對的主要來源

- 路由與 mount：`web/src/App.tsx`、`web/src/pages/Dashboard.tsx`。
- 支出/還款：`web/src/components/expenses/ExpenseList.tsx`、`StepByStepExpenseForm.tsx`、`ExpenseSplitEditor.tsx`、`ExpenseSplitSummary.tsx`。
- 收入/預算/分類：`web/src/components/income/IncomeList.tsx`、`web/src/components/budgets/BudgetManager.tsx`、`IncomeBudgetSettingsModal.tsx`、`web/src/components/categories/CategoryManager.tsx`。
- 支付與排程付款：`web/src/components/payment/PaymentMethodsTab.tsx`、`web/src/components/scheduledPayments/ScheduledPaymentManager.tsx`、`ScheduledPaymentCard.tsx`、`PaymentRecordForm.tsx`。
- 共用 overlay：`web/src/components/common/PopupModal.tsx`、`web/src/components/ConfirmModal.tsx`、`web/src/components/common/BaseForm.tsx`。
- 同步合約：`docs/OFFLINE_SYNC_ARCHITECTURE.md`、`docs/LOCAL_FIRST_ACCEPTANCE.md`、`docs/LOGIC_METHOD_FLOW.md`。
