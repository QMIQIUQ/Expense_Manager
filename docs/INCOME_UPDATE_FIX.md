# Income Update Error Fix

## Issue Summary
修復收入更新時的錯誤 (Fix for income update error)

當用戶編輯收入記錄時，如果清空了某些可選字段（如付款人姓名 payerName），系統會拋出 Firestore 錯誤。
(When users edit income records and clear optional fields like payerName, the system throws a Firestore error.)

### Error Message
```
Failed to update: Function updateDoc() called with invalid data. 
Unsupported field value: undefined (found in field payerName in document incomes/YLIzvSA5Eegd1vWZTNUV)
```

## Root Cause Analysis

### Original Problem
在 `IncomeList.tsx` 的內聯編輯功能中，當可選字段被清空時會被設置為 `undefined`：
```typescript
// 原始代碼
updates.payerName = draft.payerName || undefined;
```

但是 Firestore 的 `updateDoc()` 函數**不接受 undefined 值**，這會導致錯誤。
(Firestore's `updateDoc()` function does not accept undefined values, causing errors.)

### Why This Happens
Firestore 的文檔更新有三種方式處理字段：
(Firestore has three ways to handle fields in document updates:)

1. **更新字段** (Update field): 提供一個有效值 (Provide a valid value)
2. **刪除字段** (Delete field): 使用 `deleteField()` 函數 (Use `deleteField()` function)
3. **保持不變** (Keep unchanged): 不包含在更新對象中 (Don't include in update object)

原始代碼嘗試使用 `undefined` 來表示刪除字段，但這是不允許的。
(The original code tried to use `undefined` to delete fields, but this is not allowed.)

## Solution Implemented

### 1. Service Layer Fix (`incomeService.ts`)
在服務層添加了處理邏輯，將 `undefined` 值轉換為 Firestore 的 `deleteField()` 調用：
(Added logic at service layer to convert `undefined` values to Firestore's `deleteField()` calls:)

```typescript
import { deleteField } from 'firebase/firestore';

async update(id: string, updates: Partial<Income>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  // Handle undefined values: use deleteField() to remove them from Firestore
  const cleanedUpdates: Record<string, unknown> = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) {
      cleanedUpdates[key] = deleteField();  // ✅ 正確刪除字段
    } else {
      cleanedUpdates[key] = value;
    }
  });
  
  await updateDoc(docRef, {
    ...cleanedUpdates,
    updatedAt: Timestamp.now(),
  });
}
```

### 2. UI Layer Improvement (`IncomeList.tsx`)
改進了內聯編輯邏輯，使用更明確的三元表達式：
(Improved inline edit logic with clearer ternary expressions:)

```typescript
const saveInlineEdit = (income: Income) => {
  const updates: Partial<Income> = {};
  
  // 檢查 payerName 是否改變
  if ((income.payerName || '') !== (draft.payerName || '')) {
    // 如果有值且不為空字符串，則更新；否則設為 undefined（將被服務層轉換為 deleteField）
    updates.payerName = draft.payerName && draft.payerName.trim() !== '' 
      ? draft.payerName 
      : undefined;
  }
  // ... 其他字段類似處理
}
```

## How It Works Now

### 場景 1: 清空可選字段 (Clearing Optional Fields)
```
用戶操作: 將 payerName 從 "還款" 改為空白
User action: Change payerName from "還款" to empty

1. IncomeList 檢測到變化，設置 updates.payerName = undefined
2. incomeService 將 undefined 轉換為 deleteField()
3. Firestore 正確刪除該字段
4. ✅ 更新成功！
```

### 場景 2: 添加或更新可選字段 (Adding/Updating Optional Fields)
```
用戶操作: 將 payerName 從空白改為 "薪資"
User action: Change payerName from empty to "薪資"

1. IncomeList 檢測到變化，設置 updates.payerName = "薪資"
2. incomeService 保持該值不變
3. Firestore 正確更新該字段
4. ✅ 更新成功！
```

### 場景 3: 不更改字段 (No Changes to Fields)
```
用戶操作: 編輯但不改變 payerName
User action: Edit but don't change payerName

1. IncomeList 檢測到無變化，不添加到 updates 對象
2. Firestore 不觸碰該字段
3. ✅ 無不必要的更新！
```

## Comparison with IncomeForm

新增收入時，`IncomeForm.tsx` 已經正確處理了可選字段：
(When creating new income, `IncomeForm.tsx` already handles optional fields correctly:)

```typescript
// IncomeForm.tsx - 新增時刪除空字段
if (!submitData.payerName || submitData.payerName.trim() === '') {
  delete submitData.payerName;  // 完全移除字段
}
```

現在更新邏輯與新增邏輯保持一致！
(Now the update logic is consistent with the create logic!)

## Testing

### Build & Lint
- ✅ TypeScript 編譯成功 (TypeScript compilation passes)
- ✅ ESLint 檢查通過 (ESLint checks pass)
- ✅ 無類型錯誤 (No type errors)

### Security
- ✅ CodeQL 掃描無漏洞 (CodeQL scan found no vulnerabilities)
- ✅ 無注入風險 (No injection risks)
- ✅ 正確的數據驗證 (Proper data validation)

## Benefits of This Fix

1. **用戶體驗改善** (Improved UX)
   - 用戶可以自由清空可選字段
   - 不再出現令人困惑的錯誤消息

2. **數據一致性** (Data Consistency)
   - 新增和更新邏輯保持一致
   - 正確處理 Firestore 字段刪除

3. **代碼質量** (Code Quality)
   - 更清晰的意圖表達
   - 類型安全（使用 `unknown` 而非 `any`）
   - 符合 Firestore 最佳實踐

4. **可維護性** (Maintainability)
   - 集中處理 undefined 值的邏輯
   - 易於理解和調試

## Future Considerations

### Potential Improvement for ExpenseList
注意：`ExpenseList.tsx` 中也有類似的模式：
(Note: `ExpenseList.tsx` has a similar pattern:)

```typescript
// ExpenseList.tsx - 也設置 undefined
updates.notes = draft.notes || undefined;
```

如果在編輯費用時遇到類似問題，可以應用相同的解決方案。
(If similar issues occur when editing expenses, the same solution can be applied.)

建議：考慮將這個模式提取為一個通用的服務層工具函數。
(Suggestion: Consider extracting this pattern into a common service layer utility function.)

## References

- [Firestore deleteField() Documentation](https://firebase.google.com/docs/firestore/manage-data/delete-data#fields)
- [TypeScript Record Type](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)
- Issue: 更新收入的時候報錯 (Error when updating income)
