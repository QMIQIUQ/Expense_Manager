import React from 'react';
import IncomeForm from '../../components/income/IncomeForm';
import IncomeList from '../../components/income/IncomeList';
import { Income, Expense } from '../../types';

interface Props {
  incomes: Income[];
  expenses: Expense[];
  editingIncome: Income | null;
  onAddIncome: (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onUpdateIncome: (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onEdit: (income: Income | null) => void;
  onDeleteIncome: (id: string) => void;
}

const IncomesTab: React.FC<Props> = ({
  incomes,
  expenses,
  editingIncome,
  onAddIncome,
  onUpdateIncome,
  onEdit,
  onDeleteIncome,
}) => {
  return (
    <div style={styles.incomesTab}>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          {editingIncome ? 'Edit Income' : 'Add New Income'}
        </h2>
        <IncomeForm
          onSubmit={editingIncome ? onUpdateIncome : onAddIncome}
          onCancel={editingIncome ? () => onEdit(null) : undefined}
          initialData={editingIncome || undefined}
          expenses={expenses}
        />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Income History</h2>
        <IncomeList
          incomes={incomes}
          expenses={expenses}
          onEdit={onEdit}
          onDelete={onDeleteIncome}
        />
      </div>
    </div>
  );
};

const styles = {
  incomesTab: {
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

export default IncomesTab;
