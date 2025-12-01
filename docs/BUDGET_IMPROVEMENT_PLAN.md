# 預算功能改進計畫

## 概述

本計畫分為三個階段，逐步改進預算功能，從修復核心問題開始，到新增進階功能。

---

## 📋 階段總覽

| 階段 | 名稱 | 預計時間 | 狀態 |
|------|------|----------|------|
| Phase 1 | 核心問題修復 | 1-2 天 | ✅ 已完成 |
| Phase 2 | 基礎功能增強 | 2-3 天 | ✅ 已完成 |
| Phase 3 | 進階功能開發 | 3-5 天 | ✅ 已完成 |

---

## Phase 1: 核心問題修復 🔧

### 目標
修復現有邏輯不一致的問題，確保預算計算準確可靠。

### 任務清單

#### 1.1 統一月預算計算邏輯
- [x] **問題**：Dashboard Widget 使用 `billingCycleDay`，通知系統使用 `startDate`
- [x] **解決方案**：所有月預算統一使用用戶的 `billingCycleDay`
- [x] **影響檔案**：
  - `web/src/utils/budgetNotifications.ts` - 新增 `calculateBudgetPeriod()` 函數
  - `web/src/components/dashboard/widgets/BudgetProgressWidget.tsx`
  - `web/src/components/budgets/BudgetManager.tsx` - 新增 `getPeriodRange()` 函數
  - `web/src/pages/Dashboard.tsx` - 更新 `checkBudgetAlerts` 調用

#### 1.2 預算計算扣除還款
- [x] **問題**：預算花費計算沒有扣除還款金額
- [x] **解決方案**：使用 `getNetAmount(expense)` 計算淨支出
- [x] **影響檔案**：
  - `web/src/utils/budgetNotifications.ts` - 新增 repayments 參數
  - `web/src/components/dashboard/widgets/BudgetProgressWidget.tsx` - 新增 repaymentsByExpense 計算
  - `web/src/pages/Dashboard.tsx` - 更新 `getSpentByCategory()` 扣除還款

#### 1.3 簡化/移除 startDate 欄位
- [x] **問題**：BudgetForm 有 startDate 欄位但未顯示
- [x] **解決方案**：
  - 方案 B：週/年預算顯示 startDate 輸入欄位，月預算不顯示
  - 新增提示說明月預算使用帳單週期日
- [x] **影響檔案**：
  - `web/src/components/budgets/BudgetForm.tsx` - 條件性顯示 startDate
  - `web/src/locales/translations.ts` - 新增 `monthlyBudgetNote` 翻譯

#### 1.4 顯示當前週期範圍
- [x] **問題**：用戶不知道預算計算的日期範圍
- [x] **解決方案**：在預算卡片上顯示 `12/1 - 12/31` 格式的週期
- [x] **影響檔案**：
  - `web/src/components/budgets/BudgetManager.tsx` - 新增 periodInfo 區塊
  - `web/src/components/dashboard/widgets/BudgetProgressWidget.tsx` - 新增 periodRange 顯示
  - `web/src/index.css` - 新增 `.budget-period-info` 和 `.budget-period-range` 樣式

---

## Phase 2: 基礎功能增強 ⚡

### 目標
新增實用功能，提升用戶體驗。

### 任務清單

#### 2.1 每日預算分配
- [x] **功能**：將月預算平均分配到每天
- [x] **顯示**：「今日可花：$20」「今日已花：$12」
- [x] **計算邏輯**：
  ```
  dailyBudget = monthlyBudget / daysInCycle
  todayRemaining = dailyBudget - todaySpent
  ```
- [x] **影響檔案**：
  - `web/src/components/dashboard/widgets/BudgetProgressWidget.tsx` - 新增 dailyBudget, todaySpent, spendingPace
  - `web/src/index.css` - 新增 `.budget-daily-info` 樣式
  - `web/src/locales/translations.ts` - 新增 dailyBudget, todaySpent, spendingFast, spendingSlow

#### 2.2 預算歷史趨勢（基礎版）
- [x] **功能**：顯示過去 6 個週期的預算使用率
- [x] **顯示**：垂直條形圖，顏色依使用率區分（綠/黃/紅）
- [x] **資料來源**：根據歷史支出計算（不需新增資料表）
- [x] **互動**：點擊「顯示歷史」按鈕展開/收起
- [x] **影響檔案**：
  - 新建 `web/src/components/budgets/BudgetHistory.tsx` - 歷史趨勢組件
  - `web/src/components/budgets/BudgetManager.tsx` - 整合歷史功能
  - `web/src/locales/translations.ts` - 新增 budgetHistory, showHistory, hideHistory
  - `web/src/index.css` - 新增 `.budget-history-*` 樣式

#### 2.3 智能預算建議
- [x] **功能**：根據過去消費自動建議預算金額
- [x] **計算**：
  ```
  建議預算 = 過去3個月平均 × 1.1（10% 緩衝）
  ```
- [x] **顯示**：在預算管理頁面顯示「💡 建議」按鈕，點擊展開智能建議面板
- [x] **可信度**：根據數據一致性顯示高/中/低可信度
- [x] **一鍵套用**：點擊「套用」直接創建預算
- [x] **影響檔案**：
  - 新建 `web/src/utils/budgetSuggestions.ts` - 計算建議邏輯
  - 新建 `web/src/components/budgets/BudgetSuggestionCard.tsx` - 建議卡片組件
  - `web/src/components/budgets/BudgetManager.tsx` - 整合建議功能
  - `web/src/locales/translations.ts` - 新增建議相關翻譯
  - `web/src/index.css` - 新增建議卡片樣式

#### 2.4 預算排序與篩選
- [x] **功能**：
  - 按使用率排序（高到低 / 低到高）
  - 按類別名稱排序
  - 篩選：只顯示超支 / 接近閾值 / 正常
- [x] **影響檔案**：
  - `web/src/components/budgets/BudgetManager.tsx` - 新增 sortBy, filterBy 狀態和 UI
  - `web/src/locales/translations.ts` - 新增排序/篩選相關翻譯

---

## Phase 3: 進階功能開發 🚀

### 目標
新增高價值進階功能。

### 任務清單

#### 3.1 預算 Rollover（額度結轉）
- [x] **功能**：未用完的預算可累積到下期
- [x] **設定選項**：
  - 不結轉（預設）
  - 全額結轉
  - 結轉百分比（例如 50%）
  - 最大結轉上限
- [x] **資料模型更新**：
  ```typescript
  interface Budget {
    // ... existing fields
    rolloverEnabled?: boolean;
    rolloverPercentage?: number; // 0-100
    rolloverCap?: number; // 最大結轉金額
    accumulatedRollover?: number; // 累積結轉金額
  }
  ```
- [x] **影響檔案**：
  - `web/src/types/index.ts` - 新增 rollover 欄位
  - `web/src/components/budgets/BudgetForm.tsx` - 新增 rollover 設定 UI
  - `web/src/components/budgets/BudgetManager.tsx` - 顯示 rollover 狀態
  - `web/src/components/dashboard/widgets/BudgetProgressWidget.tsx` - 使用有效預算金額
  - `web/src/utils/budgetNotifications.ts` - 使用有效預算金額計算警報
  - 新建 `web/src/utils/budgetRollover.ts` - rollover 計算邏輯
  - `web/src/locales/translations.ts` - 新增 rollover 翻譯
  - 新建 `docs/BUDGET_ROLLOVER_FEATURE.md` - 功能文檔

#### 3.2 預算模板
- [x] **功能**：快速套用預設預算組合
- [x] **預設模板**：
  - 🎓 學生版 - 適合收入有限的學生
  - 💼 上班族 - 適合職場工作者
  - 👨‍👩‍👧‍👦 家庭版 - 適合有小孩的家庭
  - ✈️ 旅行版 - 適合旅行和度假
  - 🐷 節儉版 - 專注儲蓄的極簡預算
- [x] **自訂模板**：保存當前預算為模板（未來可擴展）
- [x] **影響檔案**：
  - `web/src/types/index.ts` - 新增 BudgetTemplate, BudgetTemplateBudget 類型
  - 新建 `web/src/utils/budgetTemplates.ts` - 內建模板數據和計算邏輯
  - 新建 `web/src/components/budgets/BudgetTemplates.tsx` - 模板選擇 UI
  - `web/src/components/budgets/BudgetManager.tsx` - 整合模板功能
  - `web/src/locales/translations.ts` - 新增模板相關翻譯

#### 3.3 預算調整建議
- [x] **功能**：系統主動建議調整預算
- [x] **觸發條件**：
  - 連續 3 個月超支 > 10%
  - 連續 3 個月使用率 < 50%
- [x] **顯示**：預算頁面提示（📊 Adjustments 按鈕）
- [x] **影響檔案**：
  - 新建 `web/src/utils/budgetAnalysis.ts` - 分析邏輯
  - 新建 `web/src/components/budgets/BudgetAdjustmentCard.tsx` - 建議卡片組件
  - `web/src/components/budgets/BudgetManager.tsx` - 整合調整建議功能
  - `web/src/locales/translations.ts` - 新增調整建議翻譯

#### 3.4 預算歷史趨勢（進階版）
- [x] **功能**：
  - 圖表顯示歷史趨勢（Recharts BarChart）
  - 視圖切換（簡易柱狀圖 / 進階圖表）
  - 統計數據顯示（平均、最高、最低、超支次數）
- [x] **影響檔案**：
  - `web/src/components/budgets/BudgetHistory.tsx` - 升級為 Recharts 圖表
  - `web/src/components/budgets/BudgetManager.tsx` - 傳遞 showAdvanced 參數
  - `web/src/locales/translations.ts` - 新增圖表相關翻譯
  - `web/src/index.css` - 新增進階圖表樣式

---

## 📊 資料模型變更摘要

### Budget 介面更新

```typescript
// web/src/types/index.ts
export interface Budget {
  id?: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string; // 保留給週/年預算使用
  alertThreshold: number;
  
  // Phase 3 新增
  rolloverEnabled?: boolean;
  rolloverPercentage?: number;
  rolloverCap?: number;
  accumulatedRollover?: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔄 實作順序建議

```
Phase 1.1 → 1.2 → 1.3 → 1.4 （必須按順序）
    ↓
Phase 2.1 → 2.4 → 2.2 → 2.3 （可並行）
    ↓
Phase 3.1 → 3.2 → 3.3 → 3.4 （可並行）
```

---

## ✅ 完成標準

### Phase 1 完成條件
- [ ] 所有月預算使用 billingCycleDay 計算
- [ ] 預算花費扣除還款金額
- [ ] 預算卡片顯示週期範圍
- [ ] 所有相關測試通過

### Phase 2 完成條件
- [ ] 每日預算分配功能可用
- [ ] 基礎歷史趨勢可查看
- [ ] 新增預算時顯示建議值
- [ ] 排序和篩選功能可用

### Phase 3 完成條件
- [x] Rollover 功能完整可用
- [x] 5 個預設模板（學生、上班族、家庭、旅行、節儉）
- [x] 自動調整建議功能
- [x] Recharts 圖表趨勢分析

---

## 📝 備註

- 每個 Phase 完成後需更新相關文檔
- 新增翻譯鍵到 `translations.ts`
- 確保深色模式相容
- 行動裝置響應式設計

---

## 📅 更新記錄

| 日期 | 更新內容 |
|------|----------|
| 2025-12-01 | 初始計畫建立 |
| 2025-12-01 | Phase 1 完成 - 核心問題修復 |
| 2025-12-01 | Phase 2 完成 - 基礎功能增強 |
| 2025-12-01 | Phase 3 完成 - 進階功能開發（Rollover、Templates、Adjustments、Advanced History） |

