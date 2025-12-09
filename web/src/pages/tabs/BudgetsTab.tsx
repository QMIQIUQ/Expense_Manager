import React from 'react';
import BudgetManager from '../../components/budgets/BudgetManager';
import { Budget, Category, Expense, Repayment } from '../../types';

interface Props {
  budgets: Budget[];
  categories: Category[];
  expenses?: Expense[];
  repayments?: Repayment[];
  spentByCategory: { [key: string]: number };
  billingCycleDay?: number;
  onAdd: (data: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Budget>) => void;
  onDelete: (id: string) => void;
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
  onDelete 
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
