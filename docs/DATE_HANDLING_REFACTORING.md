# Date Handling Refactoring Documentation

## Overview

This document describes the comprehensive refactoring of date and time handling across the Expense Manager application. The refactoring introduces utility functions that properly handle local timezone operations, replacing the previous UTC-based approach that caused timezone-related bugs.

**Commit Reference:** `c0eb229` - "Refactor date handling across forms and dashboard components to use utility functions for local date and time"

---

## Table of Contents

- [English Documentation](#english-documentation)
  - [The Problem](#the-problem)
  - [The Solution](#the-solution)
  - [New Utility Functions](#new-utility-functions)
  - [Components Updated](#components-updated)
  - [Usage Examples](#usage-examples)
  - [Benefits](#benefits)
  - [Migration Guide](#migration-guide)
  - [Best Practices](#best-practices)
- [中文文檔 (Traditional Chinese)](#中文文檔-traditional-chinese)

---

## English Documentation

### The Problem

#### Previous Approach
Previously, the application used the following pattern to get today's date:

```typescript
const today = new Date().toISOString().split('T')[0];
```

#### Why This Was Problematic

This approach has a critical flaw: **it returns dates in UTC timezone, not local timezone**.

**Real-World Impact Example:**
- **User Location:** Pacific Standard Time (PST, UTC-8)
- **Local Time:** 11:30 PM on December 25, 2024
- **UTC Time:** 7:30 AM on December 26, 2024
- **Result:** The application would show December 26 instead of December 25

This created several issues:
1. **Date Mismatch:** Users creating expenses late at night would see the next day's date
2. **Reporting Errors:** Daily/monthly summaries would include transactions in the wrong date buckets
3. **Time Zone Confusion:** Users in different timezones had inconsistent experiences
4. **Form Defaults:** New expense forms would default to the wrong date during late evening hours

### The Solution

A new utility module (`web/src/utils/dateUtils.ts`) was created with three focused functions that handle dates and times in the **user's local timezone**.

### New Utility Functions

#### File Location
```
web/src/utils/dateUtils.ts
```

#### 1. `getTodayLocal()`

**Purpose:** Get today's date in local timezone formatted as YYYY-MM-DD

**Signature:**
```typescript
export const getTodayLocal = (): string
```

**Implementation:**
```typescript
export const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**Returns:** String in format `"YYYY-MM-DD"` (e.g., `"2024-12-25"`)

**Use Cases:**
- Setting default date in forms
- Filtering expenses by "today"
- Comparing dates to current date

---

#### 2. `getCurrentTimeLocal()`

**Purpose:** Get current time in local timezone formatted as HH:MM

**Signature:**
```typescript
export const getCurrentTimeLocal = (): string
```

**Implementation:**
```typescript
export const getCurrentTimeLocal = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};
```

**Returns:** String in format `"HH:MM"` (e.g., `"23:30"`, `"09:15"`)

**Use Cases:**
- Setting default time in expense forms
- Timestamping transactions with exact time
- Time-based filtering and sorting

---

#### 3. `formatDateLocal(date)`

**Purpose:** Format a date string or Date object to YYYY-MM-DD in local timezone

**Signature:**
```typescript
export const formatDateLocal = (date: Date | string): string
```

**Implementation:**
```typescript
export const formatDateLocal = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**Parameters:**
- `date`: A JavaScript Date object or ISO date string

**Returns:** String in format `"YYYY-MM-DD"` (e.g., `"2024-12-25"`)

**Use Cases:**
- Converting Date objects from Firestore to display format
- Normalizing dates from various sources
- Creating date strings for filtering and comparison

---

### Components Updated

The following components were updated to use the new utility functions:

#### 1. **ExpenseForm.tsx** (`web/src/components/expenses/ExpenseForm.tsx`)
- **Functions Used:** `getTodayLocal()`, `getCurrentTimeLocal()`
- **Changes:**
  - Default date field now uses `getTodayLocal()`
  - Default time field now uses `getCurrentTimeLocal()`
  - Form reset after submission uses both utilities

#### 2. **ExpenseList.tsx** (`web/src/components/expenses/ExpenseList.tsx`)
- **Functions Used:** `getTodayLocal()`, `formatDateLocal()`
- **Changes:**
  - "Today" filter uses `getTodayLocal()`
  - Date range calculations use `formatDateLocal()` for one-month-ago date

#### 3. **IncomeForm.tsx** (`web/src/components/income/IncomeForm.tsx`)
- **Functions Used:** `getTodayLocal()`
- **Changes:**
  - Default date field uses `getTodayLocal()`
  - Form reset uses `getTodayLocal()`

#### 4. **BudgetForm.tsx** (`web/src/components/budgets/BudgetForm.tsx`)
- **Functions Used:** `getTodayLocal()`
- **Changes:**
  - Default start date uses `getTodayLocal()`

#### 5. **RepaymentForm.tsx** (`web/src/components/repayment/RepaymentForm.tsx`)
- **Functions Used:** `getTodayLocal()`
- **Changes:**
  - Default date field uses `getTodayLocal()`
  - Form reset uses `getTodayLocal()`

#### 6. **RecurringForm.tsx** (`web/src/components/recurring/RecurringForm.tsx`)
- **Functions Used:** `getTodayLocal()`
- **Changes:**
  - Default start date for recurring expenses uses `getTodayLocal()`

#### 7. **DashboardSummary.tsx** (`web/src/components/dashboard/DashboardSummary.tsx`)
- **Functions Used:** `getTodayLocal()`, `formatDateLocal()`
- **Changes:**
  - "Today" calculations use `getTodayLocal()`
  - Trend chart date formatting uses `formatDateLocal()`

---

### Usage Examples

#### Example 1: Setting Default Date in a Form

**Before:**
```typescript
const [formData, setFormData] = useState({
  date: new Date().toISOString().split('T')[0],
  // other fields...
});
```

**After:**
```typescript
import { getTodayLocal } from '../../utils/dateUtils';

const [formData, setFormData] = useState({
  date: getTodayLocal(),
  // other fields...
});
```

**Why Better:** Always shows the correct local date, regardless of timezone.

---

#### Example 2: Setting Default Time

**Before:**
```typescript
// Manual implementation or incorrect approach
const now = new Date();
const time = `${now.getHours()}:${now.getMinutes()}`; // Missing zero-padding
```

**After:**
```typescript
import { getCurrentTimeLocal } from '../../utils/dateUtils';

const [formData, setFormData] = useState({
  time: getCurrentTimeLocal(),
  // other fields...
});
```

**Why Better:** Properly formatted with zero-padding (e.g., "09:05" instead of "9:5").

---

#### Example 3: Filtering by Today

**Before:**
```typescript
const today = new Date().toISOString().split('T')[0];
const todayExpenses = expenses.filter(exp => exp.date === today);
```

**After:**
```typescript
import { getTodayLocal } from '../../utils/dateUtils';

const today = getTodayLocal();
const todayExpenses = expenses.filter(exp => exp.date === today);
```

**Why Better:** Correctly filters expenses for the user's local "today".

---

#### Example 4: Formatting Dates from Firestore

**Before:**
```typescript
// Date might be displayed incorrectly due to timezone conversion
const displayDate = new Date(expense.createdAt).toISOString().split('T')[0];
```

**After:**
```typescript
import { formatDateLocal } from '../../utils/dateUtils';

const displayDate = formatDateLocal(expense.createdAt);
```

**Why Better:** Consistently formats dates in local timezone.

---

#### Example 5: Creating Date Ranges

**Before:**
```typescript
const oneMonthAgo = new Date();
oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
const startDate = oneMonthAgo.toISOString().split('T')[0]; // Wrong timezone
```

**After:**
```typescript
import { formatDateLocal } from '../../utils/dateUtils';

const oneMonthAgo = new Date();
oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
const startDate = formatDateLocal(oneMonthAgo);
```

**Why Better:** Maintains local timezone throughout the calculation.

---

### Benefits

#### 1. **Timezone Correctness**
- All dates and times reflect the user's actual local timezone
- No more "off-by-one-day" bugs for users in different timezones

#### 2. **Consistency**
- Single source of truth for date/time formatting
- All components use the same approach
- Predictable behavior across the application

#### 3. **Maintainability**
- Centralized utility functions are easier to update
- Bug fixes apply everywhere automatically
- Clear, documented API

#### 4. **Type Safety**
- TypeScript signatures prevent misuse
- Clear input/output types
- Compile-time error checking

#### 5. **Better User Experience**
- Forms show correct default dates
- Reports are accurate for the user's timezone
- No confusion about "when" a transaction occurred

#### 6. **Zero-Padding Consistency**
- All dates consistently formatted as YYYY-MM-DD
- All times consistently formatted as HH:MM
- Compatible with HTML5 date/time inputs

---

### Migration Guide

If you're adding new components or updating existing ones, follow these steps:

#### Step 1: Import the Utilities
```typescript
import { getTodayLocal, getCurrentTimeLocal, formatDateLocal } from '../../utils/dateUtils';
```

#### Step 2: Replace Date String Creation
**Find patterns like:**
- `new Date().toISOString().split('T')[0]`
- Manual date formatting: `${year}-${month}-${day}`
- Missing zero-padding implementations

**Replace with:**
- `getTodayLocal()` for today's date
- `getCurrentTimeLocal()` for current time
- `formatDateLocal(date)` for formatting existing dates

#### Step 3: Update Form Defaults
```typescript
const [formData, setFormData] = useState({
  date: initialData?.date || getTodayLocal(),
  time: initialData?.time || getCurrentTimeLocal(),
  // other fields...
});
```

#### Step 4: Update Form Resets
```typescript
setFormData({
  description: '',
  amount: 0,
  date: getTodayLocal(),
  time: getCurrentTimeLocal(),
  // other fields...
});
```

#### Step 5: Test Across Timezones
- Test creating records late at night (11 PM - midnight)
- Test in different timezone settings
- Verify date filtering works correctly

---

### Best Practices

#### DO ✅

1. **Always use utilities for local dates:**
   ```typescript
   const today = getTodayLocal();
   ```

2. **Use utilities for form defaults:**
   ```typescript
   date: initialData?.date || getTodayLocal()
   ```

3. **Use utilities for date comparison:**
   ```typescript
   const today = getTodayLocal();
   const isToday = expense.date === today;
   ```

4. **Format dates from external sources:**
   ```typescript
   const displayDate = formatDateLocal(firestoreTimestamp);
   ```

#### DON'T ❌

1. **Don't use toISOString() for local dates:**
   ```typescript
   // ❌ Wrong - uses UTC
   const today = new Date().toISOString().split('T')[0];
   ```

2. **Don't manually format dates:**
   ```typescript
   // ❌ Wrong - error-prone, no zero-padding
   const today = `${year}-${month}-${day}`;
   ```

3. **Don't mix UTC and local dates:**
   ```typescript
   // ❌ Wrong - inconsistent timezone handling
   const start = getTodayLocal();
   const end = new Date().toISOString().split('T')[0]; // Different approach!
   ```

4. **Don't assume date strings are in UTC:**
   ```typescript
   // ❌ Wrong - assumes UTC
   const date = new Date(dateString).toISOString();
   ```

---

### Testing Recommendations

When testing date-related functionality:

1. **Test at timezone boundaries:**
   - Run tests at 11:00 PM - 1:00 AM local time
   - Verify dates don't shift unexpectedly

2. **Test different timezones:**
   - Change system timezone and verify behavior
   - Test UTC+14 to UTC-12 timezones

3. **Test date ranges:**
   - Verify month boundaries work correctly
   - Test leap years
   - Test year boundaries (Dec 31 → Jan 1)

4. **Test form submissions:**
   - Verify submitted dates match displayed dates
   - Check database entries have correct dates

---

## 中文文檔 (Traditional Chinese)

### 概述

本文檔描述了 Expense Manager 應用程式中日期和時間處理的全面重構。此重構引入了正確處理本地時區操作的實用函數,取代了先前基於 UTC 的方法,解決了時區相關的錯誤。

**提交參考:** `c0eb229` - "Refactor date handling across forms and dashboard components to use utility functions for local date and time"

---

### 問題描述

#### 之前的方法
先前,應用程式使用以下模式來獲取今天的日期:

```typescript
const today = new Date().toISOString().split('T')[0];
```

#### 為什麼這種方法有問題

這種方法有一個關鍵缺陷:**它返回的是 UTC 時區的日期,而不是本地時區的日期**。

**實際影響範例:**
- **用戶位置:** 太平洋標準時間 (PST, UTC-8)
- **本地時間:** 2024 年 12 月 25 日晚上 11:30
- **UTC 時間:** 2024 年 12 月 26 日上午 7:30
- **結果:** 應用程式會顯示 12 月 26 日而不是 12 月 25 日

這造成了幾個問題:
1. **日期不匹配:** 用戶在深夜創建支出時會看到第二天的日期
2. **報告錯誤:** 每日/每月摘要會將交易包含在錯誤的日期分組中
3. **時區混淆:** 不同時區的用戶體驗不一致
4. **表單預設值:** 新支出表單在傍晚時段會預設為錯誤的日期

### 解決方案

創建了一個新的實用模組 (`web/src/utils/dateUtils.ts`),包含三個專注於**用戶本地時區**處理日期和時間的函數。

### 新的實用函數

#### 文件位置
```
web/src/utils/dateUtils.ts
```

#### 1. `getTodayLocal()`

**目的:** 獲取本地時區的今天日期,格式為 YYYY-MM-DD

**簽名:**
```typescript
export const getTodayLocal = (): string
```

**實作:**
```typescript
export const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**返回值:** 格式為 `"YYYY-MM-DD"` 的字串 (例如: `"2024-12-25"`)

**使用場景:**
- 設定表單中的預設日期
- 按"今天"過濾支出
- 將日期與當前日期比較

---

#### 2. `getCurrentTimeLocal()`

**目的:** 獲取本地時區的當前時間,格式為 HH:MM

**簽名:**
```typescript
export const getCurrentTimeLocal = (): string
```

**實作:**
```typescript
export const getCurrentTimeLocal = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};
```

**返回值:** 格式為 `"HH:MM"` 的字串 (例如: `"23:30"`, `"09:15"`)

**使用場景:**
- 設定支出表單中的預設時間
- 為交易添加精確時間戳
- 基於時間的過濾和排序

---

#### 3. `formatDateLocal(date)`

**目的:** 將日期字串或 Date 物件格式化為本地時區的 YYYY-MM-DD 格式

**簽名:**
```typescript
export const formatDateLocal = (date: Date | string): string
```

**實作:**
```typescript
export const formatDateLocal = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**參數:**
- `date`: JavaScript Date 物件或 ISO 日期字串

**返回值:** 格式為 `"YYYY-MM-DD"` 的字串 (例如: `"2024-12-25"`)

**使用場景:**
- 將 Firestore 的 Date 物件轉換為顯示格式
- 標準化來自各種來源的日期
- 創建用於過濾和比較的日期字串

---

### 更新的元件

以下元件已更新為使用新的實用函數:

#### 1. **ExpenseForm.tsx** (`web/src/components/expenses/ExpenseForm.tsx`)
- **使用的函數:** `getTodayLocal()`, `getCurrentTimeLocal()`
- **變更:**
  - 預設日期欄位現在使用 `getTodayLocal()`
  - 預設時間欄位現在使用 `getCurrentTimeLocal()`
  - 提交後的表單重置使用兩個實用函數

#### 2. **ExpenseList.tsx** (`web/src/components/expenses/ExpenseList.tsx`)
- **使用的函數:** `getTodayLocal()`, `formatDateLocal()`
- **變更:**
  - "今天"過濾器使用 `getTodayLocal()`
  - 日期範圍計算使用 `formatDateLocal()` 來獲取一個月前的日期

#### 3. **IncomeForm.tsx** (`web/src/components/income/IncomeForm.tsx`)
- **使用的函數:** `getTodayLocal()`
- **變更:**
  - 預設日期欄位使用 `getTodayLocal()`
  - 表單重置使用 `getTodayLocal()`

#### 4. **BudgetForm.tsx** (`web/src/components/budgets/BudgetForm.tsx`)
- **使用的函數:** `getTodayLocal()`
- **變更:**
  - 預設開始日期使用 `getTodayLocal()`

#### 5. **RepaymentForm.tsx** (`web/src/components/repayment/RepaymentForm.tsx`)
- **使用的函數:** `getTodayLocal()`
- **變更:**
  - 預設日期欄位使用 `getTodayLocal()`
  - 表單重置使用 `getTodayLocal()`

#### 6. **RecurringForm.tsx** (`web/src/components/recurring/RecurringForm.tsx`)
- **使用的函數:** `getTodayLocal()`
- **變更:**
  - 定期支出的預設開始日期使用 `getTodayLocal()`

#### 7. **DashboardSummary.tsx** (`web/src/components/dashboard/DashboardSummary.tsx`)
- **使用的函數:** `getTodayLocal()`, `formatDateLocal()`
- **變更:**
  - "今天"計算使用 `getTodayLocal()`
  - 趨勢圖日期格式化使用 `formatDateLocal()`

---

### 使用範例

#### 範例 1: 在表單中設定預設日期

**之前:**
```typescript
const [formData, setFormData] = useState({
  date: new Date().toISOString().split('T')[0],
  // 其他欄位...
});
```

**之後:**
```typescript
import { getTodayLocal } from '../../utils/dateUtils';

const [formData, setFormData] = useState({
  date: getTodayLocal(),
  // 其他欄位...
});
```

**為什麼更好:** 無論時區如何,始終顯示正確的本地日期。

---

#### 範例 2: 設定預設時間

**之前:**
```typescript
// 手動實作或不正確的方法
const now = new Date();
const time = `${now.getHours()}:${now.getMinutes()}`; // 缺少零填充
```

**之後:**
```typescript
import { getCurrentTimeLocal } from '../../utils/dateUtils';

const [formData, setFormData] = useState({
  time: getCurrentTimeLocal(),
  // 其他欄位...
});
```

**為什麼更好:** 正確格式化並帶有零填充 (例如: "09:05" 而不是 "9:5")。

---

#### 範例 3: 按今天過濾

**之前:**
```typescript
const today = new Date().toISOString().split('T')[0];
const todayExpenses = expenses.filter(exp => exp.date === today);
```

**之後:**
```typescript
import { getTodayLocal } from '../../utils/dateUtils';

const today = getTodayLocal();
const todayExpenses = expenses.filter(exp => exp.date === today);
```

**為什麼更好:** 正確過濾用戶本地的"今天"支出。

---

#### 範例 4: 從 Firestore 格式化日期

**之前:**
```typescript
// 由於時區轉換,日期可能顯示不正確
const displayDate = new Date(expense.createdAt).toISOString().split('T')[0];
```

**之後:**
```typescript
import { formatDateLocal } from '../../utils/dateUtils';

const displayDate = formatDateLocal(expense.createdAt);
```

**為什麼更好:** 始終以本地時區格式化日期。

---

#### 範例 5: 創建日期範圍

**之前:**
```typescript
const oneMonthAgo = new Date();
oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
const startDate = oneMonthAgo.toISOString().split('T')[0]; // 錯誤的時區
```

**之後:**
```typescript
import { formatDateLocal } from '../../utils/dateUtils';

const oneMonthAgo = new Date();
oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
const startDate = formatDateLocal(oneMonthAgo);
```

**為什麼更好:** 在整個計算過程中保持本地時區。

---

### 優勢

#### 1. **時區正確性**
- 所有日期和時間都反映用戶的實際本地時區
- 對於不同時區的用戶,不再出現"日期差一天"的錯誤

#### 2. **一致性**
- 日期/時間格式化的單一真實來源
- 所有元件使用相同的方法
- 整個應用程式的行為可預測

#### 3. **可維護性**
- 集中式實用函數更易於更新
- 錯誤修復自動應用到所有地方
- 清晰、有文檔的 API

#### 4. **類型安全**
- TypeScript 簽名防止誤用
- 清晰的輸入/輸出類型
- 編譯時錯誤檢查

#### 5. **更好的用戶體驗**
- 表單顯示正確的預設日期
- 報告對用戶時區準確
- 交易"何時"發生沒有混淆

#### 6. **零填充一致性**
- 所有日期都統一格式化為 YYYY-MM-DD
- 所有時間都統一格式化為 HH:MM
- 與 HTML5 日期/時間輸入兼容

---

### 遷移指南

如果您要添加新元件或更新現有元件,請遵循以下步驟:

#### 步驟 1: 匯入實用函數
```typescript
import { getTodayLocal, getCurrentTimeLocal, formatDateLocal } from '../../utils/dateUtils';
```

#### 步驟 2: 替換日期字串創建
**查找類似以下的模式:**
- `new Date().toISOString().split('T')[0]`
- 手動日期格式化: `${year}-${month}-${day}`
- 缺少零填充的實作

**替換為:**
- `getTodayLocal()` 用於今天的日期
- `getCurrentTimeLocal()` 用於當前時間
- `formatDateLocal(date)` 用於格式化現有日期

#### 步驟 3: 更新表單預設值
```typescript
const [formData, setFormData] = useState({
  date: initialData?.date || getTodayLocal(),
  time: initialData?.time || getCurrentTimeLocal(),
  // 其他欄位...
});
```

#### 步驟 4: 更新表單重置
```typescript
setFormData({
  description: '',
  amount: 0,
  date: getTodayLocal(),
  time: getCurrentTimeLocal(),
  // 其他欄位...
});
```

#### 步驟 5: 跨時區測試
- 在深夜 (晚上 11 點 - 午夜) 測試創建記錄
- 在不同時區設定下測試
- 驗證日期過濾工作正常

---

### 最佳實踐

#### 應該做 ✅

1. **始終使用實用函數來處理本地日期:**
   ```typescript
   const today = getTodayLocal();
   ```

2. **使用實用函數作為表單預設值:**
   ```typescript
   date: initialData?.date || getTodayLocal()
   ```

3. **使用實用函數進行日期比較:**
   ```typescript
   const today = getTodayLocal();
   const isToday = expense.date === today;
   ```

4. **格式化來自外部來源的日期:**
   ```typescript
   const displayDate = formatDateLocal(firestoreTimestamp);
   ```

#### 不應該做 ❌

1. **不要使用 toISOString() 來處理本地日期:**
   ```typescript
   // ❌ 錯誤 - 使用 UTC
   const today = new Date().toISOString().split('T')[0];
   ```

2. **不要手動格式化日期:**
   ```typescript
   // ❌ 錯誤 - 容易出錯,沒有零填充
   const today = `${year}-${month}-${day}`;
   ```

3. **不要混合使用 UTC 和本地日期:**
   ```typescript
   // ❌ 錯誤 - 時區處理不一致
   const start = getTodayLocal();
   const end = new Date().toISOString().split('T')[0]; // 不同的方法!
   ```

4. **不要假設日期字串是 UTC:**
   ```typescript
   // ❌ 錯誤 - 假設 UTC
   const date = new Date(dateString).toISOString();
   ```

---

### 測試建議

測試日期相關功能時:

1. **在時區邊界測試:**
   - 在本地時間晚上 11:00 - 凌晨 1:00 執行測試
   - 驗證日期不會意外改變

2. **測試不同時區:**
   - 更改系統時區並驗證行為
   - 測試 UTC+14 到 UTC-12 時區

3. **測試日期範圍:**
   - 驗證月份邊界工作正常
   - 測試閏年
   - 測試年份邊界 (12 月 31 日 → 1 月 1 日)

4. **測試表單提交:**
   - 驗證提交的日期與顯示的日期匹配
   - 檢查資料庫條目有正確的日期

---

## Summary

This refactoring provides a robust, timezone-aware solution for date and time handling throughout the Expense Manager application. By centralizing date operations in utility functions, we ensure consistency, maintainability, and correctness across all components.

**Key Takeaway:** Always use the utility functions from `dateUtils.ts` when working with dates and times to avoid timezone-related bugs.

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall application architecture
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing strategies and guidelines
- [FEATURES.md](./FEATURES.md) - Complete feature list

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-22 | 1.0.0 | Initial documentation for date handling refactoring (commit c0eb229) |

---

*Last Updated: November 22, 2025*
