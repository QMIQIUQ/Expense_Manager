# 自定義月結日功能實現

## 概述
實現了用戶自定義月結日（Billing Cycle Day）功能，允許用戶根據自己的需求設定每月數據重置的日期。Dashboard 的月度統計將根據此設定進行計算。

## 問題分析

### 原有邏輯
- **Monthly Expense**: 僅顯示系統當前月份的消費（例如：11月1日～11月30日）
- **所有其他數據**: 顯示全部歷史資料
- **問題**: 用戶無法自定義月度統計週期，無法配合個人財務管理習慣

### 用戶需求
- 設定每月更新的日子（例如：15日、25日等）
- 月度統計從該日期開始計算到次月該日期的前一天
- 例如：設定15日，則統計週期為 15日～次月14日

## 實現方案

### 1. 數據模型 (`types/index.ts`)

#### 新增 UserSettings 介面
```typescript
export interface UserSettings {
  id?: string;
  userId: string;
  billingCycleDay: number; // 1-31，每月重置日
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. 後端服務 (`services/userSettingsService.ts`)

#### 新建服務檔案
提供以下功能：
- `get(userId)`: 獲取用戶設定
- `create(settings)`: 創建新設定
- `update(userId, updates)`: 更新設定
- `getOrCreate(userId)`: 獲取或創建預設設定（billingCycleDay = 1）

#### Firestore Collection
- Collection: `userSettings`
- Document ID: userId
- 已添加到 `USER_DATA_COLLECTIONS`，刪除用戶時會一併清理

### 3. Dashboard 計算邏輯 (`components/dashboard/DashboardSummary.tsx`)

#### 新增 Props
```typescript
interface DashboardSummaryProps {
  // ... existing props
  billingCycleDay?: number; // 預設為 1
}
```

#### 週期計算函數
```typescript
const getBillingCycleDates = () => {
  const now = new Date();
  const currentDay = now.getDate();
  
  let cycleStart: Date;
  let cycleEnd: Date;
  
  if (currentDay >= billingCycleDay) {
    // 當前週期：本月 billingCycleDay 到次月 billingCycleDay - 1
    cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
    cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay - 1);
  } else {
    // 上個週期：上月 billingCycleDay 到本月 billingCycleDay - 1
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
    cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay - 1);
  }
  
  return { cycleStart, cycleEnd };
};
```

#### 更新的統計邏輯
- **Monthly Expense**: 篩選 cycleStart 到 cycleEnd 之間的支出
- **Monthly Income**: 篩選 cycleStart 到 cycleEnd 之間的收入
- **Net Cashflow**: 使用週期內的收支計算

### 4. 用戶設定介面 (`pages/UserProfile.tsx`)

#### 新增功能
1. **載入設定**
   - 組件掛載時自動載入或創建用戶設定
   - 顯示當前的 billingCycleDay

2. **編輯介面**
   - 數字輸入框（1-31）
   - 即時驗證：必須在 1-31 範圍內
   - 儲存按鈕（含載入狀態）

3. **說明文字**
   - 清楚解釋功能用途
   - 提供範例說明（例如：設定15日，統計15日～次月14日）

### 5. Dashboard 整合 (`pages/Dashboard.tsx`)

#### 狀態管理
```typescript
const [billingCycleDay, setBillingCycleDay] = useState<number>(1);
```

#### 資料載入
```typescript
// 在 loadData 中載入用戶設定
const userSettings = await userSettingsService.getOrCreate(currentUser.uid);
setBillingCycleDay(userSettings.billingCycleDay);
```

#### 傳遞給子組件
```typescript
<DashboardSummary 
  expenses={expenses} 
  incomes={incomes} 
  repayments={repayments}
  billingCycleDay={billingCycleDay}
  onMarkTrackingCompleted={handleMarkTrackingCompleted}
/>
```

### 6. 翻譯鍵 (`locales/translations.ts`)

#### 新增的翻譯
| Key | English | 繁體中文 | 簡體中文 |
|-----|---------|---------|---------|
| billingCycleSettings | Billing Cycle Settings | 月結日設定 | 月结日设定 |
| monthlyResetDay | Monthly Reset Day | 每月重置日 | 每月重置日 |
| billingCycleDescription | Set the day of each month... | 設定每個月的重置日期... | 设定每个月的重置日期... |
| selectDay | Select Day | 選擇日期 | 选择日期 |
| billingCycleHint | Example: If you set day 15... | 例如：若設定為 15 日... | 例如：若设定为 15 日... |
| settingsSaved | Settings saved successfully | 設定已成功儲存 | 设定已成功保存 |
| errorLoadingSettings | Error loading settings | 載入設定時發生錯誤 | 载入设定时发生错误 |
| errorSavingSettings | Error saving settings | 儲存設定時發生錯誤 | 保存设定时发生错误 |
| invalidBillingCycleDay | Please enter a valid day... | 請輸入 1 到 31... | 请输入 1 到 31... |
| accountSettings | Account Settings | 帳號設定 | 账号设定 |
| contactAdminForChanges | To change password... | 如需更改密碼... | 如需更改密码... |

## 使用流程

### 用戶操作
1. 登入系統
2. 點擊右上角「👤 Profile」
3. 在「月結日設定」區塊：
   - 查看當前設定（預設為 1）
   - 修改日期（1-31）
   - 點擊「儲存」按鈕
4. 返回 Dashboard 查看更新後的月度統計

### 計算範例

#### 範例 1：設定為 1 日（預設）
- 今天：2025/11/17
- 計算週期：2025/11/01 ～ 2025/11/30
- 顯示：11月份的所有消費

#### 範例 2：設定為 15 日
- 今天：2025/11/17（>= 15）
- 計算週期：2025/11/15 ～ 2025/12/14
- 顯示：11/15 到 12/14 的消費

#### 範例 3：設定為 25 日
- 今天：2025/11/17（< 25）
- 計算週期：2025/10/25 ～ 2025/11/24
- 顯示：10/25 到 11/24 的消費

## 技術細節

### 日期比較邏輯
```typescript
// 使用 Date 對象進行日期範圍篩選
const expDate = new Date(exp.date);
return expDate >= cycleStart && expDate <= cycleEnd;
```

### 預設值處理
- 新用戶：自動創建 billingCycleDay = 1 的設定
- 載入失敗：使用預設值 1
- 無效輸入：顯示錯誤訊息，不儲存

### 資料同步
- UserProfile 修改後立即儲存到 Firestore
- Dashboard 每次 loadData 時重新載入最新設定
- 修改後不需重新載入頁面，下次切換 tab 時會自動更新

## 資料庫結構

### Firestore Collection: `userSettings`
```
userSettings/
  {userId}/
    - userId: string
    - billingCycleDay: number (1-31)
    - createdAt: Timestamp
    - updatedAt: Timestamp
```

### 索引需求
不需要額外的複合索引，使用 userId 作為 Document ID 進行查詢。

## 未來增強

### 可能的擴展功能
1. **多週期支持**
   - 允許設定多個追蹤週期
   - 例如：個人週期、信用卡週期等

2. **週期預覽**
   - 顯示當前週期的起止日期
   - 顯示下個週期何時開始

3. **歷史週期查詢**
   - 查看過去某個特定週期的統計
   - 週期對比功能

4. **自動提醒**
   - 週期結束前提醒
   - 預算接近上限提醒

5. **週期報表**
   - 生成週期報告
   - 匯出特定週期的數據

## 測試建議

### 測試場景
1. **預設值測試**
   - 新用戶應自動使用 billingCycleDay = 1
   - Dashboard 應正確顯示當月數據

2. **修改測試**
   - 修改為 15 日，驗證計算範圍
   - 修改為 25 日，驗證計算範圍
   - 在月中和月末分別測試

3. **邊界值測試**
   - 輸入 1（最小值）
   - 輸入 31（最大值）
   - 輸入 0、32（無效值）

4. **跨月測試**
   - 測試 1 月 31 日的月份（2月只有28/29天）
   - 測試小月（30天）的處理

5. **多語言測試**
   - 驗證所有語言的翻譯正確
   - 驗證說明文字清晰易懂

## 檔案清單

### 新增檔案
- `web/src/services/userSettingsService.ts` - 用戶設定服務
- `docs/BILLING_CYCLE_FEATURE.md` - 本文檔

### 修改檔案
- `web/src/types/index.ts` - 新增 UserSettings 介面
- `web/src/constants/collections.ts` - 新增 USER_SETTINGS collection
- `web/src/components/dashboard/DashboardSummary.tsx` - 更新計算邏輯
- `web/src/pages/Dashboard.tsx` - 載入和傳遞設定
- `web/src/pages/UserProfile.tsx` - 新增設定 UI
- `web/src/locales/translations.ts` - 新增翻譯鍵

## 效益

### 對用戶的價值
1. **靈活追蹤** - 可配合信用卡帳單日、薪資發放日等設定
2. **精準管理** - 更準確地追蹤特定週期的消費
3. **個人化** - 根據個人習慣自定義財務週期

### 對系統的影響
1. **向後相容** - 預設值為 1，不影響現有用戶
2. **效能良好** - 計算在客戶端進行，不增加伺服器負擔
3. **易於擴展** - 架構支援未來添加更多週期相關功能
