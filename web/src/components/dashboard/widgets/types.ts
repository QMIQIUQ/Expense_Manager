// Widget component props types
import { Expense, Income, Repayment, Budget, Card } from '../../../types';

export interface WidgetProps {
  expenses: Expense[];
  incomes: Income[];
  repayments: Repayment[];
  budgets: Budget[];
  cards: Card[];
  billingCycleDay: number;
  onMarkTrackingCompleted?: (expenseId: string) => void;
}
