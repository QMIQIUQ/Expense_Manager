# 類別刪除功能說明 / Category Deletion Feature Guide

## Issue #6: 為什麼別類沒得刪除？/ Why can't categories be deleted?

### 快速答案 / Quick Answer

**類別刪除功能已經存在！** 但是有保護機制。

**Category deletion feature already exists!** But with protection mechanisms.

---

## 刪除規則 / Deletion Rules

### ✅ 可以刪除 / Can Delete

**自定義類別 (Custom Categories)**
- 用戶自己創建的類別
- Categories created by users themselves
- ❌ 無 "Default" 標籤
- ❌ No "Default" badge

**如何識別 / How to Identify:**
```
📦 我的類別     [編輯] [刪除]
🛍️ 購物         [編輯] [刪除]
🎬 娛樂         [編輯] [刪除]
```

### ❌ 不能刪除 / Cannot Delete

**默認類別 (Default Categories)**
- 系統預設的類別
- System default categories
- ✅ 有 "Default" 標籤
- ✅ Has "Default" badge

**如何識別 / How to Identify:**
```
🍔 Food      [Default]  [編輯]
🚗 Transport [Default]  [編輯]
🏠 Housing   [Default]  [編輯]
```

---

## 為什麼保護默認類別？/ Why Protect Default Categories?

### 1. 數據完整性 / Data Integrity
- 🔒 防止刪除正在使用的類別
- 🔒 Prevent deletion of categories in use
- 📊 已經有支出記錄使用這些類別
- 📊 Existing expense records use these categories

### 2. 新用戶體驗 / New User Experience
- 👤 新用戶需要基礎類別開始使用
- 👤 New users need basic categories to start
- 🚀 提供常用的類別選項
- 🚀 Provide common category options

### 3. 防止意外刪除 / Prevent Accidental Deletion
- ⚠️ 避免用戶誤刪重要類別
- ⚠️ Avoid users accidentally deleting important categories
- 🔄 如果刪除，無法自動恢復
- 🔄 If deleted, cannot auto-restore

---

## 如何刪除自定義類別 / How to Delete Custom Categories

### 步驟 / Steps

1. **進入類別管理頁面**
   Go to Categories Management page
   ```
   Dashboard → Categories Tab
   ```

2. **找到想刪除的類別**
   Find the category to delete
   - 使用搜索功能快速定位
   - Use search function to quickly locate

3. **檢查是否為自定義類別**
   Check if it's a custom category
   - ❌ 沒有 "Default" 標籤 = 可以刪除
   - ❌ No "Default" badge = Can delete

4. **點擊刪除按鈕**
   Click delete button
   ```
   [編輯] [刪除] ← 點這裡
   [Edit] [Delete] ← Click here
   ```

5. **確認刪除**
   Confirm deletion
   - 彈出確認對話框
   - Confirmation dialog appears
   - 點擊"刪除"確認
   - Click "Delete" to confirm

---

## 代碼實現 / Code Implementation

### 刪除按鈕邏輯 / Delete Button Logic

```typescript
// 位置: web/src/components/categories/CategoryManager.tsx
// Location: web/src/components/categories/CategoryManager.tsx

{!category.isDefault && (
  <button
    onClick={() => setDeleteConfirm({ 
      isOpen: true, 
      categoryId: category.id! 
    })}
    style={styles.deleteBtn}
  >
    {t('delete')}
  </button>
)}
```

**解釋 / Explanation:**
- `!category.isDefault` - 只有非默認類別才顯示刪除按鈕
- Only show delete button for non-default categories

---

## 常見問題 / FAQ

### Q1: 我想刪除 "Food" 類別，但沒有刪除按鈕？
I want to delete the "Food" category, but there's no delete button?

**A:** "Food" 是默認類別，系統為了保護數據不允許刪除。但你可以：
"Food" is a default category, protected to prevent data loss. But you can:

1. **編輯** 默認類別的名稱和圖標
   **Edit** the default category's name and icon
2. **創建** 新的自定義類別替代
   **Create** new custom categories as replacements

### Q2: 所有類別都顯示 "Default"，怎麼辦？
All categories show "Default", what should I do?

**A:** 這是首次使用時的正常情況。解決方法：
This is normal for first-time use. Solution:

1. **創建新類別**
   **Create new categories**
   - 點擊 "+ 添加類別"
   - Click "+ Add Category"

2. **新類別不會有 "Default" 標籤**
   **New categories won't have "Default" badge**
   - 可以自由刪除
   - Can freely delete

### Q3: 如果刪除了有支出記錄的類別？
What if I delete a category that has expense records?

**A:** 系統會提醒你：
System will warn you:

- ⚠️ "此類別正在使用中，確定要刪除嗎？"
- ⚠️ "This category is in use, are you sure you want to delete?"
- 刪除後，相關支出記錄仍會保留類別名稱
- After deletion, related expense records will retain the category name

### Q4: 能否把默認類別改為非默認？
Can I change default categories to non-default?

**A:** 目前不支持。原因：
Currently not supported. Reason:

- 🔒 保護系統穩定性
- 🔒 Protect system stability
- 📊 防止數據混亂
- 📊 Prevent data confusion

---

## 解決方案 / Solutions

### 如果你需要更多自定義 / If You Need More Customization

#### 方案 1: 創建新類別 / Solution 1: Create New Categories
```
1. 點擊 "+ 添加類別"
2. 輸入名稱、選擇圖標和顏色
3. 保存
4. 新類別可以自由刪除
```

#### 方案 2: 編輯默認類別 / Solution 2: Edit Default Categories
```
1. 點擊默認類別的 [編輯]
2. 修改名稱、圖標、顏色
3. 保存
4. 雖不能刪除，但可以自定義外觀
```

#### 方案 3: 隱藏不用的類別 / Solution 3: Hide Unused Categories
```
未來功能：添加"隱藏"選項
Future feature: Add "Hide" option
- 不刪除但不在選擇列表中顯示
- Don't delete but don't show in selection list
```

---

## 檢查清單 / Checklist

在尋求幫助之前，請確認：
Before seeking help, please confirm:

- [ ] 檢查類別是否有 "Default" 標籤
- [ ] Check if category has "Default" badge
- [ ] 嘗試創建新的自定義類別
- [ ] Try creating new custom categories
- [ ] 確認刪除按鈕是否出現
- [ ] Confirm if delete button appears
- [ ] 檢查是否有使用搜索功能
- [ ] Check if using search function

---

## 技術細節 / Technical Details

### 默認類別列表 / Default Categories List

系統初始化時創建的類別：
Categories created during system initialization:

```typescript
// 位置: web/src/services/categoryService.ts
const defaultCategories = [
  { name: 'Food', icon: '🍔', color: '#FF6B6B' },
  { name: 'Transport', icon: '🚗', color: '#4ECDC4' },
  { name: 'Shopping', icon: '🛍️', color: '#45B7D1' },
  { name: 'Entertainment', icon: '🎬', color: '#FFA07A' },
  { name: 'Bills', icon: '📄', color: '#98D8C8' },
  { name: 'Health', icon: '🏥', color: '#F7DC6F' },
  { name: 'Education', icon: '📚', color: '#BB8FCE' },
  { name: 'Other', icon: '💰', color: '#95A5A6' },
];
```

### 刪除邏輯 / Deletion Logic

```typescript
// 檢查是否為默認類別
if (category.isDefault) {
  // 不顯示刪除按鈕
  return null;
}

// 顯示刪除按鈕
return (
  <button onClick={() => handleDelete(category.id)}>
    Delete
  </button>
);
```

---

## 總結 / Summary

**關鍵點 / Key Points:**

1. ✅ **類別刪除功能已存在**
   Category deletion feature exists

2. 🔒 **默認類別受保護**
   Default categories are protected

3. 🆕 **自定義類別可刪除**
   Custom categories can be deleted

4. 🔍 **使用搜索快速定位**
   Use search to quickly locate

5. ⚠️ **刪除前會確認**
   Confirmation before deletion

**建議 / Recommendation:**

如果需要更多類別管理功能，請創建新的自定義類別而不是嘗試刪除默認類別。

If you need more category management features, create new custom categories instead of trying to delete default categories.

---

## 相關資源 / Related Resources

- 類別管理代碼：`web/src/components/categories/CategoryManager.tsx`
- 類別服務：`web/src/services/categoryService.ts`
- 類別類型定義：`web/src/types/index.ts`

---

## 問題反饋 / Feedback

如果此功能仍不清楚或需要改進，請提供反饋：

If this feature is still unclear or needs improvement, please provide feedback:

1. 你期望的刪除行為是什麼？
   What deletion behavior do you expect?

2. 遇到了什麼具體問題？
   What specific problem did you encounter?

3. 有哪些改進建議？
   What improvement suggestions do you have?
