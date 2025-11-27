// Dashboard Widget Types and Configuration

// Available widget types for the dashboard
export type DashboardWidgetType = 
  | 'summary-cards'      // Quick stats: today, monthly, income
  | 'expense-chart'      // Pie chart by category
  | 'spending-trend'     // Line chart - 7 day spending trend
  | 'category-breakdown' // Category list with amounts
  | 'recent-expenses'    // Recent expense list
  | 'cards-summary'      // Credit cards summary
  | 'budget-progress'    // Budget progress bars
  | 'tracked-expenses'   // Expenses needing repayment tracking
  | 'quick-add';         // Quick add expense button

// Widget size options
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

// Single widget configuration
export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  enabled: boolean;
  order: number;
  size: WidgetSize;
  title?: string; // Custom title override
}

// User's dashboard layout settings
export interface DashboardLayout {
  id?: string;
  userId: string;
  widgets: DashboardWidget[];
  columns: 1 | 2; // 1 or 2 column layout
  createdAt: Date;
  updatedAt: Date;
}

// Widget metadata for display in customizer
export interface WidgetMetadata {
  type: DashboardWidgetType;
  defaultTitle: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  minSize: WidgetSize;
  maxSize: WidgetSize;
}

// All available widgets with their metadata
// Note: defaultTitle and defaultTitleFallback are used for display
// defaultTitle is the translation key, defaultTitleFallback is the English text
export const WIDGET_METADATA: Record<DashboardWidgetType, WidgetMetadata & { defaultTitleFallback: string }> = {
  'summary-cards': {
    type: 'summary-cards',
    defaultTitle: 'summaryCards',
    defaultTitleFallback: 'Quick Stats',
    description: 'Today, monthly expenses, and income overview',
    icon: '📊',
    defaultSize: 'full',
    minSize: 'medium',
    maxSize: 'full',
  },
  'expense-chart': {
    type: 'expense-chart',
    defaultTitle: 'expenseChart',
    defaultTitleFallback: 'Expense Distribution',
    description: 'Pie chart showing spending by category',
    icon: '🥧',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'spending-trend': {
    type: 'spending-trend',
    defaultTitle: 'spendingTrend',
    defaultTitleFallback: 'Spending Trend',
    description: 'Line chart of last 7 days spending',
    icon: '📈',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'full',
  },
  'category-breakdown': {
    type: 'category-breakdown',
    defaultTitle: 'topCategories',
    defaultTitleFallback: 'Top Categories',
    description: 'Top spending categories with amounts',
    icon: '📋',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'recent-expenses': {
    type: 'recent-expenses',
    defaultTitle: 'recentExpenses',
    defaultTitleFallback: 'Recent Expenses',
    description: 'Latest expense transactions',
    icon: '💳',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'full',
  },
  'cards-summary': {
    type: 'cards-summary',
    defaultTitle: 'cardsSummary',
    defaultTitleFallback: 'Credit Cards',
    description: 'Credit card usage and cashback summary',
    icon: '💳',
    defaultSize: 'full',
    minSize: 'medium',
    maxSize: 'full',
  },
  'budget-progress': {
    type: 'budget-progress',
    defaultTitle: 'budgetProgress',
    defaultTitleFallback: 'Budget Progress',
    description: 'Progress bars for active budgets',
    icon: '🎯',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'tracked-expenses': {
    type: 'tracked-expenses',
    defaultTitle: 'trackedExpenses',
    defaultTitleFallback: 'Tracked Expenses',
    description: 'Expenses waiting for repayment',
    icon: '🔄',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'quick-add': {
    type: 'quick-add',
    defaultTitle: 'quickExpenses',
    defaultTitleFallback: 'Quick Expenses',
    description: 'Quick add expense button',
    icon: '➕',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'medium',
  },
};

// Default dashboard layout
export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidget[] = [
  { id: 'widget-1', type: 'summary-cards', enabled: true, order: 0, size: 'full' },
  { id: 'widget-2', type: 'expense-chart', enabled: true, order: 1, size: 'medium' },
  { id: 'widget-3', type: 'spending-trend', enabled: true, order: 2, size: 'medium' },
  { id: 'widget-4', type: 'category-breakdown', enabled: true, order: 3, size: 'medium' },
  { id: 'widget-5', type: 'recent-expenses', enabled: true, order: 4, size: 'medium' },
  { id: 'widget-6', type: 'budget-progress', enabled: false, order: 5, size: 'medium' },
  { id: 'widget-7', type: 'cards-summary', enabled: false, order: 6, size: 'full' },
  { id: 'widget-8', type: 'tracked-expenses', enabled: false, order: 7, size: 'medium' },
];

// Helper to generate unique widget ID
export const generateWidgetId = (): string => {
  return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
