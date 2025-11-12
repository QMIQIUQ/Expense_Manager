// Type definitions for Expense Manager

// Payment method types
export type PaymentMethodType = 'cash' | 'credit_card' | 'e_wallet';

export interface Expense {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  // Optional time in HH:mm (24h) format, for finer granularity
  time?: string;
  notes?: string;
  // New fields for income linking
  originalReceiptAmount?: number; // Original receipt/invoice amount for tracking reimbursements
  payerName?: string; // Who paid (e.g., "Me", "Friend A")
  // Credit card and payment method fields
  cardId?: string; // Optional: credit card used for this expense
  paymentMethod?: PaymentMethodType; // Type of payment method
  paymentMethodName?: string; // For e-wallets, store the name (e.g., "PayPal", "Apple Pay")
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id?: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  type?: 'expense' | 'e-wallet'; // Type of category (expense categories vs e-wallet categories)
  createdAt: Date;
}

// E-Wallet type - A specialized category for electronic payment methods
export interface EWallet {
  id?: string;
  userId: string;
  name: string; // E.g., "PayPal", "Apple Pay", "LINE Pay"
  icon: string;
  color: string;
  provider?: string; // Optional: provider/company name
  accountNumber?: string; // Optional: last 4 digits or identifier
  isDefault?: boolean; // Whether this is a default/system e-wallet
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id?: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  alertThreshold: number; // percentage (e.g., 80 means alert at 80%)
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringExpense {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  lastGenerated?: string;
  isActive: boolean;
  cardId?: string; // Optional: credit card used for this recurring expense
  // Payment method information
  paymentMethod?: PaymentMethodType; // Type of payment method
  paymentMethodName?: string; // For e-wallets, store the name (e.g., "PayPal", "Apple Pay")
  createdAt: Date;
  updatedAt: Date;
}

// Income type enum
export type IncomeType = 'salary' | 'reimbursement' | 'repayment' | 'other';

export interface Income {
  id?: string;
  userId: string;
  title?: string; // Optional title/source description
  amount: number; // Positive number
  date: string;
  type: IncomeType;
  payerName?: string; // For repayments from friends
  linkedExpenseId?: string; // FK to expenses.id - can link to one expense
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseStats {
  total: number;
  monthly: number;
  daily: number;
  byCategory: { [key: string]: number };
  budgetStatus: {
    categoryId: string;
    categoryName: string;
    spent: number;
    budget: number;
    percentage: number;
  }[];
}

// Credit Card Types
export type CardType = 'cashback' | 'points';

export interface MonthOverride {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface CashbackRule {
  id?: string;
  linkedCategoryId: string; // Links to existing category
  minSpendForRate: number; // Minimum spend to get the higher rate
  rateIfMet: number; // e.g., 0.08 for 8%
  capIfMet: number; // Max cashback when condition is met
  rateIfNotMet: number; // e.g., 0.01 for 1%
  capIfNotMet: number; // Max cashback when condition is not met
}

export interface Card {
  id?: string;
  userId: string;
  name: string;
  bankName?: string; // Optional: bank name for the card
  cardLimit: number;
  billingDay: number; // 1-28, fixed billing day each month
  perMonthOverrides?: MonthOverride[]; // Optional month-specific overrides
  benefitMinSpend?: number; // Optional: minimum spend for card benefits
  cardType: CardType;
  cashbackRules?: CashbackRule[]; // Only for cashback cards
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingCycle {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface CardStats {
  cardId: string;
  cardName: string;
  currentCycleSpending: number;
  availableCredit: number;
  estimatedTotalCashback: number;
  nextBillingDate: string;
  cashbackByRule: {
    ruleId: string;
    categoryName: string;
    categorySpend: number;
    estimatedCashback: number;
    requiredToReachCap: number;
    requiredToReachMinSpend: number;
  }[];
}

// Feature tab type
export type FeatureTab = 'dashboard' | 'expenses' | 'incomes' | 'categories' | 'budgets' | 'recurring' | 'cards' | 'profile' | 'admin';

// Feature settings for tab visibility and ordering
export interface FeatureSettings {
  id?: string;
  userId: string;
  enabledFeatures: FeatureTab[]; // List of enabled features in display order
  createdAt: Date;
  updatedAt: Date;
}

// Default feature configuration
export const DEFAULT_FEATURES: FeatureTab[] = [
  'dashboard',
  'expenses',
  'incomes',
  'categories',
  'budgets',
  'recurring',
  'cards',
];

// Default categories
export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B' },
  { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
  { name: 'Shopping', icon: '🛍️', color: '#45B7D1' },
  { name: 'Entertainment', icon: '🎬', color: '#FFA07A' },
  { name: 'Bills & Utilities', icon: '📄', color: '#98D8C8' },
  { name: 'Healthcare', icon: '🏥', color: '#F7DC6F' },
  { name: 'Education', icon: '📚', color: '#BB8FCE' },
  { name: 'Other', icon: '📦', color: '#95A5A6' },
];

// Default e-wallets
export const DEFAULT_EWALLETS = [
  { name: 'PayPal', icon: '💳', color: '#003087', provider: 'PayPal' },
  { name: 'Apple Pay', icon: '🍎', color: '#000000', provider: 'Apple' },
  { name: 'Google Pay', icon: '📱', color: '#4285F4', provider: 'Google' },
  { name: 'Alipay', icon: '🅰️', color: '#1677FF', provider: 'Alibaba' },
  { name: 'WeChat Pay', icon: '💬', color: '#07C160', provider: 'Tencent' },
];
