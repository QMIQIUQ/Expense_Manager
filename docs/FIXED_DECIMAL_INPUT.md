# Fixed Decimal Point Input - 固定小數點輸入

## 概述 (Overview)

本系統的所有金額輸入欄位都採用固定小數點格式，類似於計算器或收銀機(POS)系統的輸入方式。用戶輸入的數字會從右側開始，自動向左移動，始終顯示兩位小數。

All amount input fields in the system use a fixed decimal point format, similar to calculator or POS systems. Digits entered by users start from the right and automatically shift left, always displaying two decimal places.

## 用戶體驗 (User Experience)

### 輸入示例 (Input Example)

當用戶想要輸入 $20.00 時：

```
初始狀態 (Initial):        0.00
輸入 "2" (Type "2"):       0.02
輸入 "0" (Type "0"):       0.20
輸入 "0" (Type "0"):       2.00
輸入 "0" (Type "0"):      20.00
```

### 另一個例子：輸入 $12.34

```
輸入 "1" → 0.01
輸入 "2" → 0.12
輸入 "3" → 1.23
輸入 "4" → 12.34
```

## 技術實現 (Technical Implementation)

### 數據存儲 (Data Storage)

- **內部存儲**: 以分(cents)為單位存儲整數值
- **顯示格式**: 轉換為元(dollars)並格式化為 X.XX
- **提交數據**: 轉換回元(dollars)供後端使用

**Internal Storage**: Store as integer cents
**Display Format**: Convert to dollars and format as X.XX
**Submit Data**: Convert back to dollars for backend

### 代碼實現 (Code Implementation)

#### 1. 狀態初始化 (State Initialization)

```tsx
const [formData, setFormData] = useState({
  // 從元轉換為分進行存儲
  // Convert from dollars to cents for storage
  amount: initialData?.amount ? Math.round(initialData.amount * 100) : 0,
});
```

#### 2. 輸入處理器 (Input Handler)

```tsx
const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  // 移除所有非數字字符
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, '');
  // 轉換為整數（分）
  // Convert to integer (cents)
  const amountInCents = parseInt(digitsOnly) || 0;
  setFormData((prev) => ({
    ...prev,
    amount: amountInCents,
  }));
};
```

#### 3. 輸入欄位 (Input Field)

```tsx
<input
  type="text"
  inputMode="numeric"
  value={(formData.amount / 100).toFixed(2)}
  onChange={handleAmountChange}
  onFocus={(e) => e.target.select()}
  placeholder="0.00"
  className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
  style={{
    borderColor: 'var(--border-color)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)'
  }}
/>
```

#### 4. 提交時轉換 (Conversion on Submit)

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // 轉換分為元
  // Convert cents to dollars
  const submitData = {
    ...formData,
    amount: formData.amount / 100
  };
  
  onSubmit(submitData);
};
```

## 已應用的表單 (Forms Using This Pattern)

### 主要表單 (Main Forms)
1. **ExpenseForm** (支出表單) - `web/src/components/expenses/ExpenseForm.tsx`
   - Amount field for expense amount

2. **IncomeForm** (收入表單) - `web/src/components/income/IncomeForm.tsx`
   - Amount field for income amount

3. **RepaymentForm** (還款表單) - `web/src/components/repayment/RepaymentForm.tsx`
   - Amount field for repayment amount

4. **BudgetManager** (預算管理) - `web/src/components/budgets/BudgetManager.tsx`
   - Amount field for budget amount

5. **CardForm** (信用卡表單) - `web/src/components/cards/CardForm.tsx`
   - Card Limit (信用額度)
   - Benefit Min Spend (福利最低消費)
   - Cashback Rules (現金回饋規則):
     - Min Spend For Rate (達到回饋率的最低消費)
     - Cap If Met (達標時的回饋上限)
     - Cap If Not Met (未達標時的回饋上限)

## 優點 (Benefits)

### 1. 無混淆 (No Confusion)
- 用戶直接看到元的金額，而不是分
- Users see dollars directly, not cents
- 沒有單位轉換的心理負擔
- No mental burden of unit conversion

### 2. 自然輸入 (Natural Input)
- 數字從右向左流動，就像計算器一樣
- Digits flow from right to left, like a calculator
- 符合用戶使用收銀機或計算器的習慣
- Matches user habits from POS systems or calculators

### 3. 始終格式化 (Always Formatted)
- 始終顯示兩位小數
- Always displays two decimal places
- 視覺上清晰一致
- Visually clear and consistent

### 4. 移動設備友好 (Mobile Friendly)
- `inputMode="numeric"` 在移動設備上觸發數字鍵盤
- `inputMode="numeric"` triggers numeric keyboard on mobile devices
- 更快的輸入體驗
- Faster input experience

### 5. 明確意圖 (Clear Intent)
- 標籤顯示 "金額 ($)" 明確表示貨幣
- Label shows "Amount ($)" to clearly indicate currency
- 用戶知道輸入的是貨幣金額
- Users know they're entering currency amounts

## 注意事項 (Important Notes)

### 編輯模式 (Edit Mode)
當編輯現有記錄時，必須將存儲的元金額轉換為分：

When editing existing records, stored dollar amounts must be converted to cents:

```tsx
amount: initialData?.amount ? Math.round(initialData.amount * 100) : 0
```

### 精度處理 (Precision Handling)
使用 `Math.round()` 確保正確的四捨五入：

Use `Math.round()` to ensure proper rounding:

```tsx
// 正確 (Correct)
Math.round(20.00 * 100) // = 2000

// 避免 (Avoid)
20.00 * 100 // 可能導致浮點數精度問題
            // May cause floating point precision issues
```

### 顯示格式 (Display Format)
始終使用 `.toFixed(2)` 確保兩位小數：

Always use `.toFixed(2)` to ensure two decimal places:

```tsx
(amount / 100).toFixed(2) // "20.00"
```

## 開發指南 (Development Guidelines)

### 添加新的金額欄位 (Adding New Amount Fields)

當需要添加新的金額輸入欄位時，請遵循以下步驟：

When adding new amount input fields, follow these steps:

1. **狀態存儲為分 (Store State as Cents)**
```tsx
const [amount, setAmount] = useState(
  initialValue ? Math.round(initialValue * 100) : 0
);
```

2. **創建輸入處理器 (Create Input Handler)**
```tsx
const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const digitsOnly = e.target.value.replace(/\D/g, '');
  const amountInCents = parseInt(digitsOnly) || 0;
  setAmount(amountInCents);
};
```

3. **設置輸入欄位 (Setup Input Field)**
```tsx
<input
  type="text"
  inputMode="numeric"
  value={(amount / 100).toFixed(2)}
  onChange={handleAmountChange}
  placeholder="0.00"
/>
```

4. **提交時轉換 (Convert on Submit)**
```tsx
onSubmit({
  amount: amount / 100  // 轉換為元
});
```

### 測試清單 (Testing Checklist)

測試新的金額欄位時，確保：

When testing new amount fields, ensure:

- [ ] 初始值正確顯示（編輯模式）
- [ ] Initial value displays correctly (edit mode)
- [ ] 輸入 "0" 顯示 "0.00"
- [ ] Typing "0" shows "0.00"
- [ ] 連續輸入數字正確移位
- [ ] Sequential digit entry shifts correctly
- [ ] 提交的數據是元（不是分）
- [ ] Submitted data is in dollars (not cents)
- [ ] 清除欄位返回 "0.00"
- [ ] Clearing field returns to "0.00"
- [ ] 移動設備顯示數字鍵盤
- [ ] Mobile devices show numeric keyboard

## 相關文件 (Related Documentation)

- [UX_OPTIMISTIC_CRUD.md](./UX_OPTIMISTIC_CRUD.md) - 樂觀更新用戶體驗
- [PR_SUMMARY.md](./PR_SUMMARY.md) - Pull Request 摘要

## 更新歷史 (Change History)

- **2025-11-20**: 初始實現 - 支出、收入、還款、預算表單
- **2025-11-20**: Initial implementation - Expense, Income, Repayment, Budget forms
- **2025-11-20**: 擴展至信用卡表單 - 額度和現金回饋規則
- **2025-11-20**: Extended to Card form - Limits and cashback rules

## 問題排查 (Troubleshooting)

### 問題：顯示值不正確 (Display value incorrect)
**解決方案**: 確保使用 `/ 100` 和 `.toFixed(2)`

**Solution**: Ensure using `/ 100` and `.toFixed(2)`

### 問題：提交的值是分而不是元 (Submitted value is cents not dollars)
**解決方案**: 在提交前轉換 `amount / 100`

**Solution**: Convert before submit `amount / 100`

### 問題：編輯時值過大 (Value too large when editing)
**解決方案**: 初始化時乘以 100: `Math.round(value * 100)`

**Solution**: Multiply by 100 on init: `Math.round(value * 100)`

### 問題：浮點數精度問題 (Floating point precision issues)
**解決方案**: 始終使用 `Math.round()` 和整數運算

**Solution**: Always use `Math.round()` and integer arithmetic

---

**維護者 (Maintainer)**: GitHub Copilot  
**最後更新 (Last Updated)**: 2025-11-20
