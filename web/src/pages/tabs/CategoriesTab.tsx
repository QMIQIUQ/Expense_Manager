import React from 'react';
import CategoryManager from '../../components/categories/CategoryManager';
import { Category, Expense } from '../../types';

interface Props {
  categories: Category[];
  expenses: Expense[];
  onAdd: (data: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense?: (id: string) => void;
}

const CategoriesTab: React.FC<Props> = ({ categories, expenses, onAdd, onUpdate, onDelete, onUpdateExpense, onDeleteExpense }) => {
  return (
    <div style={styles.section}>
      <CategoryManager
        categories={categories}
        expenses={expenses}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onUpdateExpense={onUpdateExpense}
        onDeleteExpense={onDeleteExpense}
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

export default CategoriesTab;
