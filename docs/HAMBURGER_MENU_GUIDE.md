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

## Portal-Based Floating Menu Pattern (Recommended)

For widgets or components with complex stacking contexts (e.g., inside cards with shadows, transforms, or overflow), use a **Portal-based floating menu** to avoid z-index and positioning issues.

### Implementation Example (QuickAddWidget)

```tsx
import ReactDOM from 'react-dom';

type FloatingQuickMenuProps = { anchorId: string; children: React.ReactNode };
const FloatingQuickMenu: React.FC<FloatingQuickMenuProps> = ({ anchorId, children }) => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Place menu below and align right edge with anchor's right edge
    const top = rect.bottom + 4;
    const right = window.innerWidth - rect.right;
    setPos({ top, right });
  }, [anchorId]);

  if (!pos) return null;
  return ReactDOM.createPortal(
    <div
      ref={menuContentRef}
      className="quick-expense-dropdown"
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 10000 }}
    >
      {children}
    </div>,
    document.body
  );
};

// Usage:
<div
  className="quick-expense-action-btn"
  id={`preset-${preset.id}-action`}
  onClick={(e) => toggleMenu(preset.id, e)}
>
  ⋮
</div>
{openMenuId === preset.id && (
  <FloatingQuickMenu anchorId={`preset-${preset.id}-action`}>
    <div className="quick-expense-dropdown-item" onClick={handleEdit}>
      <EditIcon size={14} />
      <span>{t('edit')}</span>
    </div>
    <div className="quick-expense-dropdown-item danger" onClick={handleDelete}>
      <DeleteIcon size={14} />
      <span>{t('delete')}</span>
    </div>
  </FloatingQuickMenu>
)}
```

### Benefits of Portal Pattern

1. **Escapes stacking context** - Menu renders directly to `document.body`, avoiding parent container limitations
2. **No overflow issues** - Parent's `overflow: hidden` won't clip the menu
3. **Consistent z-index** - Always on top regardless of parent element z-index
4. **Better positioning** - Uses `getBoundingClientRect()` for accurate viewport-relative positioning
5. **Fixed positioning** - Menu stays in place when scrolling (use `position: fixed`)

### When to Use Portal vs Standard

- **Use Portal**: Inside widgets, cards, complex layouts with transforms/shadows
- **Use Standard**: Simple flat layouts, full-page components without stacking context issues

## Key Points

### ✅ DO

1. **Use `⋮` character** for the trigger button (Unicode: U+22EE)
2. **Use `top: 100%`** to position dropdown BELOW the button (for standard pattern)
3. **Use Portal pattern** for widgets/cards to avoid stacking context issues
4. **Use `zIndex: 10000`** for portal-based menus (higher than standard 9999)
5. **Use solid background colors** (not transparent/semi-transparent)
6. **Close menu on outside click** using `useEffect` with `mousedown` listener
7. **Stop event propagation** when toggling menu: `e.stopPropagation()`
8. **Clear menu state** before performing action: `setOpenMenuId(null)`
9. **Use `menu-trigger-button` class** for consistent button styling
10. **Use `menu-item-hover` class** for menu items
11. **Assign unique `id`** to anchor element for portal positioning

### ❌ DON'T

1. **Don't use `bottom: 100%`** - This makes menu appear ABOVE, which may overlap content
2. **Don't use transparent backgrounds** - Content will show through
3. **Don't use low z-index values** - Menu may be hidden behind other elements
4. **Don't forget click-outside handler** - Menu will stay open indefinitely
5. **Don't use SVG icons for trigger** - Use `⋮` text character instead
6. **Don't rely on parent positioning in widgets** - Use portal pattern instead

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
  /* When used inside portal, position is overridden to fixed via inline style */
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 120px;
  background-color: #ffffff !important;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 10000;
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
- **Standard pattern**: Increase `z-index` to `9999`
- **Widget/Card pattern**: Use Portal-based floating menu instead
- Check parent elements don't have `overflow: hidden`
- Verify parent doesn't create new stacking context (check for `transform`, `filter`, `opacity < 1`)

### Menu gets clipped by parent container
- **Solution**: Use Portal pattern (renders to `document.body`)
- Alternatively, set parent `overflow: visible` (may affect layout)

### Content visible through menu background
- Use solid colors with `!important` if needed
- Check for global CSS rules affecting `[class*="dropdown"]` or `[class*="menu"]`

### Menu appears in wrong position
- **Standard pattern**: Ensure parent has `position: relative`, use `top: 100%`
- **Portal pattern**: Verify anchor element has unique `id`, check `getBoundingClientRect()` calculation
- Check for conflicting `transform` properties on ancestors

### Menu width is incorrect
- For portal pattern, use `right: window.innerWidth - rect.right` instead of fixed `left` offset
- Let CSS `min-width` control minimum size, content determines actual width
- Don't hardcode width assumptions in positioning logic

### Menu doesn't close on outside click
- Verify `useEffect` cleanup function is working
- Check `mousedown` event listener is properly attached
- Ensure `menuRef` is correctly assigned
- For portal menus, click-outside detection still works on trigger element
