# Dashboard Customization Feature (儀表板自定義功能)

## Overview

This document describes the customizable dashboard feature that allows users to personalize their dashboard by showing/hiding widgets and reordering them.

## Feature Summary

- **Widget-based dashboard**: Dashboard is composed of 8 customizable widget components
- **Show/Hide widgets**: Users can toggle widget visibility
- **Reorder widgets**: Drag-and-drop or arrow buttons to reorder
- **Persistent settings**: Layout saved to Firebase per user
- **Default layout**: Reset to default configuration anytime

---

## Available Widgets

| Widget Type | Icon | Default Title | Description |
|-------------|------|---------------|-------------|
| `summary-cards` | 📊 | 摘要卡片 | Today, monthly expenses, and income overview |
| `expense-chart` | 🥧 | 支出圖表 | Pie chart showing spending by category |
| `spending-trend` | 📈 | 支出趨勢 | Line chart of last 7 days spending |
| `category-breakdown` | 📋 | 熱門類別 | Top spending categories with amounts |
| `recent-expenses` | 🧾 | 最近支出 | Latest expense transactions |
| `budget-progress` | 🎯 | 預算進度 | Progress bars for active budgets |
| `cards-summary` | 💳 | 信用卡摘要 | Credit card usage and cashback summary |
| `tracked-expenses` | 👁️ | 追蹤中的支出 | Expenses waiting for repayment |
| `quick-add` | ➕ | 新增支出 | Quick add expense button |

---

## User Interface

### Accessing Customization

1. Navigate to the **Dashboard** (儀表板) tab
2. Click the **⚙️ Settings** gear icon in the header
3. The customization modal will open

### Customization Modal

```
┌─────────────────────────────────────────────┐
│  自訂儀表板                             [×] │
├─────────────────────────────────────────────┤
│  拖曳可重新排列                             │
│                                             │
│  ⋮⋮ 📊 摘要卡片              [↑] [↓] [顯示] │
│     Today, monthly expenses...              │
│                                             │
│  ⋮⋮ 🥧 支出圖表              [↑] [↓] [顯示] │
│     Pie chart showing...                    │
│                                             │
│  ⋮⋮ 📈 支出趨勢              [↑] [↓] [隱藏] │
│     Line chart of...                        │
│                                             │
│  ... more widgets ...                       │
│                                             │
├─────────────────────────────────────────────┤
│  [重設為預設]           [取消]      [儲存]  │
└─────────────────────────────────────────────┘
```

### Widget Controls

| Control | Description |
|---------|-------------|
| ⋮⋮ (Drag Handle) | Drag to reorder widgets |
| ↑ (Move Up) | Move widget up in the list |
| ↓ (Move Down) | Move widget down in the list |
| **顯示** (Purple) | Widget is currently visible, click to hide |
| **隱藏** (Gray) | Widget is currently hidden, click to show |

### Button Styles

- **顯示 (Visible)**: Purple gradient background with purple border
- **隱藏 (Hidden)**: Gray background with dashed gray border

---

## Data Model

### DashboardWidget

```typescript
interface DashboardWidget {
  id: string;           // Unique identifier
  type: DashboardWidgetType;
  enabled: boolean;     // Show/hide state
  order: number;        // Position in list
  size: 'small' | 'medium' | 'large' | 'full';
}
```

### DashboardLayout

```typescript
interface DashboardLayout {
  userId: string;
  widgets: DashboardWidget[];
  updatedAt: Date;
}
```

---

## Firebase Integration

### Firestore Collection

- **Collection**: `dashboardLayouts`
- **Document ID**: User's UID
- **Security Rules**: Users can only read/write their own layout

### Security Rules

```javascript
match /dashboardLayouts/{userId} {
  allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
  allow create: if isAuthenticated() && isOwner(userId);
  allow update: if isAuthenticated() && (isOwner(userId) || isAdmin());
  allow delete: if isAuthenticated() && (isOwner(userId) || isAdmin());
}
```

---

## Default Layout

When a user has no saved layout, the following default is used:

1. 📊 摘要卡片 (Summary Cards) - Enabled
2. 🥧 支出圖表 (Expense Chart) - Enabled
3. 📈 支出趨勢 (Spending Trend) - Enabled
4. 📋 熱門類別 (Category Breakdown) - Enabled
5. 🧾 最近支出 (Recent Expenses) - Enabled
6. 🎯 預算進度 (Budget Progress) - Enabled
7. 💳 信用卡摘要 (Cards Summary) - Enabled
8. 👁️ 追蹤中的支出 (Tracked Expenses) - Enabled
9. ➕ 新增支出 (Quick Add) - Enabled

---

## Technical Implementation

### Component Structure

```
src/components/dashboard/
├── CustomizableDashboard.tsx    # Main dashboard container
├── DashboardCustomizer.tsx      # Customization modal
└── widgets/
    ├── types.ts                 # WidgetProps interface
    ├── WidgetContainer.tsx      # Widget wrapper component
    ├── SummaryCardsWidget.tsx
    ├── ExpenseChartWidget.tsx
    ├── SpendingTrendWidget.tsx
    ├── CategoryBreakdownWidget.tsx
    ├── RecentExpensesWidget.tsx
    ├── BudgetProgressWidget.tsx
    ├── CardsSummaryWidget.tsx
    ├── TrackedExpensesWidget.tsx
    └── QuickAddWidget.tsx
```

### Service Layer

```
src/services/
└── dashboardLayoutService.ts    # Firebase CRUD operations
```

### Type Definitions

```
src/types/
└── dashboard.ts                 # Widget types and metadata
```

---

## Translations

The following translation keys are used:

| Key | Chinese (zh-TW) | English |
|-----|-----------------|---------|
| `customizeDashboard` | 自訂儀表板 | Customize Dashboard |
| `dragToReorder` | 拖曳可重新排列 | Drag to reorder |
| `moveUp` | 上移 | Move Up |
| `moveDown` | 下移 | Move Down |
| `show` | 顯示 | Show |
| `hide` | 隱藏 | Hide |
| `addWidget` | 新增組件 | Add Widget |
| `resetToDefaults` | 重設為預設 | Reset to Defaults |
| `summaryCards` | 摘要卡片 | Summary Cards |
| `expenseChart` | 支出圖表 | Expense Chart |
| `spendingTrend` | 支出趨勢 | Spending Trend |
| `categoryBreakdown` | 熱門類別 | Category Breakdown |
| `recentExpenses` | 最近支出 | Recent Expenses |
| `budgetProgress` | 預算進度 | Budget Progress |
| `cardsSummary` | 信用卡摘要 | Credit Card Summary |
| `trackedExpenses` | 追蹤中的支出 | Tracked Expenses |
| `quickAddExpense` | 新增支出 | Quick Add Expense |

---

## CSS Styles

All customization-related styles are in `src/index.css`:

- `.customizer-overlay` - Modal backdrop
- `.customizer-modal` - Modal container
- `.customizer-header` - Modal header with title and close button
- `.customizer-content` - Scrollable content area
- `.widget-list` - List of widget items
- `.widget-item` - Individual widget row
- `.widget-controls` - Button container
- `.btn-move` - Up/down arrow buttons
- `.btn-visibility` - Show/hide toggle button
- `.customizer-footer` - Footer with action buttons

---

## Usage Guide

### Show a Hidden Widget

1. Open the customization modal (⚙️)
2. Find the widget with **隱藏** (gray) button
3. Click the button - it will change to **顯示** (purple)
4. Click **儲存** to save changes

### Hide a Visible Widget

1. Open the customization modal (⚙️)
2. Find the widget with **顯示** (purple) button
3. Click the button - it will change to **隱藏** (gray)
4. Click **儲存** to save changes

### Reorder Widgets

**Method 1: Arrow Buttons**
1. Open the customization modal
2. Use ↑ or ↓ buttons to move widgets
3. Click **儲存** to save

**Method 2: Drag and Drop**
1. Open the customization modal
2. Grab the ⋮⋮ drag handle on the left
3. Drag the widget to the desired position
4. Release and click **儲存** to save

### Reset to Default

1. Open the customization modal
2. Click **重設為預設** button
3. Click **儲存** to apply the default layout

---

## Future Enhancements

- [ ] Widget size customization (small/medium/large/full)
- [ ] Custom widget titles
- [ ] Widget-specific settings
- [ ] Dashboard themes/presets
- [ ] Export/import layout configurations
- [ ] Mobile-specific layouts

---

**Feature Status**: ✅ Complete and Functional  
**Last Updated**: November 2025
