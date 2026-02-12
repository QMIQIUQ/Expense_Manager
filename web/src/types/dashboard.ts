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
  | 'pending-payments'   // Scheduled payments due this month
  | 'quick-add'          // Quick add expense button
  | 'savings-goal'       // Savings goal progress
  | 'month-over-month'   // Month-over-month comparison
  | 'tag-cloud'          // Tag cloud of frequent expenses
  | 'upcoming-bills'     // Bills due in next 7 days
  | 'installment-tracker'; // Installment payment tracker

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
    description: 'summaryCardsDesc',
    icon: '📊',
    defaultSize: 'full',
    minSize: 'medium',
    maxSize: 'full',
  },
  'expense-chart': {
    type: 'expense-chart',
    defaultTitle: 'expenseChart',
    defaultTitleFallback: 'Expense Distribution',
    description: 'expenseChartDesc',
    icon: '🥧',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'spending-trend': {
    type: 'spending-trend',
    defaultTitle: 'spendingTrend',
    defaultTitleFallback: 'Spending Trend',
    description: 'spendingTrendDesc',
    icon: '📈',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'full',
  },
  'category-breakdown': {
    type: 'category-breakdown',
    defaultTitle: 'topCategories',
    defaultTitleFallback: 'Top Categories',
    description: 'categoryBreakdownDesc',
    icon: '📋',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'recent-expenses': {
    type: 'recent-expenses',
    defaultTitle: 'recentExpenses',
    defaultTitleFallback: 'Recent Expenses',
    description: 'recentExpensesDesc',
    icon: '💳',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'full',
  },
  'cards-summary': {
    type: 'cards-summary',
    defaultTitle: 'cardsSummary',
    defaultTitleFallback: 'Credit Cards',
    description: 'cardsSummaryDesc',
    icon: '💳',
    defaultSize: 'full',
    minSize: 'medium',
    maxSize: 'full',
  },
  'budget-progress': {
    type: 'budget-progress',
    defaultTitle: 'budgetProgress',
    defaultTitleFallback: 'Budget Progress',
    description: 'budgetProgressDesc',
    icon: '🎯',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'tracked-expenses': {
    type: 'tracked-expenses',
    defaultTitle: 'trackedExpenses',
    defaultTitleFallback: 'Tracked Expenses',
    description: 'trackedExpensesDesc',
    icon: '🔄',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'pending-payments': {
    type: 'pending-payments',
    defaultTitle: 'pendingPayments',
    defaultTitleFallback: 'Pending Payments',
    description: 'pendingPaymentsDesc',
    icon: '📅',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'quick-add': {
    type: 'quick-add',
    defaultTitle: 'quickExpenses',
    defaultTitleFallback: 'Quick Expenses',
    description: 'quickAddDesc',
    icon: '➕',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'medium',
  },
  'savings-goal': {
    type: 'savings-goal',
    defaultTitle: 'savingsGoal',
    defaultTitleFallback: 'Savings Goal',
    description: 'savingsGoalDesc',
    icon: '💰',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'medium',
  },
  'month-over-month': {
    type: 'month-over-month',
    defaultTitle: 'monthOverMonth',
    defaultTitleFallback: 'Month Comparison',
    description: 'monthOverMonthDesc',
    icon: '📊',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'tag-cloud': {
    type: 'tag-cloud',
    defaultTitle: 'tagCloud',
    defaultTitleFallback: 'Spending Tags',
    description: 'tagCloudDesc',
    icon: '🏷️',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'upcoming-bills': {
    type: 'upcoming-bills',
    defaultTitle: 'upcomingBills',
    defaultTitleFallback: 'Upcoming Bills',
    description: 'upcomingBillsDesc',
    icon: '📆',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
  },
  'installment-tracker': {
    type: 'installment-tracker',
    defaultTitle: 'installmentTracker',
    defaultTitleFallback: 'Installment Tracker',
    description: 'installmentTrackerDesc',
    icon: '💳',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
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
  { id: 'widget-9', type: 'pending-payments', enabled: false, order: 8, size: 'medium' },
];

// Helper to generate unique widget ID
export const generateWidgetId = (): string => {
  return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
