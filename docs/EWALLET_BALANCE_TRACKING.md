# E-Wallet & Bank Balance Tracking Implementation

## 概述 (Overview)

實現電子錢包和銀行帳戶的餘額追蹤功能，讓用戶能夠查看每個電子錢包/銀行的收入、支出和當前餘額。所有支付方式（信用卡、電子錢包、銀行）現在採用統一的卡片式 UI 設計。

Implemented balance tracking feature for e-wallets and bank accounts, allowing users to view income, spending, and current balance for each e-wallet/bank. All payment methods (credit cards, e-wallets, banks) now use a unified card-style UI design.

## 功能說明 (Features)

### 1. 收入記錄支付方式 (Income Payment Method Recording)
- 收入表單現在支持選擇支付方式（現金、信用卡、電子錢包、銀行轉賬）
- 當選擇電子錢包作為支付方式時，可以指定具體的電子錢包
- 這樣系統就能追蹤哪個電子錢包收到了這筆收入

Income forms now support payment method selection (cash, credit card, e-wallet, bank transfer). When e-wallet is selected, users can specify which e-wallet received the income.

### 2. 餘額計算 (Balance Calculation)
每個電子錢包的統計數據包含：
- **收入總額** (Total Income): 所有選擇該電子錢包作為支付方式的收入總和
- **支出總額** (Total Spending): 所有使用該電子錢包支付的費用總和
- **當前餘額** (Current Balance): 收入總額 - 支出總額

Each e-wallet's statistics include:
- **Total Income**: Sum of all incomes received via this e-wallet
- **Total Spending**: Sum of all expenses paid with this e-wallet
- **Current Balance**: Total Income - Total Spending

### 3. 視覺化顯示 (Visual Display)
電子錢包卡片採用與信用卡一致的 UI 設計：
- **卡片頭部**：顯示圖標、名稱、供應商和操作按鈕
- **統計網格**（4 格佈局）：
  - 收入：綠色文字
  - 支出：藍色文字
  - 餘額：根據正負值顯示綠色（正）或紅色（負）
  - 交易數：黃色文字，顯示收入+支出的總筆數

E-wallet cards use the same UI design as credit cards:
- **Card Header**: Icon, name, provider, and action buttons
- **Stats Grid** (4-cell layout):
  - Income: Green text
  - Spending: Blue text
  - Balance: Green (positive) or red (negative)
  - Transactions: Yellow text, showing total count of incomes + expenses

## 實作細節 (Implementation Details)

### 1. 類型擴展 (Type Extensions)

#### Income Interface (`web/src/types/index.ts`)
```typescript
export interface Income {
  // ... existing fields
  paymentMethod?: 'cash' | 'credit_card' | 'e_wallet' | 'bank';
  paymentMethodName?: string;  // For e-wallet name
  cardId?: string;             // For credit card
  bankId?: string;             // For bank
}
```

### 2. 組件修改 (Component Modifications)

#### IncomeForm (`web/src/components/income/IncomeForm.tsx`)
**新增功能：**
- 加入支付方式選擇器（與 ExpenseForm 一致的 UI）
- 根據選擇的支付方式顯示對應的子選項（信用卡列表、電子錢包列表、銀行列表）
- 提交前清理未使用的支付方式欄位

**New Features:**
- Added payment method selector (consistent with ExpenseForm UI)
- Show corresponding sub-options based on payment method selection
- Clean up unused payment method fields before submission

**Props 新增：**
```typescript
interface IncomeFormProps {
  // ... existing props
  cards?: Card[];       // For credit card selection
  ewallets?: EWallet[]; // For e-wallet selection
  banks?: Bank[];       // For bank selection
}
```

#### EWalletManager (`web/src/components/ewallet/EWalletManager.tsx`)
**新增功能：**
- 接收 incomes 數據
- 計算每個電子錢包的收入、支出和餘額
- 採用信用卡式的卡片佈局（card-header + stats-grid）
- 在統計網格中顯示四項數據：收入、支出、餘額、交易數

**New Features:**
- Accept incomes data
- Calculate income, spending, and balance for each e-wallet
- Use credit card-style card layout (card-header + stats-grid)
- Display four statistics in grid: income, spending, balance, transactions

#### BankManager (`web/src/components/banks/BankManager.tsx`)
**新增功能：**
- 接收 expenses 和 incomes 數據
- 計算每個銀行帳戶的收入、支出和餘額
- 採用與信用卡和電子錢包一致的卡片佈局
- 在統計網格中顯示四項數據：收入、支出、餘額、交易數
- 響應式設計：桌面版顯示按鈕，移動版顯示漢堡選單

**New Features:**
- Accept expenses and incomes data
- Calculate income, spending, and balance for each bank account
- Use consistent card layout with credit cards and e-wallets
- Display four statistics in grid: income, spending, balance, transactions
- Responsive design: buttons on desktop, hamburger menu on mobile

**getWalletStats 更新：**
```typescript
const getWalletStats = useMemo(() => {
  const stats: { 
    [walletName: string]: { 
      totalIncome: number;
      totalSpending: number;
      balance: number;
      expenses: Expense[];
      incomes: Income[];
    } 
  } = {};
  
  ewallets.forEach((wallet) => {
    // Calculate expenses
    const walletExpenses = expenses.filter(
      (exp) => exp.paymentMethod === 'e_wallet' && exp.paymentMethodName === wallet.name
    );
    const totalSpending = walletExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Calculate incomes
    const walletIncomes = incomes.filter(
      (inc) => inc.paymentMethod === 'e_wallet' && inc.paymentMethodName === wallet.name
    );
    const totalIncome = walletIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    
    // Calculate balance
    const balance = totalIncome - totalSpending;
    
    stats[wallet.name] = {
      totalIncome,
      totalSpending,
      balance,
      expenses: walletExpenses.sort(...),
      incomes: walletIncomes.sort(...),
    };
  });
  
  return stats;
}, [ewallets, expenses, incomes]);
```

**UI 顯示更新（統計網格佈局，與信用卡一致）：**
```tsx
{/* Card Header */}
<div className="card-header">
  <div className="card-info">
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Icon with colored circle background */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: wallet.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        flexShrink: 0
      }}>
        {wallet.icon}
      </div>
      <div>
        <h3 className="card-name">{wallet.name}</h3>
        {wallet.provider && (
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            {wallet.provider}
          </p>
        )}
      </div>
    </div>
  </div>
  <div className="card-actions">
    {/* Edit and Delete buttons */}
  </div>
</div>

{/* Stats Grid - Same layout as credit cards */}
{(() => {
  const stats = getWalletStats[wallet.name];
  if (!stats) return null;
  
  return (
    <div className="stats-grid">
      <div className="stat-card info">
        <p className="stat-label">{t('walletIncome')}</p>
        <p className="stat-value success-text">${stats.totalIncome.toFixed(2)}</p>
      </div>
      <div className="stat-card success">
        <p className="stat-label">{t('walletSpending')}</p>
        <p className="stat-value info-text">${stats.totalSpending.toFixed(2)}</p>
      </div>
      <div className="stat-card accent">
        <p className="stat-label">{t('walletBalance')}</p>
        <p className="stat-value" style={{ 
          color: stats.balance >= 0 ? 'var(--success-text)' : 'var(--error-text)'
        }}>
          ${stats.balance.toFixed(2)}
        </p>
      </div>
      <div className="stat-card warning">
        <p className="stat-label">{t('transactions')}</p>
        <p className="stat-value warning-text">{stats.expenses.length + stats.incomes.length}</p>
      </div>
    </div>
  );
})()}
```

### 3. 數據流 (Data Flow)

```
Dashboard
  ├─ incomes (state)
  ├─ expenses (state)
  ├─ cards (state)
  ├─ ewallets (state)
  └─ banks (state)
       ↓
  IncomesTab
    ├─ IncomeForm (add mode)
    │   └─ 支付方式選擇器
    └─ IncomeList
        └─ IncomeForm (edit mode)
            └─ 支付方式選擇器
       ↓
  PaymentMethodsTab
    └─ EWalletManager
        └─ 計算並顯示餘額
```

### 翻譯鍵值 (Translation Keys)

新增的翻譯鍵值 (`web/src/locales/translations.ts`):
```typescript
walletBalance: { en: 'Balance', zh: '餘額', 'zh-CN': '余额' },
walletIncome: { en: 'Income', zh: '收入', 'zh-CN': '收入' },
walletSpending: { en: 'Spending', zh: '支出', 'zh-CN': '支出' },
transactions: { en: 'Transactions', zh: '交易數', 'zh-CN': '交易数' },
```

已存在的翻譯鍵值（重複使用）:
- `selectCard`: 選擇卡片 / Select Card
- `selectEWallet`: 選擇電子錢包 / Select E-Wallet
- `selectBank`: 選擇銀行 / Select Bank
- `paymentMethod`: 支付方式 / Payment Method

## 修改的文件 (Modified Files)

### 類型定義 (Type Definitions)
1. `web/src/types/index.ts` - 擴展 Income 接口

### 組件 (Components)
2. `web/src/components/income/IncomeForm.tsx` - 加入支付方式選擇
3. `web/src/components/income/IncomeList.tsx` - 傳遞支付方式相關 props
4. `web/src/components/ewallet/EWalletManager.tsx` - 計算並顯示電子錢包餘額（卡片式佈局）
5. `web/src/components/banks/BankManager.tsx` - 計算並顯示銀行餘額（卡片式佈局）
6. `web/src/components/payment/PaymentMethodsTab.tsx` - 傳遞 incomes 和 expenses

### 頁面 (Pages)
6. `web/src/pages/tabs/IncomesTab.tsx` - 傳遞支付方式相關 props
7. `web/src/pages/Dashboard.tsx` - 傳遞 incomes 和支付方式數據

### 本地化 (Localization)
8. `web/src/locales/translations.ts` - 新增餘額相關翻譯

## 使用方式 (Usage)

### 1. 記錄收入到電子錢包
1. 點擊「收入」標籤頁
2. 點擊「+ 新增收入」按鈕
3. 填寫收入金額和日期
4. 在「支付方式」下拉選單選擇「📱 電子錢包」
5. 在出現的「選擇電子錢包」下拉選單中選擇目標電子錢包
6. 點擊「新增收入」完成

### 2. 查看電子錢包餘額
1. 點擊「支付方式」標籤頁
2. 點擊「電子錢包」子標籤
3. 每個電子錢包卡片會顯示：
   - 收入：綠色數字
   - 支出：紅色數字
   - 餘額：根據正負顯示顏色（正數綠色，負數紅色）

## 技術細節 (Technical Details)

### 性能優化 (Performance Optimization)
- 使用 `useMemo` 緩存餘額計算結果
- 只在 ewallets, expenses, incomes 改變時重新計算
- 避免不必要的重新渲染

### 數據驗證 (Data Validation)
- 支付方式為可選欄位
- 提交前清理未使用的支付方式相關欄位
- 避免向 Firestore 存儲空值或未定義的值

### 向後兼容 (Backward Compatibility)
- 舊的收入記錄沒有 paymentMethod 欄位仍然可以正常顯示
- 新增的欄位都是可選的（optional）
- 不影響現有功能的正常運作

## 未來改進 (Future Enhancements)

1. **餘額歷史追蹤**
   - 記錄每日餘額變化
   - 顯示餘額趨勢圖表

2. **餘額提醒**
   - 當餘額低於設定值時發送通知
   - 當餘額為負數時顯示警告

3. **轉賬功能**
   - 支持電子錢包之間的轉賬
   - 從信用卡儲值到電子錢包

4. **多幣種支持**
   - 支持不同幣種的電子錢包
   - 自動匯率轉換

## 測試建議 (Testing Recommendations)

### 功能測試 (Functional Testing)
1. 創建新收入並選擇電子錢包
2. 確認餘額正確計算（收入 - 支出）
3. 編輯收入的支付方式
4. 刪除收入後餘額更新
5. 切換不同電子錢包查看各自餘額

### 邊界測試 (Edge Cases)
1. 沒有任何收入或支出時顯示 $0.00
2. 餘額為負數時正確顯示紅色
3. 大額數字（>1000000）正確顯示
4. 小數點精度（$0.01）正確計算

### UI/UX 測試 (UI/UX Testing)
1. 響應式設計：手機、平板、桌面
2. 深色模式下顏色顯示正確
3. 多語言切換時標籤正確顯示
4. 長電子錢包名稱不會破壞版面

## 總結 (Summary)

這次實作完成了電子錢包和銀行的餘額追蹤功能，讓用戶能夠：
- 記錄收入到特定電子錢包或銀行帳戶
- 實時查看每個電子錢包/銀行的收入、支出和餘額
- 更好地管理電子錢包和銀行帳戶的資金流動
- 統一的卡片式 UI 設計（與信用卡頁面一致）

所有修改都保持向後兼容，不影響現有功能的使用。

This implementation completed the balance tracking feature for e-wallets and banks, allowing users to:
- Record income to specific e-wallets or bank accounts
- View real-time income, spending, and balance for each e-wallet/bank
- Better manage cash flow in e-wallets and bank accounts
- Unified card-style UI design (consistent with credit cards)

All changes are backward compatible and do not affect existing functionality.
