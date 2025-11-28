// Widget component props types
import { Expense, Income, Repayment, Budget, Card, Category, EWallet, Bank } from '../../../types';
import { QuickExpensePreset } from '../../../types/quickExpense';
import { WidgetSize } from '../../../types/dashboard';

export interface WidgetProps {
  expenses: Expense[];
  incomes: Income[];
  repayments: Repayment[];
  budgets: Budget[];
  cards: Card[];
  categories: Category[];
  ewallets: EWallet[];
  banks: Bank[];
  billingCycleDay: number;
  onMarkTrackingCompleted?: (expenseId: string) => void;
  onQuickAdd?: () => void;
  // Quick expense related
  quickExpensePresets?: QuickExpensePreset[];
  onQuickExpenseAdd?: (preset: QuickExpensePreset) => Promise<void>;
  onQuickExpensePresetsChange?: () => void;
  // Widget size for adaptive layouts
  size?: WidgetSize;
}
