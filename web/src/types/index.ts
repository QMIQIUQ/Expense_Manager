// Type definitions for Expense Manager

// Time format type
export type TimeFormat = '12h' | '24h';

// Date format type
export type DateFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'MMM DD, YYYY' | 'DD MMM YYYY';

// User settings
export interface UserSettings {
  id?: string;
  userId: string;
  billingCycleDay: number; // Day of month (1-31) when billing cycle resets
  timeFormat?: TimeFormat; // 12-hour or 24-hour format
  dateFormat?: DateFormat; // Date display format
  useStepByStepForm?: boolean; // Enable multi-step expense entry form
  createdAt: Date;
  updatedAt: Date;
}

// Payment method types
export type PaymentMethodType = 'cash' | 'credit_card' | 'e_wallet' | 'bank';

// Amount item for multi-amount expenses
export interface AmountItem {
  amount: number; // Amount in dollars
  description?: string; // Optional description for this amount
}

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
  // Multi-amount support (for itemized expenses)
  amountItems?: AmountItem[]; // Individual amount items that sum to total amount
  taxRate?: number; // Tax rate percentage (e.g., 6 for 6%)
  taxAmount?: number; // Calculated tax amount
  subtotal?: number; // Subtotal before tax
  // New fields for income linking
  originalReceiptAmount?: number; // Original receipt/invoice amount for tracking reimbursements
  payerName?: string; // Who paid (e.g., "Me", "Friend A")
  // Credit card and payment method fields
  cardId?: string; // Optional: credit card used for this expense
  paymentMethod?: PaymentMethodType; // Type of payment method
  paymentMethodName?: string; // For e-wallets, store the name (e.g., "PayPal", "Apple Pay")
  bankId?: string; // For bank transfers, reference to the bank
  // Repayment tracking
  needsRepaymentTracking?: boolean; // Whether this expense needs repayment tracking in dashboard
  repaymentTrackingCompleted?: boolean; // Whether tracking has been marked as completed
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
  balance?: number; // Account balance (default: 0)
  createdAt: Date;
  updatedAt: Date;
}

export interface Bank {
  id?: string;
  userId: string;
  name: string; // E.g., 'HSBC', 'Chase'
  country?: string;
  code?: string; // optional bank code
  balance?: number; // Account balance (default: 0)
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
  // Rollover settings (Phase 3)
  rolloverEnabled?: boolean; // Whether unused budget rolls over to next period
  rolloverPercentage?: number; // 0-100, percentage of unused budget to roll over (100 = full)
  rolloverCap?: number; // Maximum rollover amount (optional cap)
  accumulatedRollover?: number; // Current accumulated rollover from previous periods
  createdAt: Date;
  updatedAt: Date;
}

// Budget Template - predefined or custom budget sets (Phase 3.2)
export interface BudgetTemplateBudget {
  categoryName: string;
  amount: number; // as percentage of total budget or fixed amount
  isPercentage: boolean; // true = percentage of total, false = fixed amount
  alertThreshold: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  isBuiltIn: boolean; // true = system template, false = user custom
  userId?: string; // only for custom templates
  totalBudget?: number; // suggested total monthly budget
  budgets: BudgetTemplateBudget[];
  createdAt?: Date;
  updatedAt?: Date;
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
  lastViewedDue?: string; // Track when user last viewed/acknowledged the due notification
  isActive: boolean;
  cardId?: string; // Optional: credit card used for this recurring expense
  // Payment method information
  paymentMethod?: PaymentMethodType; // Type of payment method
  paymentMethodName?: string; // For e-wallets, store the name (e.g., "PayPal", "Apple Pay")
  bankId?: string; // For bank transfers, reference to the bank
  createdAt: Date;
  updatedAt: Date;
}

// Repayment type - tracks repayments against expenses
export interface Repayment {
  id?: string;
  userId: string;
  expenseId: string; // FK to expenses.id - which expense this repays
  amount: number; // Positive number - amount repaid
  date: string;
  payerName?: string; // Who made the repayment
  note?: string;
  // Payment method fields
  paymentMethod?: PaymentMethodType; // Type of payment method used for repayment
  cardId?: string; // Optional: credit card used for this repayment
  paymentMethodName?: string; // For e-wallets, store the name (e.g., "PayPal", "Apple Pay")
  bankId?: string; // For bank transfers, reference to the bank
  createdAt: Date;
  updatedAt: Date;
}

// Income category enum - for categorizing different income sources
export type IncomeCategory = 'default' | 'ewallet_reload' | 'other';

// Income type enum
export type IncomeType = 'salary' | 'reimbursement' | 'repayment' | 'other';

export interface Income {
  id?: string;
  userId: string;
  title?: string; // Optional title/source description
  amount: number; // Positive number
  date: string;
  type: IncomeType;
  category?: IncomeCategory; // Category for special income types like e-wallet reloads
  payerName?: string; // For repayments from friends
  linkedExpenseId?: string; // FK to expenses.id - can link to one expense (deprecated, use Repayment instead)
  note?: string;
  // Payment method fields for tracking which wallet/account received the income
  paymentMethod?: 'cash' | 'credit_card' | 'e_wallet' | 'bank';
  paymentMethodName?: string; // Name of the e-wallet, card, or bank
  cardId?: string; // FK to cards.id
  bankId?: string; // FK to banks.id
  createdAt: Date;
  updatedAt: Date;
}

// Transfer between payment methods
export interface Transfer {
  id?: string;
  userId: string;
  amount: number;
  date: string;
  time?: string; // Optional time in HH:mm format
  // Source (from)
  fromPaymentMethod: PaymentMethodType;
  fromPaymentMethodName?: string; // For e-wallet
  fromCardId?: string;
  fromBankId?: string;
  // Destination (to)
  toPaymentMethod: PaymentMethodType;
  toPaymentMethodName?: string; // For e-wallet
  toCardId?: string;
  toBankId?: string;
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

// Feature tab type - merged cards and ewallets into paymentMethods
export type FeatureTab = 'dashboard' | 'expenses' | 'incomes' | 'categories' | 'budgets' | 'recurring' | 'paymentMethods' | 'settings' | 'profile' | 'admin';

// Feature location type - different UI locations can have different orderings
export type FeatureLocation = 'tabs' | 'hamburger';

// Feature settings for tab visibility and ordering (enhanced with location-specific ordering)
export interface FeatureSettings {
  id?: string;
  userId: string;
  enabledFeatures: FeatureTab[]; // Deprecated: kept for backward compatibility
  // Location-specific feature ordering
  tabFeatures?: FeatureTab[]; // Features shown in main tabs
  hamburgerFeatures?: FeatureTab[]; // Features shown in hamburger menu
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
  'paymentMethods',
  'settings',
];

// Default features for different locations
export const DEFAULT_TAB_FEATURES: FeatureTab[] = [
  'dashboard',
  'expenses',
  'incomes',
  'categories',
  'budgets',
  'recurring',
  'paymentMethods',
  'settings',
];

export const DEFAULT_HAMBURGER_FEATURES: FeatureTab[] = [
  'profile',
  'admin',
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
  { name: 'Touch \'n Go', icon: '🔵', color: '#0066CC', provider: 'Touch \'n Go' },
  { name: 'Setel', icon: '⚡', color: '#FF6B00', provider: 'Setel' },
];

// ===============================================
// Scheduled Payment Types (定期付款/待還款)
// ===============================================

// Type of scheduled payment
export type ScheduledPaymentType = 'subscription' | 'installment' | 'debt';

// Frequency of payment
export type ScheduledPaymentFrequency = 'monthly' | 'yearly';

// Split participant for shared payments
export interface PaymentSplitParticipant {
  name: string;
  shareAmount: number;
  isPaid?: boolean;
}

// Scheduled Payment - represents a recurring/scheduled payment like subscriptions or debts
export interface ScheduledPayment {
  id?: string;
  userId: string;
  name: string; // Name of the payment (e.g., "Netflix Subscription", "Car Loan")
  description?: string; // Optional description
  category: string; // Category for classification
  type: ScheduledPaymentType; // subscription, installment, or debt
  
  // Amount info
  amount: number; // Amount per payment period
  totalAmount?: number; // For installments/debts: total amount to be paid
  interestRate?: number; // Optional interest rate percentage (e.g., 5 for 5%)
  
  // Currency support
  currency?: string; // Currency code (e.g., "USD", "MYR", "TWD")
  
  // Schedule info
  frequency: ScheduledPaymentFrequency; // monthly or yearly
  dueDay: number; // Day of the month (1-31) for monthly, or day of year for yearly
  startDate: string; // When payments start (YYYY-MM-DD)
  endDate?: string; // When payments end (optional, for installments)
  hasEndDate?: boolean; // Explicitly track if payment has an end date
  totalInstallments?: number; // For installments: total number of payments
  
  // Payment method
  paymentMethod?: PaymentMethodType;
  cardId?: string;
  paymentMethodName?: string; // For e-wallets
  bankId?: string;
  
  // Notification/Reminder settings
  enableReminders?: boolean; // Whether to show reminders
  reminderDaysBefore?: number; // Days before due date to show reminder (default: 3)
  
  // Auto-generate expense option
  autoGenerateExpense?: boolean; // Automatically create expense when payment is confirmed
  
  // Shared payment info
  isShared?: boolean; // Whether this is a shared/split payment
  splitParticipants?: PaymentSplitParticipant[]; // People sharing this payment
  
  // Status
  isActive: boolean;
  isCompleted?: boolean; // For installments/debts: all payments completed
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Payment Record - tracks individual payments made for a scheduled payment
export interface ScheduledPaymentRecord {
  id?: string;
  userId: string;
  scheduledPaymentId: string; // FK to ScheduledPayment
  
  // Payment details
  expectedAmount: number; // The expected/scheduled amount
  actualAmount: number; // The actual amount paid
  difference: number; // actualAmount - expectedAmount (positive = overpaid, negative = underpaid)
  
  // Period tracking
  periodYear: number; // Year of this payment period
  periodMonth: number; // Month (1-12) for monthly, or period number for yearly
  dueDate: string; // The due date for this payment
  paidDate: string; // When it was actually paid
  
  // Payment method used
  paymentMethod?: PaymentMethodType;
  cardId?: string;
  paymentMethodName?: string;
  bankId?: string;
  
  // Notes
  note?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Summary of payment history for a scheduled payment
export interface ScheduledPaymentSummary {
  scheduledPaymentId: string;
  totalPaid: number;
  totalExpected: number;
  paymentCount: number;
  remainingPayments?: number; // For installments
  remainingAmount?: number; // For installments/debts
  lastPaymentDate?: string;
  nextDueDate?: string;
  overdueAmount?: number;
}
