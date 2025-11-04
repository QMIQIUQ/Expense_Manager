import React from 'react';
import ExpenseForm from '../../components/expenses/ExpenseForm';
import ExpenseList from '../../components/expenses/ExpenseList';
import { Expense, Category } from '../../types';

interface Props {
  expenses: Expense[];
  categories: Category[];
  editingExpense: Expense | null;
  onAddExpense: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onUpdateExpense: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onEdit: (exp: Expense | null) => void;
  onDeleteExpense: (id: string) => void;
}

const ExpensesTab: React.FC<Props> = ({
  expenses,
  categories,
  editingExpense,
  onAddExpense,
  onUpdateExpense,
  onEdit,
  onDeleteExpense,
}) => {
  return (
    <div style={styles.expensesTab}>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          {editingExpense ? 'Edit Expense' : 'Add New Expense'}
        </h2>
        <ExpenseForm
          onSubmit={editingExpense ? onUpdateExpense : onAddExpense}
          onCancel={editingExpense ? () => onEdit(null) : undefined}
          initialData={editingExpense || undefined}
          categories={categories}
        />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Expense History</h2>
        <ExpenseList
          expenses={expenses}
          onEdit={onEdit}
          onDelete={onDeleteExpense}
        />
      </div>
    </div>
  );
};

const styles = {
  expensesTab: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '30px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600 as const,
    color: '#333',
  },
};

export default ExpensesTab;
