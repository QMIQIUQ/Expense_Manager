import React from 'react';
import CategoryManager from '../../components/categories/CategoryManager';
import { Category } from '../../types';

interface Props {
  categories: Category[];
  onAdd: (data: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

const CategoriesTab: React.FC<Props> = ({ categories, onAdd, onUpdate, onDelete }) => {
  return (
    <div style={styles.section}>
      <CategoryManager
        categories={categories}
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
