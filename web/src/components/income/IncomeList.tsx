import React from 'react';
import { Income, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface IncomeListProps {
  incomes: Income[];
  expenses: Expense[];
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
}

const IncomeList: React.FC<IncomeListProps> = ({ incomes, expenses, onEdit, onDelete }) => {
  const { t } = useLanguage();

  const getExpenseDescription = (expenseId?: string) => {
    if (!expenseId) return null;
    const expense = expenses.find((e) => e.id === expenseId);
    return expense ? expense.description : 'Unknown Expense';
  };

  const getIncomeTypeLabel = (type: string) => {
    switch (type) {
      case 'salary':
        return t('salary');
      case 'reimbursement':
        return t('reimbursement');
      case 'repayment':
        return t('repayment');
      case 'other':
        return t('other');
      default:
        return type;
    }
  };

  const getIncomeTypeIcon = (type: string) => {
    switch (type) {
      case 'salary':
        return '💰';
      case 'reimbursement':
        return '💵';
      case 'repayment':
        return '💸';
      case 'other':
        return '💳';
      default:
        return '💰';
    }
  };

  if (incomes.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>💰</div>
        <div style={styles.emptyText}>{t('noIncomesYet')}</div>
        <div style={styles.emptySubtext}>
          {t('startTrackingIncome')}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {incomes.map((income) => (
        <div key={income.id} style={styles.incomeCard}>
          <div style={styles.incomeHeader}>
            <div style={styles.incomeIcon}>{getIncomeTypeIcon(income.type)}</div>
            <div style={styles.incomeInfo}>
              <div style={styles.incomeTitle}>
                {income.title || getIncomeTypeLabel(income.type)}
              </div>
              <div style={styles.incomeType}>
                {getIncomeTypeLabel(income.type)}
                {income.payerName && ` - ${income.payerName}`}
              </div>
            </div>
            <div style={styles.incomeAmount}>+${income.amount.toFixed(2)}</div>
          </div>

          <div style={styles.incomeDetails}>
            <div style={styles.incomeDate}>
              📅 {new Date(income.date).toLocaleDateString()}
            </div>
            {income.linkedExpenseId && (
              <div style={styles.linkedExpense}>
                🔗 {t('linkedTo')}: {getExpenseDescription(income.linkedExpenseId)}
              </div>
            )}
            {income.note && <div style={styles.incomeNote}>📝 {income.note}</div>}
          </div>

          <div style={styles.incomeActions}>
            <button
              onClick={() => onEdit(income)}
              style={styles.editButton}
              className="hover:bg-blue-600 transition"
            >
              {t('edit') || 'Edit'}
            </button>
            <button
              onClick={() => income.id && onDelete(income.id)}
              style={styles.deleteButton}
              className="hover:bg-red-600 transition"
            >
              {t('delete') || 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  incomeCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  incomeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  incomeIcon: {
    fontSize: '32px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: '8px',
  },
  incomeInfo: {
    flex: 1,
    minWidth: 0,
  },
  incomeTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  incomeType: {
    fontSize: '13px',
    color: '#666',
    marginTop: '2px',
  },
  incomeAmount: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#4caf50',
  },
  incomeDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    marginBottom: '12px',
    paddingLeft: '60px',
  },
  incomeDate: {
    fontSize: '13px',
    color: '#666',
  },
  linkedExpense: {
    fontSize: '13px',
    color: '#1976d2',
    backgroundColor: '#e3f2fd',
    padding: '4px 8px',
    borderRadius: '4px',
    width: 'fit-content',
  },
  incomeNote: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic' as const,
  },
  incomeActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  editButton: {
    padding: '6px 16px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#999',
  },
};

export default IncomeList;
