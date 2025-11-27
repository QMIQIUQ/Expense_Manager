# Hamburger Menu Implementation Guide

## Overview

This document describes the standard implementation pattern for hamburger menus (three-dot menus) used throughout the Expense Manager application. All hamburger menus should follow this pattern to ensure visual consistency.

## Standard Implementation

### 1. Required Elements

A hamburger menu consists of three parts:

1. **Menu Container** - A wrapper with `position: relative` to contain the dropdown
2. **Trigger Button** - The three-dot button that opens the menu
3. **Dropdown Menu** - The menu that appears when clicked

### 2. JSX Structure

```tsx
import { useState, useRef, useEffect } from 'react';

// State for tracking which menu is open
const [openMenuId, setOpenMenuId] = useState<string | null>(null);
const menuRef = useRef<HTMLDivElement>(null);

// Close menu when clicking outside
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setOpenMenuId(null);
    }
  };
  
  if (openMenuId) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [openMenuId]);

// Toggle menu function
const toggleMenu = (id: string, e: React.MouseEvent) => {
  e.stopPropagation();
  setOpenMenuId(openMenuId === id ? null : id);
};

// In the render:
<div style={{ position: 'relative' }} ref={openMenuId === item.id ? menuRef : null}>
  <button
    className="menu-trigger-button"
    onClick={(e) => toggleMenu(item.id, e)}
    aria-label="More options"
  >
    ⋮
  </button>
  {openMenuId === item.id && (
    <div style={styles.menu}>
      <button
        className="menu-item-hover"
        style={styles.menuItem}
        onClick={() => {
          setOpenMenuId(null);
          handleEdit(item);
        }}
      >
        <EditIcon size={16} />
        {t('edit')}
      </button>
      <button
        className="menu-item-hover"
        style={{ ...styles.menuItem, color: 'var(--error-text)' }}
        onClick={() => {
          setOpenMenuId(null);
          handleDelete(item.id);
        }}
      >
        <DeleteIcon size={16} />
        {t('delete')}
      </button>
    </div>
  )}
</div>
```

### 3. CSS Styles (Inline Styles Object)

```tsx
const styles = {
  menuContainer: {
    position: 'relative' as const,
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',           // Dropdown appears BELOW the button
    marginTop: '4px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 9999,          // High z-index to ensure visibility
    minWidth: '160px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
    color: 'inherit',
  },
};
```

### 4. CSS Classes (in index.css)

```css
/* Unified Hamburger Menu Button */
.menu-trigger-button {
  padding: 8px 12px;
  background-color: var(--accent-light);
  color: var(--accent-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  font-weight: bold;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-trigger-button:hover {
  filter: brightness(0.95);
}

.dark .menu-trigger-button:hover {
  filter: brightness(1.1);
}

/* Menu item hover effect */
.menu-item-hover:hover {
  background: var(--hover-bg);
}

.dark .menu-item-hover:hover {
  background: linear-gradient(90deg, rgba(124, 58, 237, 0.1), rgba(167, 139, 250, 0.15));
}
```

## Key Points

### ✅ DO

1. **Use `⋮` character** for the trigger button (Unicode: U+22EE)
2. **Use `top: 100%`** to position dropdown BELOW the button
3. **Use `zIndex: 9999`** to ensure menu appears above other content
4. **Use solid background colors** (not transparent/semi-transparent)
5. **Close menu on outside click** using `useEffect` with `mousedown` listener
6. **Stop event propagation** when toggling menu: `e.stopPropagation()`
7. **Clear menu state** before performing action: `setOpenMenuId(null)`
8. **Use `menu-trigger-button` class** for consistent button styling
9. **Use `menu-item-hover` class** for menu items

### ❌ DON'T

1. **Don't use `bottom: 100%`** - This makes menu appear ABOVE, which may overlap content
2. **Don't use transparent backgrounds** - Content will show through
3. **Don't use low z-index values** - Menu may be hidden behind other elements
4. **Don't forget click-outside handler** - Menu will stay open indefinitely
5. **Don't use SVG icons for trigger** - Use `⋮` text character instead

## Dark Mode Considerations

For dark mode, ensure:

1. **Use CSS variables**: Use `var(--card-bg)` instead of hardcoded colors
2. **Border color**: Use `var(--border-color)` for visibility
3. **Enhanced shadow**: Use `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6)`
4. **Hover effect**: Use gradient for dark mode hover states

## Dropdown Menu Specifications

All dropdown menus should follow these exact specifications (based on ExpenseList.tsx):

### Menu Container Styles

| Property | Value |
|----------|-------|
| position | `absolute` |
| top | `100%` (appears below trigger) |
| right | `0` |
| margin-top | `4px` |
| min-width | `160px` |
| background-color | `var(--card-bg)` |
| border | `1px solid var(--border-color)` |
| border-radius | `8px` |
| box-shadow | `0 4px 6px rgba(0,0,0,0.1)` |
| z-index | `9999` |

### Menu Item Styles

| Property | Value |
|----------|-------|
| display | `flex` |
| align-items | `center` |
| gap | `8px` |
| width | `100%` |
| padding | `12px 16px` |
| border | `none` |
| background-color | `transparent` |
| color | `var(--text-primary)` |
| font-size | `14px` |
| cursor | `pointer` |
| text-align | `left` |

### Hover States

```css
/* Light mode */
.menu-item-hover:hover {
  background: var(--hover-bg);
}

/* Dark mode */
.dark .menu-item-hover:hover {
  background: linear-gradient(90deg, rgba(124, 58, 237, 0.1), rgba(167, 139, 250, 0.15));
}
```

### Danger Item Styles

For delete actions, use:

```css
.menu-item.danger {
  color: var(--error-text);
}

.menu-item.danger:hover {
  background: var(--error-bg);
}
```

### CSS Class Implementation (for CSS-based dropdowns)

```css
.quick-expense-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 9999;
}

.dark .quick-expense-dropdown {
  background-color: var(--card-bg);
  border-color: var(--border-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.quick-expense-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background-color: transparent;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}

.quick-expense-dropdown-item:hover {
  background: var(--hover-bg);
}

.dark .quick-expense-dropdown-item:hover {
  background: linear-gradient(90deg, rgba(124, 58, 237, 0.1), rgba(167, 139, 250, 0.15));
}

.quick-expense-dropdown-item.danger {
  color: var(--error-text);
}

.quick-expense-dropdown-item.danger:hover {
  background: var(--error-bg);
}
```

## Existing Implementations

Reference these files for working examples:

| Component | File Path |
|-----------|-----------|
| ExpenseList | `web/src/components/expenses/ExpenseList.tsx` |
| BudgetManager | `web/src/components/budgets/BudgetManager.tsx` |
| CategoryManager | `web/src/components/categories/CategoryManager.tsx` |
| CardManager | `web/src/components/cards/CardManager.tsx` |
| EWalletManager | `web/src/components/ewallet/EWalletManager.tsx` |
| BankManager | `web/src/components/banks/BankManager.tsx` |
| IncomeList | `web/src/components/income/IncomeList.tsx` |
| RecurringExpenseManager | `web/src/components/recurring/RecurringExpenseManager.tsx` |
| QuickAddWidget | `web/src/components/dashboard/widgets/QuickAddWidget.tsx` |

## Troubleshooting

### Menu appears behind other elements
- Increase `z-index` to `9999`
- Check parent elements don't have `overflow: hidden`

### Content visible through menu background
- Use solid colors with `!important` if needed
- Check for global CSS rules affecting `[class*="dropdown"]` or `[class*="menu"]`

### Menu appears in wrong position
- Ensure parent has `position: relative`
- Use `top: 100%` for dropdown to appear below trigger
- Check for conflicting `transform` properties

### Menu doesn't close on outside click
- Verify `useEffect` cleanup function is working
- Check `mousedown` event listener is properly attached
- Ensure `menuRef` is correctly assigned
