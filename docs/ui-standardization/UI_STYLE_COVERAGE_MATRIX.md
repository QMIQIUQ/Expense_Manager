# UI 樣式覆蓋矩陣

> 基準：origin/main 884d3be（2026-10-25）。本輪 UI 實作已套用於隔離 main-based worktree；所有 production TSX/CSS 來源在下表列出。測試 TSX 不算 production screen。

## 覆蓋摘要

- Production TSX：**135**（完整檔案清單見下表）；包含測試的 TSX 總數為 182。
- JSX inline style object：**763**，分布於 **87** 個 production TSX 檔。數量維持原值；本次統一靜態樣式值，沒有刪改表單 callback 或重新包裝欄位。
- **63** 個 production TSX 檔使用共用 UI tokens。TSX 中 token 引用：字級 **468**、圓角 **281**、間距 **1139**。
- CSS 檔：**10**（原有 9 個，加上共用層 web/src/styles/ui-system.css）。所有來源仍可在下列 CSS 清單核對。
- ui-system.css 定義 **145** 個 --ui-* custom properties；掃描 TSX、TS 與 CSS 的 --ui-* 引用，未定義 token：**0**。
- 共有樣式規則統一輸入欄位/選擇器/textarea、原生 checkbox/radio、標準按鈕、icon 按鈕、卡片、dialog、標題、tabs、chips 與 focus ring。舊 UI 的固定字級、圓角和 spacing 改用相容 alias，保持原尺寸；新 UI 應選 semantic tokens。
- ThemeContext 的 theme、serif/mono/system 字體與 small/medium/large 根字級設定保留；色彩仍由 light/dark/Warm Kitty 主題變數提供。
- component state、CRUD callback、domain/service、Firebase、IndexedDB outbox、讀取/replay 路徑沒有修改。未掛載的 source 仍列在完整清單內，但不能當成使用者可達畫面。

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

## 驗證與範圍

- npm run build：TypeScript、Vite production build 和 PWA service worker build 通過；只顯示既有 Browserslist / baseline-browser-mapping 資料過期警告。
- npx tsc --noEmit：通過。
- --ui-* 定義/引用一致性：通過（未定義 token 0）。
- git diff --check：通過。
- 未執行 unit/component、Firebase Emulator 或 browser regression suite；本次為純呈現層，沒有改動 AGENTS 中規定的 financial/local-first data path。
- SVG 預覽是標示為 implemented-specimen 的矢量示意，不是 authenticated browser screenshot。畫面掛載和 mounted/source-only 區別見 UI_COMPONENT_INVENTORY_AND_PLAN.md；交互流程/保護界線見 CRUD_FLOW_AUDIT.md。
