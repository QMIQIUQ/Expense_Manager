// Type definitions for Expense Manager

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
  createdAt: Date;
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
