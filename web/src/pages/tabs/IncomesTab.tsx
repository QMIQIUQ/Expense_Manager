import React, { useState } from 'react';
import IncomeForm from '../../components/income/IncomeForm';
import IncomeList from '../../components/income/IncomeList';
import { Income, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon } from '../../components/icons';

interface Props {
  incomes: Income[];
  expenses: Expense[];
  onAddIncome: (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onInlineUpdate: (id: string, updates: Partial<Income>) => void;
  onDeleteIncome: (id: string) => void;
}

const IncomesTab: React.FC<Props> = ({
  incomes,
  expenses,
  onAddIncome,
  onInlineUpdate,
  onDeleteIncome,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onAddIncome(data);
    setIsAdding(false);
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t('incomeHistory')}</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            <PlusIcon size={18} />
            <span>{t('addNewIncome')}</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div style={styles.formContainer}>
          <IncomeForm
            onSubmit={handleSubmit}
            onCancel={() => setIsAdding(false)}
            expenses={expenses}
          />
        </div>
      )}

      <IncomeList
        incomes={incomes}
        expenses={expenses}
        onDelete={onDeleteIncome}
        onInlineUpdate={onInlineUpdate}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: '#111827',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  formContainer: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '10px',
    boxShadow: '0 2px 4px rgba(15,23,42,0.05)',
  },
};

export default IncomesTab;
