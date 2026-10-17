# Expense Manager - 完整功能與頁面文檔

## 概覽 Overview

本文檔整理 Expense Manager 網頁應用程式目前可見的功能、功能入口和程式分層。內容以 `web/src` 與 Firebase Functions 現行程式碼為準；未掛載的舊元件會另外標示。

> 最後核對程式碼：2026-10-17。新增或移動功能時，請同步更新本文件及 [文件索引](README.md)。系統分層見 [系統架構](ARCHITECTURE.md)；service method 與主要資料流程見 [邏輯與 Method 流程](LOGIC_METHOD_FLOW.md)；Firestore IndexedDB 快取和 app queue 的差異見 [離線同步架構](OFFLINE_SYNC_ARCHITECTURE.md)。

## 目錄 Table of Contents

1. [功能地圖 Feature Map](#功能地圖-feature-map)
2. [程式分層與資料流 Application Layers](#程式分層與資料流-application-layers)
3. [頁面結構 Page Structure](#頁面結構)
4. [共用 UI 組件 Shared UI Components](#共用-ui-組件)
5. [功能列表 Feature List](#功能列表)
6. [主題與樣式 Theme & Styles](#主題與樣式)
7. [數據模型 Data Models](#數據模型)

---

## 功能地圖 Feature Map

下表先按使用者任務整理功能群組，再列出它們的入口。入口是否可個人化依設定而定；Dashboard 主區域的實際掛載點為 `web/src/pages/Dashboard.tsx`。

| 功能群組 | 包含功能 | 目前入口 / 主要實作 |
|---|---|---|
| 帳戶與存取 | 登入、註冊流程、登出、個人檔案、管理員工具 | `/` 登入；`/dashboard` 受 `PrivateRoute` 保護；Profile/Admin 從頁首選單開啟 |
| 財務紀錄 | 支出、收入、分類、還款追蹤 | Dashboard 主頁籤；`ExpensesTab`、`IncomesTab`、`CategoryManager`、`RepaymentManager` |
| 預算與規劃 | 預算、預算模板/建議/歷史/結轉、定期付款、到期提醒 | `BudgetManager`；`ScheduledPaymentManager`（Recurring 主頁籤） |
| 支付與帳戶 | 信用卡、電子錢包、銀行帳戶、轉帳 | Payment Methods 子頁籤：cards、ewallets、banks、transfers |
| 分析與總覽 | 摘要卡、支出/分類圖表、趨勢、月比、標籤雲、預算進度、卡片摘要、分期追蹤、待付款、近期支出、追蹤支出、儲蓄目標、朋友支出、快速新增、即將到期帳單 | `CustomizableDashboard`、`DashboardSummary`、`dashboard/widgets/`、朋友支出服務 |
| 快速輸入 | 快速記帳、一般/步驟式支出表單、掃描收據與 OCR 草稿 | Dashboard 浮動操作；`ExpenseForm`、`StepByStepExpenseForm`、`receiptOcrService` |
| 個人化 | 主頁籤順序/顯示、Dashboard Widget 排列、語言、主題、顯示幣別、日期捷徑 | Settings 頁籤、`DashboardCustomizer`、頁首/設定面板 |
| 資料移轉 | CSV/Excel 匯入匯出 | 匯入匯出 Modal；`importExportUtils` |
| 離線與安裝 | PWA 安裝、離線讀寫佇列、網路狀態、恢復同步 | PWA Provider/Service Worker、`offlineQueue`、`syncService`、同步狀態元件 |
| 管理與維運 | 管理員使用者管理、刪除使用者帳戶 | Admin 頁籤；Firebase Callable Function `adminDeleteUser` |

### 目前入口與未掛載程式碼

- 頂層路徑由 `web/src/App.tsx` 定義：`/` 登入、`/login` 轉回 `/`、`/dashboard` 登入後外殼，其他路徑導回 `/`。註冊元件存在於來源樹，但目前沒有獨立 `/register` 路由。
- Dashboard 實際掛載 8 個可排序/顯示的主頁籤：Dashboard、Expenses、Incomes、Categories、Budgets、Recurring、Payment Methods、Settings。Profile 與 Admin 是頁首選單入口，不是主頁籤。
- `Recurring` 目前掛載 `ScheduledPaymentManager`。`RecurringTab` 與 `RecurringExpenseManager` 保留在來源樹，但未由 Dashboard 掛載；兩種資料/介面不可混稱。
- 還款與轉帳是其他流程中的管理元件，不是獨立頂層路由；轉帳列表位於 Payment Methods 的 transfers 子頁籤。
- `navigationConfig.ts` 會把舊設定值 `cards`、`ewallets` 正規化為 `paymentMethods`，所以信用卡及電子錢包不會成為獨立主頁籤。

---

## 程式分層與資料流 Application Layers

```text
main.tsx
├── 共用 Provider：Theme / Language / Auth / Notification / UserSettings
├── PWA 註冊：Service Worker
└── App.tsx：PWAProvider + Router + PWAInstallPrompt
    ├── / → Login
    └── /dashboard → PrivateRoute → Dashboard
        ├── CompactNavigation → 8 個主頁籤
        ├── 頁首選單 → Profile / Admin / 登出
        ├── 功能元件 → components/<feature>/ 與 pages/tabs/
        └── 表單、Modal、浮動操作、Widget
             ↓ props / React Context / hooks
        services/ + domain/ + utils/
        ├── Firebase CRUD 與查詢服務
        ├── 匯率、金額、OCR、匯入匯出、儀表板配置
        └── 離線佇列、快取、網路狀態、同步協調
             ↓
        Firebase Auth / Cloud Firestore / Callable Functions
```

| 目錄 | 職責 | 常用入口 |
|---|---|---|
| `web/src/pages/` | 頁面殼層、登入及 Profile | `App.tsx` 路由指向 `Login`、`Dashboard`；Dashboard 內嵌各主頁籤 |
| `web/src/components/` | 頁面功能、表單、共用 UI 與 Dashboard Widget | 依功能分資料夾，如 `expenses/`、`budgets/`、`scheduledPayments/` |
| `web/src/contexts/` | 跨頁共享的登入、語言、主題、通知、使用者偏好及 PWA 狀態 | 五個主要 Provider 在 `main.tsx` 包裝；`PWAProvider` 在 `App.tsx` 包裝 Router |
| `web/src/hooks/` | 可重用互動/狀態邏輯 | 離線同步、樂觀 CRUD、多選、網路狀態、觸控排序 |
| `web/src/services/` | Firebase 存取及跨元件應用服務 | `expenseService`、`budgetService`、`syncService` 等 |
| `web/src/domain/`、`utils/`、`types/` | 金額等領域邏輯、日期/幣別/預算/匯入匯出等輔助邏輯、型別 | 供服務、hooks、元件共用 |
| `web/src/config/`、`constants/`、`locales/` | Firebase 初始化、集合常數、語系字典 | 應用環境及共用定義 |
| `web/functions/` | 需伺服器權限的 Firebase Callable Functions | 目前包含管理員刪除使用者帳戶 |

### 一般資料操作流程

```text
頁面 / 元件 → handler 或 hook → 對應 service → Firestore
      ↑                                  ↓
      └──── 更新 React 狀態 / 快取 ←─────┘

離線時需分開看兩條路：Firestore SDK IndexedDB 持久快取自行同步其待寫入；只有 handler 設定支援的 entity/payload 且錯誤符合條件時，操作才進 app `offlineQueue`，由 `syncService` 重播。各 entity 支援範圍和已知缺口見 [離線同步架構](OFFLINE_SYNC_ARCHITECTURE.md)。
```

不是所有操作都會經過同一個 Hook。新增功能時，請沿用該領域既有 service，並檢查其 Firestore Rules、離線支援與同步行為；資料隔離及授權以 `web/firestore.rules` 和 Functions 驗證為準。

### 主要共用狀態

| 狀態範圍 | 實作位置 | 管理內容 |
|---|---|---|
| 身份 | `contexts/AuthContext.tsx` | Firebase 使用者、登入/登出狀態 |
| 顯示偏好 | `contexts/UserSettingsContext.tsx`、`services/userSettingsService.ts` | 語言/顯示幣別及使用者設定 |
| 外觀 | `contexts/ThemeContext.tsx` | 淺色/深色主題 |
| 通知 | `contexts/NotificationContext.tsx` | 跨元件通知狀態 |
| 頁籤/Widget | `services/featureSettingsService.ts`、`services/dashboardLayoutService.ts` | 導覽功能排序/顯示與 Dashboard 配置 |
| 離線 | `services/syncService.ts`、`utils/offlineQueue.ts`、`utils/sessionCache.ts` | 待同步操作、資料快取與同步進度 |

---

## 頁面結構 Page Structure

> 現行實際路由與 UI 導覽已核對 `web/src` 原始碼。完整的 As-is 架構及桌機/手機排列方案請見 [UI 架構與導覽排列盤點](UI_NAVIGATION_AUDIT.md)。以下表格列出 Dashboard 目前掛載的功能。

### 實際路由與版面層級 Current Routes & Layout

| 路徑/層級 | 實際內容 | 實作 |
|---|---|---|
| `/` | 登入入口 | `web/src/pages/Login.tsx` |
| `/login` | 轉址到 `/` | `web/src/App.tsx` |
| `/dashboard` | 登入後的 Dashboard 外殼；8 個主頁籤和頁首選單中的帳戶入口共用 `activeTab`，沒有各自的網址 | `web/src/pages/Dashboard.tsx` |
| Dashboard 子檢視 | 支出日期/篩選、Payment Methods 子頁籤、定期付款清單/月曆/分析 | 各功能元件內的狀態，不是頂層路由 |

目前 Router 沒有獨立 `/register` 路由。未知路徑會導回 `/`。功能頁面更新或新增時，請以 `Dashboard.tsx` 目前實際掛載為準。

### 主要頁籤 Main Tabs

| 頁籤名稱 | 英文名稱 | 組件路徑 | 功能描述 |
|---------|---------|---------|---------|
| 儀表板 | Dashboard | `web/src/components/dashboard/CustomizableDashboard.tsx` | 總覽、Widget、圖表、快速操作 |
| 支出 | Expenses | `web/src/pages/tabs/ExpensesTab.tsx`、`web/src/components/expenses/` | 支出記錄、日期導覽、搜尋與篩選 |
| 收入 | Incomes | `web/src/pages/tabs/IncomesTab.tsx`、`web/src/components/income/` | 收入記錄管理 |
| 分類 | Categories | `web/src/components/categories/CategoryManager.tsx` | 類別管理 |
| 預算 | Budgets | `web/src/components/budgets/BudgetManager.tsx` | 預算設定與追蹤 |
| 定期 | Recurring | `web/src/components/scheduledPayments/ScheduledPaymentManager.tsx` | 目前 Dashboard 實際顯示定期付款，含清單、月曆與分析檢視 |
| 支付方式 | Payment Methods | `web/src/components/payment/PaymentMethodsTab.tsx` | 信用卡、電子錢包、銀行帳戶、轉帳紀錄 |
| 設定 | Settings | `web/src/components/settings/FeatureManager.tsx` | 主頁籤與漢堡選單功能顯示/排序 |

### 頁首選單入口 Header Menu Entries

| 入口 | 組件路徑 | 功能描述 |
|------|---------|---------|
| 個人檔案 Profile | `web/src/pages/UserProfile.tsx` | 從頁首漢堡選單開啟 |
| 管理 Admin | `web/src/pages/tabs/AdminTab.tsx` | 從頁首漢堡選單開啟；只有管理員看到入口 |

8 個主要頁籤與上述頁首選單入口都使用同一個 `/dashboard` 路徑，由 `activeTab` 切換內容。`pages/tabs/RecurringTab.tsx` 和 `components/recurring/RecurringExpenseManager.tsx` 尚在程式碼中，但目前沒有由 Dashboard 掛載；勿將其描述為目前的定期頁入口。

### 子頁面與 Modal Sub-pages & Modals

| 功能 | 類型 | 組件路徑 |
|-----|------|---------|
| 新增支出 | Modal/Sheet | `components/expenses/ExpenseForm.tsx` |
| 編輯支出 | PopupModal | `ExpenseList.tsx` → `PopupModal` |
| 新增收入 | Form | `components/income/IncomeForm.tsx` |
| 編輯收入 | PopupModal | `IncomeList.tsx` → `PopupModal` |
| 新增分類 | PopupModal | `CategoryManager.tsx` → `PopupModal` |
| 編輯分類 | PopupModal | `CategoryManager.tsx` → `PopupModal` |
| 新增預算 | PopupModal | `BudgetManager.tsx` → `PopupModal` |
| 編輯預算 | PopupModal | `BudgetManager.tsx` → `PopupModal` |
| 新增信用卡 | PopupModal | `CardManager.tsx` → `PopupModal` |
| 編輯信用卡 | PopupModal | `CardManager.tsx` → `PopupModal` |
| 確認刪除 | ConfirmModal | `components/ConfirmModal.tsx` |
| 還款管理 | Inline/Modal | `components/repayment/` |
| 轉帳管理 | Modal | `components/transfer/` |
| 預算模板 | Modal | `components/budgets/BudgetTemplates.tsx` |
| 數據導入匯出 | Modal | `components/importexport/` |

---

## 共用 UI 組件 Shared UI Components

### PopupModal 彈出式視窗

**路徑**: `components/common/PopupModal.tsx`

**設計規格**:
```
————————————————————————————————
標題                    × (關閉)
————————————————————————————————
內容區域 (可滾動)
————————————————————————————————
[確認/保存 80%] [取消 20%]
————————————————————————————————
```

#### Recommended pattern: `PopupModal` + `BaseForm` (single visible container)

When a form uses `BaseForm` (which already renders its own card/header/footer styling), the modal should be **chromeless** so the UI does not look like “a modal inside another card”.

Use this combo:

- `hideHeader={true}`: avoid duplicate titles (PopupModal header + BaseForm header)
- `hideFooter={true}`: avoid duplicate action rows (PopupModal footer + BaseForm footer)
- `chromeless={true}`: remove PopupModal’s outer panel styling (background/border/shadow/padding), keeping only overlay/positioning/ESC/close logic

Example:

- `PopupModal` is responsible for overlay + close behavior.
- `BaseForm` is the only visible “card”.

```
<PopupModal
  isOpen={isEditing}
  onClose={handleClose}
  title={t('editSomething')}
  hideHeader
  hideFooter
  chromeless
  maxWidth="600px"
>
  <BaseForm
    title={t('editSomething')}
    onClose={handleClose}
    onSubmit={handleSubmit}
    submitLabel={t('save')}
    cancelLabel={t('cancel')}
  >
    {/* fields */}
  </BaseForm>
</PopupModal>
```

Use the default (non-chromeless) `PopupModal` style when the dialog content is **not** a `BaseForm` (e.g., simple confirmations, informational dialogs, or cases where you want PopupModal’s own header/footer buttons).

> Pop-out 導入進度追蹤：`docs/POPOUT_ROLLOUT_TRACKER.md`
**使用方式**:
```tsx
<PopupModal
  isOpen={isOpen}
  onClose={handleClose}
  title="標題"
  primaryButtonLabel="保存"
  secondaryButtonLabel="取消"
  onPrimaryAction={handleSave}
  primaryButtonVariant="default" // 或 "danger"
  maxWidth="600px"
  hideFooter={false} // 使用自定義表單時設為 true
>
  {/* 內容 */}
</PopupModal>
```

**特點**:
- 支持暗黑模式和光亮模式
- 按鈕比例 80/20 (主要:次要)
- ESC 鍵關閉
- 點擊背景關閉
- 防止背景滾動

### BaseForm 基礎表單

**路徑**: `components/common/BaseForm.tsx`

**設計規格**:
- 與 PopupModal 相同的 UI 結構
- 適用於內嵌表單場景
- 80/20 按鈕比例

### ConfirmModal 確認對話框

**路徑**: `components/ConfirmModal.tsx`

**使用場景**:
- 刪除確認
- 危險操作確認
- 批量刪除確認

### FormPopup 表單彈窗包裝器

**路徑**: `components/common/FormPopup.tsx`

**用途**: 為表單提供統一的彈窗包裝

---

## 功能列表 Feature List

### 1. 支出管理 Expense Management

**組件**: `components/expenses/`

| 功能 | 描述 |
|------|------|
| 新增支出 | 填寫金額、分類、日期、時間、描述、備註 |
| 編輯支出 | 修改現有支出記錄 (使用 PopupModal) |
| 刪除支出 | 單筆或批量刪除 (需確認) |
| 搜尋 | 按描述搜尋 |
| 篩選 | 按分類、日期範圍、支付方式篩選 |
| 排序 | 按日期、金額排序 |
| 快速記帳 | Quick Expense 預設快速新增 |
| 支付方式 | 現金、信用卡、電子錢包、銀行 |
| 還款追蹤 | 標記需要還款的支出 |
| 多選操作 | 批量選擇和刪除 |
| 日期分組 | 按日期分組顯示，可展開/收合 |

### 2. 收入管理 Income Management

**組件**: `components/income/`

| 功能 | 描述 |
|------|------|
| 新增收入 | 填寫金額、類型、日期、付款人、備註 |
| 編輯收入 | 修改現有收入記錄 (使用 PopupModal) |
| 刪除收入 | 單筆或批量刪除 |
| 收入類型 | 薪資、報銷、還款、其他 |
| 關聯支出 | 連結到相關支出記錄 |
| 日期分組 | 按日期分組顯示 |

### 3. 分類管理 Category Management

**組件**: `components/categories/`

| 功能 | 描述 |
|------|------|
| 新增分類 | 設定名稱、圖標、顏色 (使用 PopupModal) |
| 編輯分類 | 修改現有分類 (使用 PopupModal) |
| 刪除分類 | 包含關聯支出處理選項 |
| 預設分類 | 系統預設分類 (不可刪除) |
| 圖標選擇 | Emoji 圖標選擇器 |
| 顏色選擇 | 顏色選擇器 |
| 重複檢測 | 顯示重複名稱警告 |

### 4. 預算管理 Budget Management

**組件**: `components/budgets/`

| 功能 | 描述 |
|------|------|
| 新增預算 | 設定分類、金額、週期、警戒閾值 (使用 PopupModal) |
| 編輯預算 | 修改現有預算 (使用 PopupModal) |
| 刪除預算 | 刪除預算設定 |
| 進度追蹤 | 視覺化預算使用進度 |
| 預算週期 | 日/週/月/年 |
| 預算建議 | 依預算及支出資料顯示預算建議卡片 |
| 調整建議 | 基於歷史數據的調整建議 |
| 預算模板 | 快速套用預算模板 |
| 結轉設定 | 剩餘預算結轉至下期 |
| 歷史記錄 | 查看預算歷史 |

### 5. 信用卡管理 Credit Card Management

**組件**: `components/cards/`

| 功能 | 描述 |
|------|------|
| 新增信用卡 | 設定名稱、銀行、額度、帳單日等 (使用 PopupModal) |
| 編輯信用卡 | 修改現有信用卡資訊 (使用 PopupModal) |
| 刪除信用卡 | 刪除信用卡記錄 |
| 現金回饋規則 | 設定各分類的回饋比例 |
| 消費統計 | 當期消費、可用額度 |
| 回饋計算 | 估計現金回饋金額 |
| 帳單週期 | 顯示帳單日期範圍 |

### 6. 電子錢包管理 E-Wallet Management

**組件**: `components/ewallet/`

| 功能 | 描述 |
|------|------|
| 新增電子錢包 | 設定名稱、餘額 |
| 編輯電子錢包 | 修改電子錢包資訊 |
| 刪除電子錢包 | 刪除電子錢包記錄 |
| 餘額追蹤 | 追蹤餘額變化 |

### 7. 銀行帳戶管理 Bank Account Management

**組件**: `components/banks/`

| 功能 | 描述 |
|------|------|
| 新增銀行帳戶 | 設定銀行名稱、帳戶類型 |
| 編輯銀行帳戶 | 修改銀行帳戶資訊 |
| 刪除銀行帳戶 | 刪除銀行帳戶記錄 |

### 8. 舊定期支出介面 Legacy Recurring Expense UI (not mounted)

`RecurringExpenseManager` 和 `RecurringTab` 仍在來源樹，但目前沒有從 Dashboard 掛載。以下列出其元件能力供程式維護時辨認；目前使用者看到的「Recurring」入口請看下一節的定期付款管理。

**組件**: `components/recurring/`

| 功能 | 描述 |
|------|------|
| 新增定期支出 | 設定描述、金額、分類、頻率 |
| 編輯定期支出 | 修改定期支出設定 |
| 刪除定期支出 | 刪除定期支出記錄 |
| 暫停/恢復 | 暫停或恢復定期支出 |
| 頻率設定 | 日/週/月/年 |

### 9. 定期付款 Scheduled Payments

**組件**: `components/scheduledPayments/`

**目前 UI 入口**: Dashboard 的 `Recurring` 主頁籤（由 `Dashboard.tsx` 掛載 `ScheduledPaymentManager`），其中可切換清單、月曆及分析檢視。

| 功能 | 描述 |
|------|------|
| 新增定期付款 | 設定付款計劃 |
| 編輯定期付款 | 修改付款計劃 |
| 刪除定期付款 | 刪除付款計劃 |
| 付款提醒 | 到期提醒 |

### 10. 還款管理 Repayment Management

**組件**: `components/repayment/`

| 功能 | 描述 |
|------|------|
| 新增還款 | 記錄還款 |
| 編輯還款 | 修改還款記錄 |
| 刪除還款 | 刪除還款記錄 |
| 追蹤狀態 | 追蹤還款進度 |

### 11. 轉帳管理 Transfer Management

**組件**: `components/transfer/`

| 功能 | 描述 |
|------|------|
| 新增轉帳 | 帳戶間轉帳記錄 |
| 轉帳歷史 | 查看轉帳記錄 |

### 12. 儀表板 Dashboard

**組件**: `components/dashboard/`

| 功能 | 描述 |
|------|------|
| 摘要卡片 | 今日/本月/總支出概覽 |
| 支出圖表 | 分類支出圓餅圖 |
| 支出趨勢 | 近期支出趨勢線圖 |
| 熱門類別 | 最高支出分類排行 |
| 最近支出 | 近期支出列表 |
| 預算進度 | 預算使用進度 |
| 信用卡摘要 | 信用卡使用概覽 |
| 追蹤中支出 | 待還款支出 |
| 快速新增 | 快速新增支出按鈕 |
| 自定義布局 | 可拖拉調整 Widget 位置和顯示 |

### 13. 數據導入匯出 Import/Export

**組件**: `components/importexport/`

| 功能 | 描述 |
|------|------|
| CSV 導出 | 導出支出為 CSV |
| Excel 導出 | 導出支出為 Excel |
| CSV 導入 | 從 CSV 導入支出 |
| Excel 導入 | 從 Excel 導入支出 |

### 14. 設定 Settings

**組件**: `components/settings/`

| 功能 | 描述 |
|------|------|
| 語言設定 | 繁體中文、簡體中文、英文 |
| 主題設定 | 淺色/深色模式 |
| 日期格式 | 日期顯示格式 |
| 帳單週期日 | 設定每月帳單週期起始日 |
| 功能開關 | 啟用/停用特定功能 |

---

## 主題與樣式 Theme & Styles

### CSS 變數 CSS Variables

**檔案**: `web/src/index.css`

#### 淺色模式 Light Mode
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --accent-primary: #7c3aed;
  --accent-light: #ede9fe;
  --border-color: #e5e7eb;
  --card-bg: #ffffff;
  --modal-bg: #ffffff;
  --modal-overlay: rgba(0, 0, 0, 0.5);
  /* ... 更多變數 */
}
```

#### 深色模式 Dark Mode
```css
.dark {
  --bg-primary: #0a0a0f;
  --bg-secondary: #18181b;
  --text-primary: #f2f2f7;
  --text-secondary: #98989d;
  --accent-primary: #a78bfa;
  --accent-light: #3a3654;
  --border-color: #48484a;
  --card-bg: #1a1625;
  --modal-bg: #1a1625;
  --modal-overlay: rgba(0, 0, 0, 0.85);
  /* ... 更多變數 */
}
```

### 響應式設計 Responsive Design

- **主導覽（所有寬度）**：主頁籤保留水平捲動，不會在手機寬度改由漢堡選單取代。
- **窄版（≤768px）**：Dashboard 頁首分為品牌/操作列與主頁籤列；主頁籤仍可水平捲動，新增支出與掃描收據浮動按鈕改為圓形圖示。
- **較寬版（>768px）**：品牌、主頁籤、通知與漢堡選單位於同一列；浮動按鈕顯示文字標籤。
- `≥640px` 的 `.dashboard-tab` 等寬規則屬於舊版頁籤 CSS；目前 Dashboard 掛載 `CompactNavigation`，不使用該選擇器。

---

## 數據模型 Data Models

### Expense 支出
```typescript
interface Expense {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  time?: string;
  notes?: string;
  paymentMethod?: 'cash' | 'credit_card' | 'e_wallet' | 'bank';
  cardId?: string;
  ewalletId?: string;
  bankId?: string;
  needsRepaymentTracking?: boolean;
  repaymentTrackingCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Income 收入
```typescript
interface Income {
  id?: string;
  userId: string;
  amount: number;
  type: 'salary' | 'reimbursement' | 'repayment' | 'other';
  title?: string;
  date: string;
  payerName?: string;
  note?: string;
  linkedExpenseId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Category 分類
```typescript
interface Category {
  id?: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: Date;
}
```

### Budget 預算
```typescript
interface Budget {
  id?: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  alertThreshold: number;
  rolloverEnabled?: boolean;
  rolloverPercentage?: number;
  rolloverCap?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Card 信用卡
```typescript
interface Card {
  id?: string;
  userId: string;
  name: string;
  bankName?: string;
  cardLimit: number;
  billingCycleDay: number;
  cashbackRules?: CashbackRule[];
  createdAt: Date;
  updatedAt: Date;
}
```

### EWallet 電子錢包
```typescript
interface EWallet {
  id?: string;
  userId: string;
  name: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Bank 銀行帳戶
```typescript
interface Bank {
  id?: string;
  userId: string;
  name: string;
  accountType?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 更新記錄 Change Log

| 日期 | 版本 | 更新內容 |
|------|------|---------|
| 2025-12 | 1.2.0 | 新增 PopupModal 統一 UI 組件，所有表單使用 popup 顯示 |
| 2024-11 | 1.1.0 | 新增儀表板自定義功能 |
| 2024-10 | 1.0.0 | 初始版本 |

---

## 操作流程優化建議 UX Optimization Suggestions

以下是一些可以進一步優化用戶體驗的建議：

### 1. 表單體驗優化

| 建議 | 說明 | 優先級 |
|------|------|--------|
| 表單驗證提示 | 在用戶提交前顯示即時驗證錯誤 | 高 |
| 自動保存草稿 | 表單填寫中途可自動保存，防止意外丟失 | 中 |
| 常用值記憶 | 記住用戶常用的分類、支付方式等 | 中 |
| 快捷鍵支持 | 支持 Ctrl+S 保存、Esc 取消等 | 低 |

### 2. 列表操作優化

| 建議 | 說明 | 優先級 |
|------|------|--------|
| 滑動手勢 | 支持左滑刪除、右滑編輯（移動端） | 高 |
| 拖拉排序 | 支持拖拉調整列表項目順序 | 中 |
| 虛擬滾動 | 大量數據時使用虛擬滾動提升性能 | 中 |
| 批量編輯 | 支持選擇多項進行批量分類修改 | 低 |

### 3. 導航優化

目前產品的導覽問題、推薦排列及桌機/手機方案請以 [UI 架構與導覽排列盤點](UI_NAVIGATION_AUDIT.md) 為準。優先方向如下：

| 建議 | 說明 | 優先級 |
|------|------|--------|
| 整理主導覽與「更多」 | 區分高頻功能和低頻入口，移除主頁籤與頁首工具選單重複的功能捷徑 | 高 |
| 清楚提示手機頁籤溢出 | 保留橫向頁籤時，顯示尚有內容、切頁自動捲到目前頁籤，並提供明確的更多入口 | 高 |
| 分開頁面入口與工具設定 | 語言、外觀、匯入/匯出、離線同步及個人帳戶操作使用清楚分組 | 高 |
| 用明確名稱表示排程付款 | 讓目前標為 Recurring 的入口與實際掛載的 ScheduledPaymentManager 相符 | 中 |
| 評估手機底部導覽 | 先做原型並檢查 PWA 安全區域、浮動新增按鈕及功能個人化 | 中 |
| 支援功能頁深連結 | 之後再考慮讓主頁籤和子檢視同步到網址，支援重新整理及瀏覽器返回 | 低 |

### 4. 視覺反饋優化

| 建議 | 說明 | 優先級 |
|------|------|--------|
| 載入骨架屏 | 用骨架屏替代載入動畫 | 中 |
| 操作動畫 | 新增/刪除項目時添加動畫效果 | 低 |
| 成功反饋 | 操作成功後顯示明確的視覺反饋 | 高 |
| 錯誤處理 | 統一且友好的錯誤提示 | 高 |

### 5. 數據展示優化

| 建議 | 說明 | 優先級 |
|------|------|--------|
| 圖表互動 | 圖表支持點擊查看詳情 | 中 |
| 數據對比 | 支持月度/年度數據對比 | 中 |
| 自定義報表 | 用戶可自定義報表內容和時間範圍 | 低 |
| 趨勢預測 | 基於歷史數據預測未來支出趨勢 | 低 |

### 6. 已完成的優化 (本次更新)

- ✅ 統一的彈窗 UI 組件 (PopupModal)
- ✅ 一致的按鈕布局 (80/20 比例)
- ✅ 支持暗黑模式和光亮模式
- ✅ ESC 鍵關閉彈窗
- ✅ 點擊背景關閉彈窗
- ✅ 防止背景滾動
- ✅ 完整的功能文檔

---

**最後更新**: 2026-10-17
