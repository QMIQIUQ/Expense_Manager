import React from 'react';
import BudgetManager from '../../components/budgets/BudgetManager';
import { Budget, Category } from '../../types';

interface Props {
  budgets: Budget[];
  categories: Category[];
  spentByCategory: { [key: string]: number };
  onAdd: (data: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Budget>) => void;
  onDelete: (id: string) => void;
}

const BudgetsTab: React.FC<Props> = ({ budgets, categories, spentByCategory, onAdd, onUpdate, onDelete }) => {
  return (
    <div style={styles.section}>
      <BudgetManager
        budgets={budgets}
        categories={categories}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        spentByCategory={spentByCategory}
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
