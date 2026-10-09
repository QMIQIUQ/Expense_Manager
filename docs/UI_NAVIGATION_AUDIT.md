# UI 架構與導覽排列盤點

> 盤點日期：2026-10-09
> 依據：`web/src` 目前程式碼。本文把已實作狀態（As-is）和建議方案（Proposed）分開；建議尚未代表產品已修改。

## 1. 目前 UI 架構（As-is）

### 路由與頁面容器

`web/src/App.tsx` 目前提供登入入口 `/`、舊網址 `/login`（轉回 `/`）及受保護的 `/dashboard`。未知網址也回到 `/`。`web/src/pages/Register.tsx` 雖存在，但 Router 沒有掛載 `/register`。登入後的功能頁不是各自的網址；`web/src/pages/Dashboard.tsx` 以 `activeTab` 在同一個 `/dashboard` 容器內切換十種 `FeatureTab`。因此重新整理會回到預設 Dashboard，瀏覽器上一頁/下一頁也不會切換功能頁籤。

```text
main.tsx providers: Theme / Language / Auth / Notification / User Settings
└── App.tsx + PWAProvider
    ├── PWAInstallPrompt (global install prompt)
    └── Router
        ├── /                         Login
        ├── /login                    redirect → /
        └── /dashboard [PrivateRoute]
            └── Dashboard shell
                ├── Header: 品牌、歡迎訊息、通知、☰ 工具選單
                ├── HeaderStatusBar: 同步/匯入/刪除進度
                ├── Main feature tabs: 由功能設定決定顯示與順序
                ├── Active tab content: 共用內容卡片
                ├── Add expense / receipt actions
                └── Modal、Bottom Sheet、日期快捷選單
```

### 主要頁面、入口與實際內容

| 入口 | 目前顯示的內容 | 主要程式位置 | 目前位置 |
|---|---|---|---|
| Dashboard | 可自訂 Widget、摘要、趨勢、預算/付款提醒與快速新增 | `components/dashboard/CustomizableDashboard.tsx`、`components/dashboard/widgets/` | 主頁籤 |
| Expenses | 支出日期/期間導覽、搜尋篩選、清單與批次操作 | `pages/tabs/ExpensesTab.tsx`、`components/expenses/` | 主頁籤 |
| Incomes | 收入記錄與新增/編輯 | `pages/tabs/IncomesTab.tsx`、`components/income/` | 主頁籤 |
| Categories | 分類管理 | `components/categories/CategoryManager.tsx` | 主頁籤 |
| Budgets | 預算管理與進度 | `components/budgets/BudgetManager.tsx` | 主頁籤 |
| Recurring | Dashboard 的 `recurring` 頁籤目前掛載 `ScheduledPaymentManager`：清單、月曆、分析三種檢視 | `components/scheduledPayments/ScheduledPaymentManager.tsx`、`PaymentCalendarView.tsx`、`PaymentAnalytics.tsx` | 主頁籤；內容內另有 3 個檢視頁籤 |
| Payment Methods | 信用卡、電子錢包、銀行、轉帳紀錄 | `components/payment/PaymentMethodsTab.tsx`、`components/common/SubTabs.tsx` | 主頁籤；內容內另有 4 個子頁籤 |
| Settings | 功能啟用、主頁籤/漢堡選單位置與排序 | `components/settings/FeatureManager.tsx` | 主頁籤 |
| Profile | 個人資料 | `pages/UserProfile.tsx` | ☰ 選單 |
| Admin | 管理功能；只有管理員會看到入口 | `pages/tabs/AdminTab.tsx` | ☰ 選單 |

`pages/tabs/RecurringTab.tsx` 和 `components/recurring/RecurringExpenseManager.tsx` 仍在來源樹內，但 `Dashboard.tsx` 目前渲染的是 `ScheduledPaymentManager`。新增導覽或更新功能表時，應以 Dashboard 的實際掛載為準，避免把未掛載的舊元件當成現行入口。

### 導覽設定與頂部版面

- Dashboard 外層使用 `max-w-7xl` 容器。頂列左側是品牌/歡迎文字，右側有通知和 ☰ 選單；下方依序顯示狀態列、主要頁籤和內容卡片。
- 主頁籤預設包含 Dashboard、Expenses、Incomes、Categories、Budgets、Recurring、Payment Methods、Settings。Profile/Admin 從主頁籤排除，由 ☰ 選單固定提供。
- `FeatureManager` 可分別排列和啟用主頁籤及漢堡選單功能；設定保存在 `tabFeatures`、`hamburgerFeatures`。舊資料會回退至 `enabledFeatures`，再回退至 `DEFAULT_FEATURES`。舊 `cards` / `ewallets` 名稱會合併為 `paymentMethods`。
- ☰ 選單同時承載網路狀態、語言、外觀（主題/字體/字級）、功能捷徑、匯入/匯出、離線待上傳操作、個人資料、管理員入口和登出。當 `hamburgerFeatures` 包含主頁籤功能時，同一功能也會在 ☰ 清單重複出現。
- `UI_STYLE_GUIDE.md` 第 5 節示範的 Portal 漢堡選單是卡片內的 `⋮` 操作選單；它和 Dashboard 頁首的 `☰` 工具選單是兩種不同元件。

### 子導覽、操作與浮層

- Payment Methods 內有 Cards、E-Wallets、Banks、Transfers 子頁籤。
- Scheduled Payments 內有 List、Calendar、Analytics 檢視；支出頁另有日期/期間、分類與搜尋篩選控制。這些屬於該功能內的次級導覽。
- Dashboard Widget 可自訂顯示與排序，並能導向對應支出、預算、付款和帳戶區域。
- 全域「新增支出」與「掃描收據」按鈕提供快速新增；長按新增按鈕會開啟日期快捷選單。Expenses 頁與其他頁使用不同的表單容器狀態，但共用逐步填寫表單。
- 新增/編輯表單、匯入、確認、儀表板自訂等使用 Modal、Popup 或 Bottom Sheet。頁首狀態列顯示重新驗證、匯入和刪除進度。
- 登入以外的全域 UI 還包括 PWA 安裝提示及主題、語言、驗證、通知、使用者設定等 Context 提供的狀態。

### 響應式行為（現況）

| 寬度/判斷 | 目前行為 |
|---|---|
| 所有寬度 | 主頁籤列以橫向 Flex 排列，允許水平捲動；隱藏水平捲軸。 |
| `≥640px` | CSS 讓每個主頁籤平均伸展。 |
| `≤768px` | Dashboard 的 `isMobile` 讓新增/掃描按鈕縮成圖示圓鈕。 |
| `≤480px` | 內容間距縮小。 |
| `≤360px` / `≤320px` | 頁籤最小寬度和字級進一步縮小。 |

目前沒有固定手機底部導覽列，也沒有明顯的主頁籤溢出提示。640px 的頁籤 CSS 切換點和 768px 的 FAB 判斷點各自服務不同樣式，規劃新導覽時要清楚定義斷點，不要假設它們是同一個值。

## 2. 目前排列的主要問題

1. **主功能與工具同在一個漢堡選單**：語言、外觀、匯入匯出、同步狀態和帳戶操作混排；工具增加時，選單會更長。
2. **同一導覽有兩個入口**：主頁籤和漢堡「Features」可能同時列出相同功能，使用者不易判斷哪一列才是主要導覽。
3. **手機主要導覽需要橫向摸索**：頁籤可捲動但隱藏捲軸，無溢出提示，也不會明確提示還有更多頁籤。
4. **功能名稱和實際元件不完全一致**：主頁籤叫 Recurring，現行內容是排程付款管理；舊的 RecurringExpenseManager 仍存在但未由 Dashboard 掛載。
5. **頁面狀態不在網址中**：無法直接分享某個功能頁或檢視，也不能用瀏覽器返回切換主頁籤。
6. **導覽程式集中在大型 Dashboard 元件**：功能列表、名稱對照、選單內容和切換狀態集中在 `Dashboard.tsx`，整理導覽時容易造成重複或規則不一致。

## 3. 建議的導覽與排列（Proposed）

### 桌機建議

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 品牌 / 歡迎訊息                 ＋新增支出    通知    個人/工具選單 │
├─────────────────────────────────────────────────────────────────────┤
│ 總覽 │ 支出 │ 收入 │ 預算 │ 定期付款 │ 帳戶 │ 分類 │ 更多 ▾        │
├─────────────────────────────────────────────────────────────────────┤
│ 狀態/同步提示（需要時顯示）                                         │
├─────────────────────────────────────────────────────────────────────┤
│ 當前頁面標題、頁面專屬篩選和操作                                  │
│                                                                     │
│ 當前頁面內容                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

- 保留一列清晰的主要目的地，優先放 Dashboard、Expenses、Incomes、Budgets、Scheduled Payments、Payment Methods 和 Categories；在窄桌機寬度可把低頻的 Categories 或其他次要入口收進「更多」。
- 將「Recurring」入口改成明確的「定期付款」或「排程付款」，與實際掛載的 `ScheduledPaymentManager` 一致。若要重新啟用舊定期支出頁，先另行決定它是否為獨立功能。
- 移除 ☰ 選單中重複的主要頁面捷徑；☰/個人選單只放語言、主題/字體、匯入匯出、離線同步狀態、Profile、Admin（管理員限定）、登出及功能自訂入口。
- 主要導覽列的「更多」只作為窄桌機的溢出入口，不再當第二份完整頁籤清單。用 `tabFeatures` 個人化順序時仍保留使用者選擇，溢出項目不應消失。
- 讓狀態/同步提示只在有狀態要告知時顯示，避免空白列永久擠壓內容；把頁面標題和篩選器留給當前頁面，避免在全域頁首放過多頁面專屬控制。

### 手機方案比較

| 方案 | 排列 | 優點 | 代價/需驗證 |
|---|---|---|---|
| **A. 低風險，建議先做** | 保留橫向主頁籤；只顯示常用目的地，其餘收進明確的「更多」。顯示邊緣漸層/箭頭提示、切頁時將作用中頁籤捲入可視區；☰ 精簡成工具/帳戶選單。 | 保留現有 `activeTab` 和主要版面，改動範圍小；可沿用功能自訂設定。 | 要驗證長語系標籤、超窄螢幕、鍵盤捲動和「更多」內的排序/啟用狀態。 |
| **B. 手機底部導覽，後續原型** | 固定底列：總覽、支出、中央「＋新增」、預算、更多；「更多」以分組清單提供收入、定期付款、帳戶、分類、設定、個人/管理。 | 高頻入口固定可見，單手操作更容易；長功能清單不佔首屏。 | 需處理 FAB/新增入口重疊、PWA `safe-area-inset-bottom`、較短螢幕內容空間、鍵盤遮擋及目前功能自訂行為。 |

**建議採用順序：**先做 A，整理重複入口並讓溢出可見；A 穩定後再用 B 做手機原型，確認導覽頻率與 PWA 安全區域，再決定是否取代橫向頁籤。兩案都沿用目前主色、暗色模式、語言和字級設定。

### 個人化設定建議

- `FeatureManager` 改為單一「顯示於」選擇：主導覽、更多，並提供預設排序；避免同一功能同時被加入主導覽和工具選單。
- 設定項如語言、主題、字體不應被當成主頁面功能來排序；Profile/Admin/登出維持在個人/工具區，其中 Admin 僅管理員可見。
- 保留舊 `enabledFeatures`、`tabFeatures`、`hamburgerFeatures` 資料相容性；遷移時把舊 `hamburgerFeatures` 的業務頁入口放入「更多」，避免消失或重複。
- 之後若需要分享/返回到特定頁面，再將 `activeTab` 同步到 URL；此項目獨立於本輪的導覽整理，避免一次改動路由和使用者設定兩套狀態。

## 4. 分階段執行

### P1：導覽清理與可見性

整理主頁籤名稱，讓排程付款標籤符合實際內容；移除漢堡選單重複功能捷徑，將工具和帳戶操作分組。手機版先保留橫向頁籤，補上溢出提示、作用中自動捲動與點擊範圍。

### P2：導覽設定單一化

將目前兩份位置清單整理成主導覽/更多兩個位置，保留排序與啟用狀態，為舊設定提供遷移與回退策略。把頁面名稱、圖示、位置規則集中定義，避免 `Dashboard.tsx` 重複維護 label map。

### P3：手機底部導覽原型

單獨驗證底部導覽、中心新增按鈕和「更多」分組頁。檢查安全區域、PWA 顯示、FAB/表單狀態、鍵盤操作與不同語言後再決定是否採用。

### P4：網址與深連結（可選）

將主功能狀態同步至子路徑或 query/hash，支援直接開啟、重新整理和瀏覽器上一頁/下一頁；如需直接定位子頁籤，再把 Payment Methods / Scheduled Payments 的內部檢視納入 URL。

## 5. 無障礙與互動驗收準則

- 主導覽以 `<nav aria-label="Main navigation">` 表示；作用中目的地有可程式辨識的 `aria-current="page"` 或符合預期的 tab 語意。
- ☰、More、通知和圖示操作有清楚的本地化名稱及 `aria-expanded` / `aria-controls`；選單支援 Escape 關閉、焦點回到觸發按鈕、點擊外部關閉。
- 每個可操作項目可用鍵盤抵達且焦點清楚；手機主要點擊目標至少 44×44 CSS px。
- 橫向捲動頁籤支援觸控、鍵盤與自動定位；焦點/作用中頁籤不被固定頁首、底列或表單遮住。
- 深色/淺色、繁中/簡中/英文、不同字級和超窄螢幕下，標籤不被裁切或變成無法辨識的縮寫。
- 手機底列（若採用）為主內容預留高度，並套用 PWA/瀏海裝置安全區域；FAB、掃描收據和表單不互相遮擋。
- 保留管理員限制、登出、匯入匯出、離線待上傳操作、Dashboard widget 導流和日期快捷新增等既有能力。

## 6. 主要程式對照

| 職責 | 主要檔案 |
|---|---|
| 根層 providers、路由、登入和保護 | `web/src/main.tsx`、`web/src/App.tsx`、`web/src/pages/Login.tsx`、`web/src/components/PrivateRoute.tsx` |
| PWA 安裝提示 | `web/src/components/PWAInstallPrompt.tsx`、`web/src/contexts/PWAContext.tsx` |
| Dashboard 外殼、主頁籤、頁首選單、FAB 和浮層 | `web/src/pages/Dashboard.tsx` |
| 斷點、頁籤和全域版面 | `web/src/index.css`、`web/src/cat-theme.css` |
| 頁籤資料型別與預設 | `web/src/types/index.ts` |
| 功能位置、排序與啟用設定 | `web/src/components/settings/FeatureManager.tsx` |
| Dashboard widget 與自訂 | `web/src/components/dashboard/CustomizableDashboard.tsx`、`web/src/components/dashboard/DashboardCustomizer.tsx`、`web/src/components/dashboard/widgets/` |
| 支出/收入內容 | `web/src/pages/tabs/ExpensesTab.tsx`、`web/src/pages/tabs/IncomesTab.tsx`、`web/src/components/expenses/`、`web/src/components/income/` |
| 預算/分類/排程付款 | `web/src/components/budgets/BudgetManager.tsx`、`web/src/components/categories/CategoryManager.tsx`、`web/src/components/scheduledPayments/ScheduledPaymentManager.tsx` |
| 帳戶子頁籤 | `web/src/components/payment/PaymentMethodsTab.tsx`、`web/src/components/common/SubTabs.tsx`、`web/src/components/cards/`、`web/src/components/banks/`、`web/src/components/ewallet/`、`web/src/components/transfer/` |
| 通知、狀態、彈窗和匯入 | `web/src/components/NotificationBell.tsx`、`web/src/components/HeaderStatusBar.tsx`、`web/src/components/common/PopupModal.tsx`、`web/src/components/importexport/ImportExportModal.tsx` |

## 7. 關聯文件

- [完整功能與頁面](FEATURES_AND_PAGES.md)
- [系統架構](ARCHITECTURE.md)
- [UI 樣式指南](UI_STYLE_GUIDE.md)
- [文件索引](README.md)
