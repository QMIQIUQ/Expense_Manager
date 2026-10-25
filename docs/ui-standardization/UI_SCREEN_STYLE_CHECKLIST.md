# main 逐畫面 UI 樣式檢查清單

> 改動前程式基線：既有 Expense_Manager plugin 唯讀連線確認的 `main@a9a9d7c`（2026-10-25）；欄位與 label 的收斂已透過 PR #120 合併至 `main@9fce5d7`。這是 JSX/CSS source audit，沒有 authenticated browser computed-style 截圖。

這份清單將可到達的功能畫面和共用浮層拆開，核對 textbox、label、checkbox/radio、按鈕、tabs/chips、card/panel 及純 layout wrapper。完整元件檔案和 token 數字見[覆蓋矩陣](UI_STYLE_COVERAGE_MATRIX.md)；實作邏輯界線見[逐階段標準化計畫](PATTERN_STANDARDIZATION_PLAN.md)。

![共用欄位變體預覽](previews/field-variants.svg)

## 共用規格

| 部件 | 共用 style/class | 用途與例外 |
|---|---|---|
| 一般 input / select | `.ui-control--standard`：44px 最小高度、14px 字、8px × 12px padding、8px radius | 一般文字、數字與選項欄位；保留原生 type、value、handler、ref、autofill、IME 和鍵盤行為。 |
| 密集欄位 | `.ui-control--compact`：仍為 44px target 和 14px 字，縮為 4px × 8px padding | filter、toolbar 和巢狀設定；compact 指視覺 padding，不縮小觸控 target。 |
| 主要金額欄位 | `.ui-control--prominent`：52px 最小高度、16px 字、較強 border | 主要金額輸入；其他數字欄位不因此全部放大。 |
| 日期 / 複合欄位 | `.ui-control--date`、`--embedded`、`--leading-prefix`、`--trailing-action`、`--time-segment` | DatePicker 保留日曆按鈕空間；Autocomplete/QuickAdd 由外框負責 border/focus；TimePicker 內部時分欄為 28px segment。 |
| Label / error | `.ui-form-label` 14px primary；`--secondary` 和 `--tertiary` 12px 次要/較低強度；`.ui-field-error` 12px error | 需保留既有欄位 id 關聯；class 只管視覺，不自動建立 `htmlFor` 或 `aria-describedby` 關係。 |
| Checkbox / radio / switch | 可見原生 checkbox/radio 18px、主題 accent；`.sr-only` / `.ui-switch-input` 用於保留 native state 的隱藏 switch input | 不以 clickable `div` 取代原生控件。Switch track 是視覺 companion；checkbox/radio 仍保留表單語意。 |
| Buttons | Primary / secondary / danger / success / warning、icon、pill/chip、tab、selection tile、`.ui-action--compact` | 依操作語意使用對應變體。普通 form/modal action 44px，icon action 36px；不同用途不應強行同色或同密度。 |
| Card / panel / div | card/widget/feature cards 12px；dialog 16px；control 8px；chips 為 pill | `.card`、widget、ledger panel 等是 surface；純 layout `div` 只負責排版，不自動加背景、border 或 shadow。 |
| Theme / text / feedback | `--text-*`、`--accent-*`、state colors、type/spacing/radius tokens | 保留 Light/Dark/Warm Kitty theme、字體及字級偏好；同步/網路/驗證/通知各自使用來源和 state。 |

## 逐畫面清單

「已統一」表示 source 使用共享 token/class 或共用全域規則，不代表已在所有語系、主題和視窗尺寸完成瀏覽器視覺驗收。

| 畫面 | Textbox / label / checkbox | Buttons / tabs / surface | 結果與仍需留意 |
|---|---|---|---|
| Login | Email/password 使用 standard + field label；密碼顯示按鈕留 trailing space；remember-me 為原生 18px checkbox。 | 登入/註冊/主題插圖沿用現有語意；表單容器依共用卡片規則。 | 已統一呈現類別；Auth、驗證和記住我邏輯未改。 |
| Dashboard / widgets / customize | DashboardCustomizer 數字/尺寸選項為 compact；QuickAdd 的內層金額 input 為 embedded；FriendSpending 文字/日期使用 standard/date、設定 select 使用 compact。 | Widget/card 共享 12px radius；圖表、摘要、widget 排序/大小控制各自保留用途。 | 本次未重排其他 read-only widgets；資料順序和 widget layout 邏輯未改。 |
| Expenses：清單與篩選 | ExpenseFiltersBar select、list filter、saved-view 欄位、分帳參與者/金額等使用 compact/standard；日期控制走 DatePicker；選取與全日期 checkbox 使用原生尺寸。 | Saved views、tags、chips、批次工具列與 quick-save/cancel 保留操作語意；兩個 inline quick actions 使用 compact action。 | 已統一欄位變體和可見 checkbox 尺寸；選取、filter、批次 mutation handler 未改。 |
| Expenses：新增、編輯、收據/OCR | StepByStepExpenseForm 一般欄位 standard、主金額 prominent、tag/split/tax rate compact；DatePicker、TimePicker、Autocomplete 依複合控制規則。 | stepper、編輯 tabs、分類 tile、OCR/收據區和 split controls 保留各自語意；card/panel 套共用 surface geometry。 | 已統一指定欄位；分類、stepper、OCR 與 split 流程未重排。 |
| Incomes | IncomeForm 使用 standard/prominent/date 和 shared error；IncomeList 的可見選取 checkbox 使用全域 18px native rule。 | 清單操作按新增/編輯/刪除語意；收入卡片沿用 12px surface。 | 已移除重複尺寸；selection checkbox 沒有額外可見 label，screen-reader 命名可列為獨立 accessibility follow-up；收入 CRUD 不變。 |
| Categories / tags | CategoryForm 使用 standard/prominent 和 field labels；CategoryManager 篩選 select 使用 compact；radio/checkbox 維持原生。 | 分類圖示/顏色 tile、排序、tag chip 和操作按鈕保持不同的選取/管理語意。 | 色彩 picker 仍為 native specialized control；本次只收斂 label/checkbox presentation。 |
| Budgets | BudgetForm / BudgetManager / templates / income settings 使用 standard、compact、prominent 和 primary/secondary label。 | BudgetForm 保留由 native checkbox 驅動的 theme-aware custom switch；建議/歷史/summary cards 維持資訊密度。 | 已統一指定欄位和 label；收入連動預算、限額驗證與保存流程不變。 |
| Payment Methods：Cards / E-Wallets / Banks / Transfers | BankForm/CardForm/EWalletForm 使用 standard/prominent/compact；PaymentMethodSelector 使用 standard；cashback 巢狀欄位用 compact。 | 建立付款方式的緊湊按鈕、選擇 tile、color control 保留專用用途；卡片使用共同 radius。 | CardForm 主/次/tertiary label 明確區分；付款 ID 和解析/提交 handlers 不變。 |
| Payment Methods：Reconciliation | DatePicker、compact account select 和 opening/closing amount；statement movement checkbox 為原生 18px。 | ledger panel 與操作按鈕保留 ledger 專用排版；日期仍留在原有 row label 位置。 | label class 已收斂，沒有包裝或改寫對帳資料邏輯。 |
| Scheduled Payments：排程清單、日曆、分析 | ScheduledPaymentManager filter 為 compact；ScheduledPaymentForm 欄位 standard/prominent、textarea 和 checkbox label 使用共用樣式。 | 日曆/分析 tabs、排程卡片、分帳/提醒控制保留原互動語意。 | 已移除 checkbox 的 `w-4 h-4` 衝突；付款與提醒資料流程未改。 |
| Payment Record / repayment | PaymentRecordForm 使用 standard/full-width、日期和 textarea shared variants；ExpenseList 內 RepaymentForm 是 mounted entry。 | 付款記錄、確認/還款和列表按鈕依操作語意保留；不把舊 RepaymentManager 當目前獨立頁面。 | 財務 mutation 與 transaction 流程未改。 |
| Settings / date shortcuts / theme | FeatureManager numeric input 為 compact；DateShortcuts 的可見 checkbox 使用 18px native rule；字級/字體/主題選項維持原生控件。 | Date shortcut 選項卡片、theme controls 和 reorder actions 保留 selected/setting 語意。 | 本次移除重複 checkbox 寬高宣告；偏好保存邏輯未改。 |
| Profile | Profile reset-day 使用 compact；其他個人資訊沿用原生 control/theme baseline。 | Profile card radius 12px；權限外操作保留目前入口。 | Profile/settings mutation 未改。 |
| Admin | Admin fields 使用 shared rules；visible permission/settings checkbox 由全域 18px native rule 控制。 | Admin 操作依權限、危險程度保留語意變體；卡片/表格維持既有布局。 | label/checkbox 樣式已收斂；權限檢查和伺服器操作未改。 |
| 全域導覽、狀態、浮層 | search/autocomplete/date/currency/time 保留各自外層責任；錯誤、disabled、focus 使用 shared token/state。 | CompactNavigation、SubTabs、stepper、PopupModal/ConfirmModal、通知、同步/網路狀態、PWA prompt 各自保留元件角色。 | Dialog 的 focus trap/return 與 ARIA completeness 是既有後續項目；本次未變更。 |

## 來源掃描結果與有意保留項

- 目前工作樹的 AST scan 有 **151** 個一般 input/select/textarea；**134** 個有 named field variant。剩餘 **17** 個只在未掛載的 `ExpenseForm.tsx`、legacy `RecurringForm.tsx`、legacy `repayment/RepaymentForm.tsx`、`TransferForm.tsx`。掛載資訊依 `App.tsx` / `Dashboard.tsx`；重新掛載前須再次核對。
- 目前 TSX 有 **154** 個 `<label>`，其中 **127** 使用 `.ui-form-label` primary/secondary/tertiary classes。其餘 27 個包含 switch/toggle wrapper、CardForm section label、TimePicker 專用 label、definition-only `Label.tsx`，以及未掛載 form/register；不要把它們全部改成普通欄位 label。
- 目前 source 有 **30** 個 checkbox 節點，其中 1 個是隱藏 switch input；可見 native checkbox/radio 尺寸由 shared CSS 固定為 18px。僅未掛載 `ExpenseForm.tsx` 仍留兩個 `w-4 h-4` utility；沒有可到達頁面需要保留此尺寸覆寫。
- **343** 個 JSX button 中有 205 個明確 className、174 個 inline style object。這些數字是 source 結構，不是缺陷數；按鈕要按 primary/danger/icon/chip/tab/tile/domain action 分組檢查，不得把不同語意改成一套樣式。
- `.card`/widget/card family 共用 12px radius，dialog 16px，controls 8px；一般 `div` 是結構容器，只有明確 card/panel role 才有 surface styling。現有圖表、密集資料列、日期/幣別/時間 composite 不因共用幾何而被改成相同 layout。
- 來源掃描未檢查登入後實際 computed style、全部 theme、語言、320/390/768/1280px、keyboard focus/error/disabled 狀態；SVG preview 是設計示意，不是 app screenshot。合併前仍需在實際畫面做對應 browser QA。

## 未掛載 source 的處理

`Register.tsx` 沒有 `/register` route；`ExpenseForm.tsx`、`TransferForm.tsx`、legacy `RecurringForm.tsx` / `repayment/RepaymentForm.tsx` 不在目前主要掛載鏈。這些 source 可留待復用時參照 shared tokens，但不計入「目前使用者看到的頁面已統一」結論。詳細證據見[元件盤點與掛載狀態](UI_COMPONENT_INVENTORY_AND_PLAN.md)。
