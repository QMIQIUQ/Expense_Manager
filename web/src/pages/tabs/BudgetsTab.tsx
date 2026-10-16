import React from 'react';
import BudgetManager from '../../components/budgets/BudgetManager';
import { Budget, BudgetPeriod, Category, Expense, OverallBudgetLimits, Repayment } from '../../types';

interface Props {
  budgets: Budget[];
  categories: Category[];
  expenses?: Expense[];
  repayments?: Repayment[];
  spentByCategory: { [key: string]: number };
  billingCycleDay?: number;
  onAdd: (data: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => boolean | Promise<boolean>;
  onUpdate: (id: string, updates: Partial<Budget>) => boolean | Promise<boolean>;
  onDelete: (id: string) => void;
  onCreateCategory: (categoryName: string) => void;
  overallBudgetLimits?: OverallBudgetLimits;
  onSaveOverallBudgetLimit: (period: BudgetPeriod, amount: number) => Promise<boolean>;
}

const BudgetsTab: React.FC<Props> = ({ 
  budgets, 
  categories, 
  expenses = [],
  repayments = [],
  spentByCategory, 
  billingCycleDay = 1,
  onAdd, 
  onUpdate, 
  onDelete,
  onCreateCategory,
  overallBudgetLimits,
  onSaveOverallBudgetLimit,
}) => {
  return (
    <div style={styles.section}>
      <BudgetManager
        budgets={budgets}
        categories={categories}
        expenses={expenses}
        repayments={repayments}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onCreateCategory={onCreateCategory}
        overallBudgetLimits={overallBudgetLimits}
        onSaveOverallBudgetLimit={onSaveOverallBudgetLimit}
        spentByCategory={spentByCategory}
        billingCycleDay={billingCycleDay}
      />
    </div>
  );
};

const styles = {
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
};

export default BudgetsTab;
