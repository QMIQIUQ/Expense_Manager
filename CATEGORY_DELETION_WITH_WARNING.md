# Category Deletion with Expense Usage Warning

## Feature Request
分類頁面有的新增爲什麽沒得刪除？幫我加上刪除的功能。
可是在刪除的時候需要提示目前有什麽支出有用到這個刪除的categories。如果有就跳提示。

Translation: Why can't some categories be deleted? Please add deletion functionality. But when deleting, I need a warning showing which expenses are using this category.

## Implementation

### Overview
Enhanced the category deletion feature to check for expense usage before deletion and display a detailed warning message to users.

### Key Features

1. **Automatic Usage Detection**
   - System automatically checks all expenses when user attempts to delete a category
   - Filters expenses by category name

2. **Detailed Warning Message**
   - Shows exact number of expenses using the category
   - Lists up to 5 expenses with full details:
     - Description
     - Amount (formatted with currency)
     - Date
   - If more than 5 expenses exist, shows "...and X more"
   
3. **User Control**
   - Users can still proceed with deletion after seeing the warning
   - Clear explanation of what will happen (expenses keep category name, but category won't appear in list)

### Example Warning

When trying to delete a "Food" category with 8 expenses:

```
⚠️ Warning: This category is being used by 8 expense(s):

• Lunch at restaurant ($25.50 - 2025-01-10)
• Dinner with friends ($45.00 - 2025-01-09)
• Coffee break ($5.75 - 2025-01-08)
• Grocery shopping ($125.50 - 2025-01-07)
• Fast food ($12.30 - 2025-01-06)
...and 3 more

Are you sure you want to delete this category? The expenses will keep 
their category name, but it will no longer appear in the category list.
```

### Technical Implementation

#### 1. CategoryManager Component (`CategoryManager.tsx`)

**Added:**
- `expenses` prop to receive all expenses
- `getExpensesUsingCategory()` function to filter expenses by category
- Enhanced delete confirmation state to include expense list
- `handleDeleteClick()` function to prepare warning data

```typescript
interface CategoryManagerProps {
  categories: Category[];
  expenses: Expense[];  // NEW
  onAdd: (category: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

// Get expenses that use a specific category
const getExpensesUsingCategory = (categoryName: string): Expense[] => {
  return expenses.filter(expense => expense.category === categoryName);
};

// Handle delete button click
const handleDeleteClick = (category: Category) => {
  const expensesUsingCategory = getExpensesUsingCategory(category.name);
  setDeleteConfirm({
    isOpen: true,
    categoryId: category.id!,
    categoryName: category.name,
    expensesUsingCategory,
  });
};
```

#### 2. ConfirmModal Component (`ConfirmModal.tsx`)

**Enhanced:**
- Added `whiteSpace: 'pre-wrap'` to support multi-line messages
- Increased modal width from 400px to 500px
- Added scrolling for long messages (maxHeight: 400px for message, 90vh for modal)

```typescript
message: {
  margin: '0 0 20px 0',
  fontSize: '14px',
  color: '#666',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap' as const,  // NEW: Support line breaks
  maxHeight: '400px',                // NEW: Scroll if needed
  overflowY: 'auto' as const,
},
modal: {
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '24px',
  maxWidth: '500px',               // CHANGED: From 400px
  width: '90%',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
  maxHeight: '90vh',               // NEW: Scroll if needed
  overflowY: 'auto' as const,
},
```

#### 3. Dashboard Component (`Dashboard.tsx`)

**Updated:**
- Passed `expenses` prop to CategoryManager

```typescript
<CategoryManager
  categories={categories}
  expenses={expenses}  // NEW
  onAdd={handleAddCategory}
  onUpdate={handleUpdateCategory}
  onDelete={handleDeleteCategory}
/>
```

#### 4. CategoriesTab Component (`CategoriesTab.tsx`)

**Updated:**
- Added `expenses` to interface and props
- Passed through to CategoryManager

```typescript
interface Props {
  categories: Category[];
  expenses: Expense[];  // NEW
  onAdd: (data: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
}
```

### User Flow

```
┌─────────────────────────────────────┐
│ User clicks "Delete" on category    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ System filters expenses by category │
│ const expensesUsing =                │
│   expenses.filter(e =>               │
│     e.category === categoryName)     │
└────────────┬────────────────────────┘
             │
             ▼
        ┌────┴────┐
        │ Count?  │
        └────┬────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌───────┐      ┌──────────────┐
│ Zero  │      │ 1 or more    │
└───┬───┘      └──────┬───────┘
    │                 │
    ▼                 ▼
┌───────────┐  ┌──────────────────────┐
│ Standard  │  │ Warning dialog with:  │
│ confirm   │  │ • Count               │
│ dialog    │  │ • Up to 5 expenses    │
└───────────┘  │ • Details each        │
               │ • "...and X more"     │
               │ • Impact explanation  │
               └──────┬───────────────┘
                      │
              ┌───────┴────────┐
              │                │
              ▼                ▼
         ┌────────┐      ┌─────────┐
         │ Cancel │      │ Confirm │
         └────┬───┘      └────┬────┘
              │               │
              ▼               ▼
       ┌──────────┐    ┌──────────────┐
       │ Keep     │    │ Delete       │
       │ category │    │ category     │
       └──────────┘    └──────────────┘
```

### Benefits

1. **Data Protection**: Prevents accidental deletion without awareness of impact
2. **Transparency**: Users see exactly what expenses will be affected
3. **Informed Decision**: Full context before making changes
4. **User Control**: Can still proceed if deletion is intended
5. **Better UX**: Clear, detailed warning messages with formatted data

### Testing Scenarios

#### Test 1: Delete category with no expenses
1. Create a new category
2. Don't add any expenses with this category
3. Click Delete
4. Should see standard confirmation dialog
5. Confirm deletion
6. Category should be deleted successfully

#### Test 2: Delete category with 3 expenses
1. Create/use a category
2. Add 3 expenses with this category
3. Click Delete on the category
4. Should see warning with all 3 expenses listed
5. Each expense should show description, amount, and date
6. Confirm deletion
7. Category deleted, expenses keep the category name

#### Test 3: Delete category with 10 expenses
1. Create/use a category
2. Add 10 expenses with this category
3. Click Delete on the category
4. Should see warning with first 5 expenses listed
5. Should see "...and 5 more" message
6. Total count should show "10 expense(s)"
7. Confirm deletion
8. Category deleted, expenses keep the category name

#### Test 4: Cancel deletion
1. Try to delete any category with expenses
2. See warning dialog
3. Click Cancel
4. Category should remain
5. Dialog should close

### Future Enhancements (Optional)

1. **Reassignment Option**: Add button to reassign expenses to different category before deletion
2. **Export Affected List**: Allow downloading CSV of affected expenses
3. **Show Total Amount**: Display total $ amount of affected expenses
4. **Quick Filter**: Add link to view/filter only affected expenses
5. **Batch Operations**: Support for reassigning multiple categories at once

### Notes

- Default categories (system-provided) still cannot be deleted (protected by `!category.isDefault` check)
- Expenses retain their category name even after category deletion
- The deleted category simply won't appear in the category selection list anymore
- This behavior is consistent with the existing architecture where expenses store category as a string (name) rather than a reference

### Commit Reference

Commit: `5cfaee8` - "Add expense usage warning when deleting categories"

### Related Issues

- Original issue #6: Category deletion explanation
- New feature request: Show expenses using category before deletion

---

**Status**: ✅ Completed
**Date**: 2025-11-10
**Version**: 1.1
