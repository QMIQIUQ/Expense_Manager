# UI 樣式覆蓋矩陣

> 靜態計數基準：改動前 `main@a9a9d7c`（2026-10-25）。下方每檔 inline-style/token 數字和 CSS token 引用數均是 main snapshot 的 source-level baseline，不是目前分支的重新計數。分支 `codex/ui-standardization-inventory` 已修改 selected UI controls；尚未合併到 main。測試 TSX 不算 production screen。

## 本分支實作差異

- 共享層提供 Standard / Compact / Prominent / Date / Embedded / Leading-prefix / Time-segment 欄位 variants、primary/secondary/tertiary labels、field error、compact action、theme-aware switch track 和 shared focus/error state。
- 遷移頁面/元件：Login、BankForm/CardForm/EWalletForm、BudgetManager/BudgetForm/BudgetTemplates/IncomeBudgetSettingsModal、CategoryManager/CategoryForm/ExpenseTagManager、PaymentMethodSelector/AccountReconciliationManager、SearchBar、ExpenseList/ExpenseFiltersBar/ExpenseSavedViews/ExpenseSplitEditor/ExpenseTagPicker/ReceiptAttachmentPanel/StepByStepExpenseForm、IncomeForm/IncomeList/DatePicker、ScheduledPaymentManager/ScheduledPaymentForm/PaymentRecordForm、AdminTab/Register/UserProfile、FeatureManager/DateShortcutsSettings/DashboardCustomizer/QuickAddWidget/FriendSpendingWidget、AutocompleteDropdown、TimePicker，以及 TrackedExpensesWidget card geometry。
- 複合欄位例外：Autocomplete 和 QuickAdd 的內層 input 使用 embedded variant，由外框負責 border/focus；TimePicker 的小時/分鐘欄位保留 28px embedded geometry，外框提供 focus ring。
- 保留原生欄位類型、值、handler、ID mapping、鍵盤/combobox 互動、視覺特化的日期/幣別/金額欄位、流程布局和金融 mutation/read paths。
- 以下完整 per-file 表格繼續描述改動前 main 的 135 個 production TSX 靜態計數，避免把基線計數誤讀為這個分支當前數值。逐頁控制類別和例外見 [逐畫面清單](UI_SCREEN_STYLE_CHECKLIST.md)，掛載狀態和分支進度見 [元件盤點](UI_COMPONENT_INVENTORY_AND_PLAN.md#71-main-逐畫面一致性檢查清單)。

## 覆蓋摘要

- Production TSX：**135**（完整檔案清單見下表）；包含測試的 TSX 總數為 182。
- Literal JSX `style={{...}}` object：**762**，分布於 **87** 個 production TSX 檔；同一個欄位可能另有 className/Tailwind 或功能 CSS override，這個數量不表示 762 個不一致控制。
- Native input/select/textarea controls：**192**（input 133、select 52、textarea 7）。AST 計數只列節點，不等於 192 個獨立畫面或 192 個視覺缺陷。
- 分支可編輯欄位靜態掃描：151 個一般 input/select/textarea（不含 checkbox/radio/color/file/range/hidden/button）。134 個明確使用 shared named variants；剩餘 17 個全屬未掛載的 ExpenseForm/RecurringForm/舊 RepaymentForm/TransferForm。AutocompleteDropdown 的內層 input 已標記 embedded variant，由外框負責 border/focus。這是 TSX class coverage，不是 computed-style 或畫面測試。
- 分支 label AST scan：154 個 `<label>`，127 個採 `.ui-form-label` primary/secondary/tertiary classes；27 個未採一般欄位 label class，包含 switch/toggle、section heading、TimePicker 專用 label、definition-only 元件和未掛載 source。
- 分支 checkbox AST scan：30 個 checkbox 節點（29 個可見，1 個隱藏 switch）；可見原生控件套用共用 18px rule。剩餘兩個 `w-4 h-4` utility 都在未掛載 `ExpenseForm.tsx`。
- Button source scan：343 個 JSX button，205 個含 `className`、174 個有 inline `style`；這些是結構計數，不是未統一問題數。action、icon、chip/tab、selection tile 和 domain controls 按語意分類，不能視為同一種按鈕。
- **63** 個 production TSX 檔使用共用 UI tokens。TSX 中 token 引用：字級 **468**、圓角 **281**、間距 **1139**。
- CSS 檔：**10**（原有 9 個，加上共用層 web/src/styles/ui-system.css）。所有來源仍可在下列 CSS 清單核對。
- ui-system.css 定義 **145** 個不同的 --ui-* custom properties；掃描 TSX、TS 與 CSS 的 --ui-* 引用，未定義 token：**0**。
- Shared CSS 提供輸入欄位/選擇器/textarea、原生 checkbox/radio、標準按鈕、icon 按鈕、卡片、dialog、標題、tabs、chips 與 focus ring 的 global baseline；局部 inline style、Tailwind 和功能 CSS 仍可覆寫它。逐頁控制類別和保留差異見 [逐畫面 UI 樣式清單](UI_SCREEN_STYLE_CHECKLIST.md)。
- ThemeContext 的 theme、serif/mono/system 字體與 small/medium/large 根字級設定保留；色彩仍由 light/dark/Warm Kitty 主題變數提供。
- main baseline audit 未修改 component state、CRUD callback、domain/service、Firebase、IndexedDB outbox、讀取/replay 路徑。分支呈現層修改也保留上述邏輯與未掛載 source；未執行 unit/component、Firebase Emulator 或 browser computed-style inspection。未掛載的 source 仍列在完整清單內，但不能當成使用者可達畫面。

## Production TSX 完整檔案清單

| Source file | Inline style object count | UI token references |
|---|---:|---:|
| web/src/App.tsx | 0 | 0 |
| web/src/components/CatIllustration.tsx | 0 | 0 |
| web/src/components/ConfirmModal.tsx | 0 | 22 |
| web/src/components/HeaderNotification.tsx | 0 | 0 |
| web/src/components/HeaderStatusBar.tsx | 2 | 0 |
| web/src/components/InlineLoading.tsx | 3 | 1 |
| web/src/components/LocalDataBoundary.tsx | 2 | 2 |
| web/src/components/Modal.tsx | 1 | 2 |
| web/src/components/NetworkStatusIndicator.tsx | 0 | 0 |
| web/src/components/NotificationBell.tsx | 17 | 33 |
| web/src/components/PWAInstallButton.tsx | 1 | 1 |
| web/src/components/PWAInstallPrompt.tsx | 11 | 25 |
| web/src/components/PrivateRoute.tsx | 0 | 0 |
| web/src/components/ThemeToggle.tsx | 0 | 0 |
| web/src/components/banks/BankForm.tsx | 9 | 0 |
| web/src/components/banks/BankManager.tsx | 8 | 14 |
| web/src/components/budgets/BudgetAdjustmentCard.tsx | 4 | 34 |
| web/src/components/budgets/BudgetForm.tsx | 20 | 0 |
| web/src/components/budgets/BudgetHistory.tsx | 8 | 28 |
| web/src/components/budgets/BudgetManager.tsx | 6 | 163 |
| web/src/components/budgets/BudgetSuggestionCard.tsx | 1 | 0 |
| web/src/components/budgets/BudgetTemplates.tsx | 4 | 67 |
| web/src/components/budgets/IncomeBudgetSettingsModal.tsx | 0 | 0 |
| web/src/components/budgets/IncomeBudgetSummary.tsx | 0 | 0 |
| web/src/components/cards/CardForm.tsx | 36 | 0 |
| web/src/components/cards/CardManager.tsx | 6 | 12 |
| web/src/components/categories/CategoryForm.tsx | 8 | 0 |
| web/src/components/categories/CategoryManager.tsx | 11 | 111 |
| web/src/components/categories/ExpenseTagManager.tsx | 0 | 0 |
| web/src/components/common/AutocompleteDropdown.tsx | 2 | 0 |
| web/src/components/common/BaseForm.tsx | 1 | 20 |
| web/src/components/common/CurrencyAmount.tsx | 0 | 0 |
| web/src/components/common/CurrencySelector.tsx | 3 | 25 |
| web/src/components/common/DatePicker.tsx | 0 | 0 |
| web/src/components/common/DisplayCurrencyAmount.tsx | 0 | 0 |
| web/src/components/common/DisplayCurrencyControl.tsx | 0 | 2 |
| web/src/components/common/FeatureLoadBoundary.tsx | 0 | 0 |
| web/src/components/common/FormPopup.tsx | 0 | 1 |
| web/src/components/common/Label.tsx | 2 | 3 |
| web/src/components/common/MultiSelectToolbar.tsx | 4 | 10 |
| web/src/components/common/PageTitle.tsx | 1 | 2 |
| web/src/components/common/PaymentMethodSelector.tsx | 5 | 40 |
| web/src/components/common/PopupModal.tsx | 4 | 25 |
| web/src/components/common/RadialDateMenu.tsx | 8 | 11 |
| web/src/components/common/SearchBar.tsx | 1 | 4 |
| web/src/components/common/SectionTitle.tsx | 1 | 2 |
| web/src/components/common/SubTabs.tsx | 0 | 5 |
| web/src/components/common/Text.tsx | 1 | 4 |
| web/src/components/common/TimePicker.tsx | 2 | 0 |
| web/src/components/dashboard/CardsSummary.tsx | 1 | 0 |
| web/src/components/dashboard/CustomizableDashboard.tsx | 0 | 0 |
| web/src/components/dashboard/DashboardCustomizer.tsx | 1 | 4 |
| web/src/components/dashboard/DashboardSummary.tsx | 4 | 3 |
| web/src/components/dashboard/widgets/BudgetProgressWidget.tsx | 2 | 0 |
| web/src/components/dashboard/widgets/CardsSummaryWidget.tsx | 3 | 6 |
| web/src/components/dashboard/widgets/CategoryBreakdownWidget.tsx | 1 | 0 |
| web/src/components/dashboard/widgets/ExpenseChartWidget.tsx | 2 | 1 |
| web/src/components/dashboard/widgets/FriendSpendingWidget.tsx | 1 | 0 |
| web/src/components/dashboard/widgets/InstallmentTrackerWidget.tsx | 13 | 14 |
| web/src/components/dashboard/widgets/MonthOverMonthWidget.tsx | 0 | 0 |
| web/src/components/dashboard/widgets/PendingPaymentsWidget.tsx | 1 | 0 |
| web/src/components/dashboard/widgets/QuickAddWidget.tsx | 1 | 0 |
| web/src/components/dashboard/widgets/RecentExpensesWidget.tsx | 0 | 0 |
| web/src/components/dashboard/widgets/SavingsGoalWidget.tsx | 1 | 0 |
| web/src/components/dashboard/widgets/ShowMoreButton.tsx | 0 | 0 |
| web/src/components/dashboard/widgets/SpendingAnomalyWidget.tsx | 0 | 0 |
| web/src/components/dashboard/widgets/SpendingTrendWidget.tsx | 2 | 0 |
| web/src/components/dashboard/widgets/SummaryCardsWidget.tsx | 2 | 2 |
| web/src/components/dashboard/widgets/TagCloudWidget.tsx | 2 | 4 |
| web/src/components/dashboard/widgets/TrackedExpensesWidget.tsx | 1 | 0 |
| web/src/components/dashboard/widgets/UpcomingBillsWidget.tsx | 8 | 8 |
| web/src/components/dashboard/widgets/WidgetContainer.tsx | 1 | 0 |
| web/src/components/ewallet/EWalletForm.tsx | 23 | 0 |
| web/src/components/ewallet/EWalletManager.tsx | 9 | 16 |
| web/src/components/expenses/DateNavigator.tsx | 3 | 39 |
| web/src/components/expenses/ExpenseFiltersBar.tsx | 1 | 0 |
| web/src/components/expenses/ExpenseForm.tsx | 22 | 1 |
| web/src/components/expenses/ExpenseList.tsx | 38 | 177 |
| web/src/components/expenses/ExpensePeriodChart.tsx | 0 | 0 |
| web/src/components/expenses/ExpensePeriodSummary.tsx | 0 | 31 |
| web/src/components/expenses/ExpenseSavedViews.tsx | 0 | 0 |
| web/src/components/expenses/ExpenseSplitEditor.tsx | 0 | 0 |
| web/src/components/expenses/ExpenseSplitSummary.tsx | 0 | 0 |
| web/src/components/expenses/ExpenseTagPicker.tsx | 1 | 0 |
| web/src/components/expenses/PeriodPickerModal.tsx | 0 | 0 |
| web/src/components/expenses/ReceiptAttachmentPanel.tsx | 0 | 0 |
| web/src/components/expenses/StepByStepExpenseForm.tsx | 48 | 270 |
| web/src/components/icons/index.tsx | 0 | 0 |
| web/src/components/importexport/ImportExportModal.tsx | 2 | 89 |
| web/src/components/income/IncomeForm.tsx | 17 | 0 |
| web/src/components/income/IncomeList.tsx | 9 | 68 |
| web/src/components/navigation/CompactNavigation.tsx | 0 | 0 |
| web/src/components/navigation/DashboardMenuSection.tsx | 0 | 0 |
| web/src/components/navigation/FloatingExpenseActions.tsx | 0 | 0 |
| web/src/components/payment/PaymentMethodsTab.tsx | 1 | 7 |
| web/src/components/reconciliation/AccountReconciliationManager.tsx | 0 | 0 |
| web/src/components/recurring/RecurringExpenseManager.tsx | 22 | 71 |
| web/src/components/recurring/RecurringForm.tsx | 7 | 0 |
| web/src/components/repayment/RepaymentForm.tsx | 7 | 0 |
| web/src/components/repayment/RepaymentList.tsx | 1 | 24 |
| web/src/components/repayment/RepaymentManager.tsx | 0 | 0 |
| web/src/components/scheduledPayments/BulkPaymentConfirm.tsx | 22 | 0 |
| web/src/components/scheduledPayments/PaymentAnalytics.tsx | 36 | 0 |
| web/src/components/scheduledPayments/PaymentCalendarView.tsx | 15 | 0 |
| web/src/components/scheduledPayments/PaymentHistoryList.tsx | 26 | 30 |
| web/src/components/scheduledPayments/PaymentRecordForm.tsx | 29 | 4 |
| web/src/components/scheduledPayments/ScheduledPaymentCard.tsx | 20 | 50 |
| web/src/components/scheduledPayments/ScheduledPaymentForm.tsx | 44 | 0 |
| web/src/components/scheduledPayments/ScheduledPaymentManager.tsx | 6 | 22 |
| web/src/components/scheduledPayments/UpcomingReminders.tsx | 8 | 0 |
| web/src/components/settings/DateShortcutsSettings.tsx | 15 | 32 |
| web/src/components/settings/FeatureManager.tsx | 6 | 58 |
| web/src/components/transfer/TransferForm.tsx | 12 | 15 |
| web/src/components/transfer/TransferList.tsx | 3 | 3 |
| web/src/contexts/AuthContext.tsx | 1 | 12 |
| web/src/contexts/LanguageContext.tsx | 0 | 0 |
| web/src/contexts/NotificationContext.tsx | 0 | 0 |
| web/src/contexts/PWAContext.tsx | 0 | 0 |
| web/src/contexts/ThemeContext.tsx | 0 | 0 |
| web/src/contexts/UserSettingsContext.tsx | 0 | 0 |
| web/src/hooks/useExpenseDuplicateGuard.tsx | 0 | 0 |
| web/src/main.tsx | 0 | 0 |
| web/src/pages/Dashboard.tsx | 19 | 0 |
| web/src/pages/Home.tsx | 6 | 15 |
| web/src/pages/Login.tsx | 19 | 0 |
| web/src/pages/Register.tsx | 14 | 16 |
| web/src/pages/UserProfile.tsx | 2 | 0 |
| web/src/pages/tabs/AdminTab.tsx | 8 | 115 |
| web/src/pages/tabs/BudgetsTab.tsx | 0 | 1 |
| web/src/pages/tabs/CategoriesTab.tsx | 0 | 1 |
| web/src/pages/tabs/DashboardHomeTab.tsx | 0 | 0 |
| web/src/pages/tabs/ExpensesTab.tsx | 0 | 0 |
| web/src/pages/tabs/IncomesTab.tsx | 1 | 9 |
| web/src/pages/tabs/RecurringTab.tsx | 0 | 1 |
| web/src/test/test-utils.tsx | 0 | 0 |

## CSS 完整檔案清單

| CSS source | UI token references |
|---|---:|
| web/src/cat-theme.css | 11 |
| web/src/components/HeaderStatusBar.css | 27 |
| web/src/components/InlineLoading.css | 2 |
| web/src/components/ThemeToggle.css | 20 |
| web/src/components/budgets/IncomeBudgetSummary.css | 0 |
| web/src/index.css | 966 |
| web/src/pages/UserProfile.css | 96 |
| web/src/pages/tabs/AdminTab.css | 17 |
| web/src/styles/ledger.css | 8 |
| web/src/styles/ui-system.css | 41 |

## Baseline 計數與驗證範圍

- 改動前 `main@a9a9d7c` source scan：production TSX 135、JSX inline style object literal 762/87 files、native input/select/textarea 192；TSX token references: font 468、radius 281、spacing 1139。
- --ui-* 定義/引用 source scan：145 個不同 custom properties，未定義 token 0。
- 分支 `npm run build` 和 `git diff --check` 通過。未執行 unit/component、Firebase Emulator 或 browser computed-style inspection；這份 baseline 盤點只證明舊 source 的宣告/覆寫，不能取代實際視窗、主題、字體縮放、focus/error/disabled 狀態檢查。
- SVG 預覽是 UI 規格示意，不是 authenticated browser screenshot。畫面掛載和 mounted/source-only 區別見 UI_COMPONENT_INVENTORY_AND_PLAN.md；interaction/data-flow 保護界線見 CRUD_FLOW_AUDIT.md。
