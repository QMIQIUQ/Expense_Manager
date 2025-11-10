import React from 'react';
import CategoryManager from '../../components/categories/CategoryManager';
import { Category, Expense } from '../../types';

interface Props {
  categories: Category[];
  expenses: Expense[];
  onAdd: (data: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

const CategoriesTab: React.FC<Props> = ({ categories, expenses, onAdd, onUpdate, onDelete }) => {
  return (
    <div style={styles.section}>
      <CategoryManager
        categories={categories}
        expenses={expenses}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
};

const styles = {
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
};

export default CategoriesTab;
