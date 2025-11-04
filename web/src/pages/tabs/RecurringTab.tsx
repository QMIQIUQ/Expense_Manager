import React from 'react';
import RecurringExpenseManager from '../../components/recurring/RecurringExpenseManager';
import { RecurringExpense, Category } from '../../types';

interface Props {
  recurringExpenses: RecurringExpense[];
  categories: Category[];
  onAdd: (data: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<RecurringExpense>) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const RecurringTab: React.FC<Props> = ({
  recurringExpenses,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onToggleActive,
}) => {
  return (
    <div style={styles.section}>
      <RecurringExpenseManager
        recurringExpenses={recurringExpenses}
        categories={categories}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
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

export default RecurringTab;
