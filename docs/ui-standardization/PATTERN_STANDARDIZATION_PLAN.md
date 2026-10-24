# UI 樣式統一：逐階段檔案與邏輯計畫

> 狀態：shared UI tokens 與 global baseline 已存在；`main@a9a9d7c` 的 per-screen audit 仍發現欄位、labels、switch 和 feedback 的 local overrides。此文件保留逐階段檔案清單、資料邏輯保護與候選實作細節，尚未代表全站逐檔修改已完成。此輪只整理 source audit / 文件，沒有修改 product UI 程式。此輪程式基準：`main@a9a9d7c`（2026-10-25）。

共用 UI 規格和 preview 見 [視覺規格](VISUAL_STANDARDIZATION_SPEC.md)，逐 production TSX 和 CSS 的目前 token 覆蓋見 [覆蓋矩陣](UI_STYLE_COVERAGE_MATRIX.md)。後續任何 UI 變更依 repo 根目錄的 `AGENTS.md` 和 [UI_STYLE_GUIDE](../UI_STYLE_GUIDE.md)。

## 1. 實作原則與不可變資料契約

1. 先決定控制語意與視覺 token，再改元件，再遷移目前可達的畫面；不要全域重設原生 `button/input/div`。
2. 每階段建立 before/after 畫面對照和變更檔案清單；將樣式/互動重構與財務領域邏輯分開 commit，縮小回歸範圍。
3. 表單 wrapper 必須透傳原生 `id`、`name`、`value`、`defaultValue`、`onChange`、`onBlur`、`ref`、`autoComplete`、`inputMode`、`type` 及 ARIA props；原 form handler 擁有提交語意。
4. UI 不得直接呼叫 Firebase 另開寫入路徑。一般 mutation 沿用 stable owner/document ID、`writeLocalFirst`/`writeLocalFirstBatch` 或既有 `useOptimisticCRUD`，outbox enqueue 成功後才回報本機接受；唯一 queue executor 為 `syncService`。
5. 保留跨分頁 lease/fencing、帳戶與文件依賴排序、immutable mutation receipt、`applyPendingOperations`、invalidations、refresh scope 和拒絕後保留/revert 規則。不得由元件局部 state 取代持久操作狀態。
6. 帳戶餘額和摘要只能由現有 domain Firestore transaction 更新；排程付款記錄與生成支出保持同一交易；server permission、Auth 和財務限額仍要線上驗證。
7. 樣式重構不合併需求範圍：新增轉帳表單、重新掛載舊 Repayment/Recurring 元件、改收入規則等都是獨立功能決策。

## 2. Phase 0：採用方向、範圍與基線

**產出：**目前 UI 樣式規格、畫面清單、元件/頁面例外和主題組合。幾何方向已採用；interaction flow 提案仍保持獨立。

**工作步驟**

1. 以 `main@a9a9d7c` 的 mounted route/component tree 作為 source baseline；畫面位置和未掛載 source 區分見元件盤點。
2. 幾何採用本計畫的 semantic tokens：44px 一般 controls/actions、36px compact icon actions、8px control/12px card/16px dialog radius；primary/secondary/danger 顏色仍依操作語意和 theme。
3. 不以視覺 token migration 重新設計支出 create/OCR/edit、分類/tag、repayment、導航、確認/同步/離線狀態流程。
4. 對照 [CRUD 流程盤點](CRUD_FLOW_AUDIT.md)，保留 mounted status；`TransferForm`、legacy `RepaymentManager`/`RecurringExpenseManager` 等 unmounted source 不當作目前畫面。

**主要核對位置：** `web/src/App.tsx`、`pages/Dashboard.tsx`、`components/navigation/*`、`expenses/StepByStepExpenseForm.tsx`、各 manager 和 form。

## 3. Phase 1：Design tokens、主題和值集

**目標檔案：**

- `web/src/styles/designTokens.ts`
- `web/src/index.css`、`web/src/cat-theme.css`、`web/src/styles/ledger.css`
- `web/tailwind.config.cjs`
- `web/src/contexts/ThemeContext.tsx`、`web/src/components/ThemeToggle.tsx` / `.css`

**狀態：完成。** `ui-system.css` 建立幾何/字級/間距/radius/focus/layer/control-height tokens；Tailwind semantic colors 和 TS UI tokens 對應 CSS theme variables。Light/dark/Warm Kitty 插圖及色調維持原來源。

**邏輯保護：**保留 `light`、`dark`、`system`、`cat`、`cat-dark` 的舊設定值、system OS change listener、字體/字級偏好、本機設定載入、manifest/icon 和 `<meta name="theme-color">` 同步。Token 初始化不能造成舊使用者首次 render 閃色或寫回預設值。主題 preference 如果走 userSettings，持續使用既有 local-first setter；不新增獨立 localStorage-only 寫路徑。

**實作狀態：**四個顏色 theme 共用 control/card/dialog geometry；rem font aliases 接收 root font scale；UI token 定義與使用點靜態核對通過。長翻譯、視窗、多主題的實際 browser regression 仍需在後續 UI QA 覆蓋中執行。

## 4. Phase 2：基礎欄位、文字與按鈕

**目標檔案：**

- `web/src/components/common/Label.tsx`、`Text.tsx`（目前是 definition-only，需先判斷擴充或保留原生元素）
- 新增/整理的 Button、TextField、Textarea、Select/Combobox、Checkbox/Switch、RadioGroup API（檔名由選擇後決定）
- `web/src/components/common/BaseForm.tsx`
- `web/src/index.css`、`web/src/styles/ledger.css`

**狀態：共用呈現完成，原生語意保留。** Label/Text/PageTitle/SectionTitle/SubTabs/BaseForm/PopupModal/ConfirmModal 的靜態視覺值改接 semantic token；原生 controls 共用 CSS controls rules。未新增 wrapper API，避免為了樣式重寫欄位 contract。

**可達 BaseForm 消費者首輪：** `components/income/IncomeForm.tsx`、`budgets/BudgetForm.tsx`、`categories/CategoryForm.tsx`、銀行/電子錢包/卡片表單、`scheduledPayments/ScheduledPaymentForm.tsx`、支出清單內的 `expenses/RepaymentForm.tsx`。逐表單檢查 submit type、cancel/close、loading guard、欄位 required、初始值和錯誤回復。

**不可混淆的控制語意：**真值二選一且立即作用才用 switch；表單選項用 checkbox/radio；頁面內容區切換用 tabs；展開/收合用 disclosure；搜尋選項用 combobox；命令選單用 menu button。不要用帶 `onClick` 的 `div` 取代原生控制。

**驗收：**鍵盤 Tab/Space/Enter 可操作；焦點 ring 一致；label 關聯實際欄位 id；錯誤透過 `aria-describedby` 暴露；外部 ref、autofill、IME、數字輸入和瀏覽器原生 date 行為正常。

## 5. Phase 3：Dialog、表單外框、確認與 overlay

**目標檔案：** `common/PopupModal.tsx`、`common/BaseForm.tsx`、`ConfirmModal.tsx`、`FormPopup.tsx` / `Modal.tsx`（先確認是否仍無 production consumer）、必要 overlay CSS；選定候選後再決定是否抽共用 primitives。

**視覺狀態：已完成 token 接入。** `PopupModal` / `ConfirmModal` 保持原有 header/body/footer、最大寬度/高度、內容捲動、遮罩、Escape/外部點擊規則和 action order；幾何值接 shared tokens。資訊結構、手機 safe area、一般 dialog 與 destructive alert dialog 的語意分離、menu/popover/combobox anchor/focus pattern 屬尚未執行的互動/版型改進。若選 Drawer/Sheet，桌機與手機採同一資料狀態，不複製表單 state。

**目前程式邊界：**`PopupModal` 支援 Portal、Escape/遮罩關閉及 body scroll lock，但沒有 `role="dialog"`、`aria-modal`、初始焦點/focus trap/焦點返回。`ConfirmModal` 沒有 alertdialog semantics；確認會先以 `onCancel` 關閉，再以 `setTimeout(..., 0)` 呼叫 `onConfirm`，不等待 mutation 結果，也無 modal 內 loading/error。這些缺口需作為候選改進實作，不能在現況盤點或 Current 圖示中當作已存在。

**必查互動：**開啟時焦點進入適當欄位/標題；modal 期間 tab focus 不跑到背景；關閉時焦點回到觸發按鈕；saving/remote validation 時外部關閉行為與現有 guard 一致；長表單內捲時 footer 不遮欄位；手機鍵盤彈出仍能看到目前欄位/提交控制。

**刪除路徑：**Expenses/Income/Budget/Category/Payment Method/Scheduled Payment/Repayment 單筆與批次逐一核對名稱、數量、關聯副作用和取消行為。類別重新指派/刪除關聯支出屬不同操作選項，不得合併成一個含混的「刪除」。

**驗收：**WAI dialog/alertdialog keyboard and focus expectations; mobile and desktop screenshots; mutation handler 僅在 confirm 執行（目前 `ConfirmModal` 會先呼叫 close callback 再呼叫 mutation callback）；esc/遮罩行為按選擇中的政策一致；若選擇等待結果，確認失敗/離線/永久拒絕和 modal close guard 都需逐一驗證。

## 6. Phase 4：支出、收入與預算特殊表單

### 支出、收據 OCR、編輯、分攤

**token 接入：已完成。** 上述已存在 UI 的靜態字級、圓角、padding、margin、gap 已改用 shared tokens；頁面結構、資料驅動尺寸和步驟/編輯互動保留。若未來改分類選擇、tag 密度或三個編輯 tabs，需先依互動候選另行決定。

**目標檔案：** `expenses/StepByStepExpenseForm.tsx`、`ExpenseList.tsx`、`DateNavigator.tsx`、`ExpenseFiltersBar.tsx`、`ExpenseTagPicker.tsx`、`ExpenseSplitEditor.tsx`、`ExpenseSplitSummary.tsx`、`ReceiptAttachmentPanel.tsx`、`styles/ledger.css`。

**未來互動/資訊結構改版順序：**先確認共用欄位/Button 的語意，再考慮 step progress、編輯 tabs、category selector、tag chips、分攤/應收區塊，最後整理 modal/footer。新增流程、收據/OCR 草稿流程、編輯 3 tabs 三者要各自對照預覽，不可只測一條。

**必保留資料與邏輯：**expense ID/user owner、expectedRevision/F17、當前值和 draft、Now 時間由單一 snapshot 生成、currency code + rate snapshot + minor unit、category/tag/payment IDs、付款來源、receipt attachment/OCR review state、participants/paid minor values、`needsRepaymentTracking`、submit-and-add-another。保存仍走 Dashboard/domain services 和 durable outbox；取消不寫 mutation；receipt 和 split 不被未掛載 `ExpenseForm` 替代。

### 收入與預算

**token 接入：已完成。** 上述已存在 UI 的靜態幾何值改接 shared tokens；欄位/摘要資訊結構與收入連動預算的資料流程保留。

**目標檔案：** `income/IncomeForm.tsx` / `IncomeList.tsx`；`budgets/BudgetForm.tsx`、`BudgetManager.tsx`、`IncomeBudgetSettingsModal.tsx`、收入 budget summary hooks；與其調用的 service/cache hook 只在樣式改動需要時檢查，不任意更換邏輯。

**必保留資料與邏輯：**完整帳期收入 read + `applyPendingOperations`；舊用戶手動月上限分開保存；income-linked mode server transaction/revision checks；匯率不完整/來源資料不完整明確呈現；收入減少顯示缺口，不自動改類別預算；收入 edit/delete 造成 cycle summary invalidation 及局部刷新。

**驗收：**增加/編輯/刪除收入時 summary 更新；離線收入和設定經 reload 仍顯示 optimistic value；不完整帳期不顯示確定可用額度；切回手動模式時過期 allocation revision 不能覆蓋新配置。

## 7. Phase 5：Payment Methods、排程付款、還款與清單元件

**目標檔案：** `payment/PaymentMethodsTab.tsx` 及卡片/銀行/錢包表單和列表、`TransferList.tsx`、`scheduledPayments/ScheduledPaymentManager.tsx`、`ScheduledPaymentCard.tsx`、`PaymentRecordForm.tsx`、`PaymentHistoryList.tsx`、expense `RepaymentForm.tsx`、`ExpenseList.tsx`，以及已掛載 `dashboard/widgets/*`。

**token 接入：已完成。** Payment methods、排程付款、還款、清單及 widgets 的靜態幾何值改接 shared tokens。資訊密度、filter/selection、empty/loading/error 與 inline expand 結構依原畫面保留；若重排這些版型，先做獨立 interaction proposal。

**工作步驟：**未來如需重新整理 payment account summary/card/row/chip/actions，先重用現有 semantic tokens；確認清單 filter、selection、多選 toolbar、empty/loading/error、inline expand；圖表資料格式和視覺分開變更。

**金融/付款保護：**卡/銀行/錢包 ID 不重建；轉帳目前只有列表刪除掛載入口，不藉由這次 UI 統一偷加 TransferForm；還款 linked expense/participant 不變；新排程付款 record、expense、帳戶變更、friend summary 和 immutable receipt 保持現有單一 financial transaction。UI 不對付款操作做第二次樂觀 balance adjustment。

**驗收：**一筆及批次刪除影響明確；付款確認 accepted 後關閉條件沿用 handler result；重播相同 payment record ID 不會重複新增支出或調整餘額。

## 8. Phase 6：Navigation、Dashboard、Profile/Admin 與偏好

**目標檔案：** `pages/Dashboard.tsx`、`components/navigation/CompactNavigation.tsx`、`DashboardMenuSection.tsx`、`FloatingExpenseActions.tsx`、`navigationConfig.ts`、`HeaderStatusBar.tsx` / `.css`、`NetworkStatusIndicator.tsx`、`NotificationBell.tsx`、`common/SubTabs.tsx`、Profile、Admin、FeatureManager、Dashboard customizer。

**token 接入：已完成。** Navigation、Dashboard、Profile/Admin、通知及偏好畫面的靜態字級、radius 和 spacing 使用 shared tokens；依功能而異的資訊佈局和控制語意保留。

**需保留邏輯：**`tabFeatures` / `hamburgerFeatures` 排序和可見性、舊 `enabledFeatures` fallback、Profile/Admin 權限、`activeTab`、mobile active item scroll、Dashboard widget order/layout、sync events 和受影響集合局部刷新。Network status、queue status、notification、import/delete progress 是不同來源，外觀一致不代表合併資料流。管理/權限、auth 和 server-only 操作不能改成離線成功假象。

**驗收：**使用者自訂排序/顯示經重載保留；Profile/Admin 權限沒改；狀態 bar 只在既有條件出現；沒有增加每秒 storage polling 或每個操作後 refresh full dashboard。

## 9. Phase 7：CSS 清理、全面回歸與完成定義

1. 本輪已完成靜態幾何 token 接入；舊 selector 和專屬布局仍保留。後續若要刪除無 consumer 的 selector/inline style，先用 `rg` 查找 class/token 使用點再逐項處理，不得一次搬移或重命名整份 `index.css`。
2. 對照 CRUD audit 的每個可達流程、空/載入/validation/pending/success/needs-attention 逐一視覺與互動檢查。
3. 在 320/390/768/1280px、全部主題、zh-TW/en、鍵盤和 screen reader semantics 下檢查 overflow、focus trap/return、labels/errors、touch target。
4. 按改動範圍選擇元件測試/互動測試、延遲遠端、offline/reload、拒絕/rollback 和 replay-order 驗證。若觸及任何本機優先或金融行為，遵循 `docs/OFFLINE_SYNC_ARCHITECTURE.md` 並執行相應行為驗收；不能只靠靜態截圖。
5. 更新 `docs/UI_STYLE_GUIDE.md`、UI inventory、此計畫、CRUD audit、`FEATURES_AND_PAGES.md` 和 `docs/README.md`；移除已不符的舊數值/現況；保留未選定候選及實作決策記錄。
6. 本輪已執行 `git diff --check`、consumer/token 定義搜尋、變更範圍檢查、TypeScript check 和 production build；未執行 unit/component、Firebase Emulator、跨視窗/語系的 browser regression。後續完成互動改版時仍須做相應畫面與行為 review，任何未驗證項目需在驗收報告標明。

## 10. 文件與流程關聯

- [元件盤點與已採用規格](UI_COMPONENT_INVENTORY_AND_PLAN.md)：現況、數量、掛載狀態、已採用 token 和保留的 UX/F17 候選。
- [CRUD 流程盤點](CRUD_FLOW_AUDIT.md)：各項功能入口至新增/檢視/編輯/刪除及 overlay。
- [互動候選](INTERACTION_PATTERN_CANDIDATES.md)：欄位、tabs、modal/drawer、同步回饋及外部參考。
- [離線同步架構](../OFFLINE_SYNC_ARCHITECTURE.md)：IndexedDB outbox、交易和重播契約。
- [主要方法流程](../LOGIC_METHOD_FLOW.md)：目前 source method 和資料流。
- [功能頁面](../FEATURES_AND_PAGES.md)：實際路由與掛載入口。
