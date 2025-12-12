# Expense Manager - 完整功能與頁面文檔

## 概覽 Overview

本文檔提供 Expense Manager 網頁應用程式中所有功能和頁面的完整資訊，以便未來修改時不會遺漏任何功能。

## 目錄 Table of Contents

1. [頁面結構 Page Structure](#頁面結構)
2. [共用 UI 組件 Shared UI Components](#共用-ui-組件)
3. [功能列表 Feature List](#功能列表)
4. [主題與樣式 Theme & Styles](#主題與樣式)
5. [數據模型 Data Models](#數據模型)

---

## 頁面結構 Page Structure

### 主要頁籤 Main Tabs

| 頁籤名稱 | 英文名稱 | 組件路徑 | 功能描述 |
|---------|---------|---------|---------|
| 儀表板 | Dashboard | `components/dashboard/` | 總覽、圖表、快速操作 |
| 支出 | Expenses | `components/expenses/` | 支出記錄、搜尋、篩選 |
| 收入 | Incomes | `pages/tabs/IncomesTab.tsx` | 收入記錄管理 |
| 分類 | Categories | `components/categories/` | 類別管理 |
| 預算 | Budgets | `components/budgets/` | 預算設定與追蹤 |
| 定期 | Recurring | `components/recurring/` | 定期/重複性費用 |
| 支付方式 | Payment Methods | `components/payment/` | 信用卡、電子錢包、銀行帳戶 |
| 設定 | Settings | `components/settings/` | 應用程式設定 |
| 個人檔案 | Profile | `pages/UserProfile.tsx` | 用戶資料 |
| 管理 | Admin | `pages/tabs/AdminTab.tsx` | 管理員功能 |

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
| 預算建議 | AI 智能建議 |
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

### 8. 定期支出 Recurring Expenses

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

- **行動裝置**: < 640px - 使用漢堡選單
- **桌面**: >= 640px - 顯示完整操作按鈕

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

| 建議 | 說明 | 優先級 |
|------|------|--------|
| 麵包屑導航 | 在子頁面顯示返回路徑 | 中 |
| 搜索全局化 | 全局搜索支持所有類型數據 | 中 |
| 最近使用 | 快速訪問最近查看/編輯的項目 | 低 |
| 快捷操作 | 首頁快速訪問常用功能 | 低 |

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

**最後更新**: 2025年12月
**版本**: 1.2.0
