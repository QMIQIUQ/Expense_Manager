import React, { useState } from 'react';
import IncomeForm from '../../components/income/IncomeForm';
import IncomeList from '../../components/income/IncomeList';
import { Income, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

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
            + {t('addNewIncome')}
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
    marginBottom: '10px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: '#333',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  formContainer: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '10px',
  },
};

export default IncomesTab;
