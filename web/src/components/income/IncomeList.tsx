import React, { useState } from 'react';
import { Income, Expense, IncomeType } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface IncomeListProps {
  incomes: Income[];
  expenses: Expense[];
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<Income>) => void;
}

const IncomeList: React.FC<IncomeListProps> = ({ incomes, expenses, onDelete, onInlineUpdate }) => {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    title?: string;
    amount?: string;
    date?: string;
    type?: IncomeType;
    payerName?: string;
    linkedExpenseId?: string;
    note?: string;
  }>({});

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

  const startInlineEdit = (income: Income) => {
    setEditingId(income.id!);
    setDraft({
      title: income.title || '',
      amount: income.amount.toString(),
      date: income.date,
      type: income.type,
      payerName: income.payerName || '',
      linkedExpenseId: income.linkedExpenseId || '',
      note: income.note || '',
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveInlineEdit = (income: Income) => {
    const updates: Partial<Income> = {};
    const parsedAmount = parseFloat(draft.amount || '0');
    
    if ((income.title || '') !== (draft.title || '')) {
      updates.title = draft.title && draft.title.trim() !== '' ? draft.title : undefined;
    }
    if (!isNaN(parsedAmount) && income.amount !== parsedAmount) updates.amount = parsedAmount;
    if (income.date !== draft.date && draft.date) updates.date = draft.date;
    if (income.type !== draft.type && draft.type) updates.type = draft.type;
    if ((income.payerName || '') !== (draft.payerName || '')) {
      updates.payerName = draft.payerName && draft.payerName.trim() !== '' ? draft.payerName : undefined;
    }
    if ((income.linkedExpenseId || '') !== (draft.linkedExpenseId || '')) {
      updates.linkedExpenseId = draft.linkedExpenseId && draft.linkedExpenseId !== '' ? draft.linkedExpenseId : undefined;
    }
    if ((income.note || '') !== (draft.note || '')) {
      updates.note = draft.note && draft.note.trim() !== '' ? draft.note : undefined;
    }

    if (Object.keys(updates).length > 0) {
      onInlineUpdate(income.id!, updates);
    }
    cancelInlineEdit();
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
          {editingId === income.id ? (
            // Inline Edit Mode
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={draft.title || ''}
                  placeholder={t('titleOptional')}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  style={{ ...styles.input, flex: 2, minWidth: '180px' }}
                />
                <input
                  type="number"
                  step="0.01"
                  value={draft.amount || ''}
                  placeholder={t('amount')}
                  onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                  style={{ ...styles.input, width: '140px' }}
                />
                <select
                  value={draft.type || 'other'}
                  onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as IncomeType }))}
                  style={{ ...styles.select, minWidth: '140px' }}
                >
                  <option value="salary">{t('salary')}</option>
                  <option value="reimbursement">{t('reimbursement')}</option>
                  <option value="repayment">{t('repayment')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={draft.date || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                  style={{ ...styles.input, width: '160px' }}
                />
                <input
                  type="text"
                  value={draft.payerName || ''}
                  placeholder={t('payerNameOptional')}
                  onChange={(e) => setDraft((d) => ({ ...d, payerName: e.target.value }))}
                  style={{ ...styles.input, flex: 1, minWidth: '140px' }}
                />
                {expenses.length > 0 && (
                  <select
                    value={draft.linkedExpenseId || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, linkedExpenseId: e.target.value }))}
                    style={{ ...styles.select, flex: 1, minWidth: '200px' }}
                  >
                    <option value="">-- {t('noLink')} --</option>
                    {expenses.map((expense) => (
                      <option key={expense.id} value={expense.id}>
                        {expense.description} - ${expense.amount.toFixed(2)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={draft.note || ''}
                  placeholder={t('notesOptional')}
                  onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                  style={{ ...styles.input, flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => saveInlineEdit(income)} style={{ ...styles.iconButton, backgroundColor: 'rgba(33,150,83,0.08)' }} aria-label={t('save')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 16.2l-3.5-3.5L4 14.2 9 19l12-12-1.4-1.4L9 16.2z" fill="#219653"/>
                  </svg>
                </button>
                <button onClick={cancelInlineEdit} style={{ ...styles.iconButton, backgroundColor: 'rgba(158,158,158,0.12)' }} aria-label={t('cancel')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="#555"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            // Display Mode
            <>
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
                  onClick={() => startInlineEdit(income)}
                  style={styles.iconButton}
                  aria-label={t('edit')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#1976d2"/>
                    <path d="M20.71 7.04a1.004 1.004 0 0 0 0-1.41l-2.34-2.34a1.004 1.004 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#1976d2"/>
                  </svg>
                </button>
                <button
                  onClick={() => income.id && onDelete(income.id)}
                  style={{ ...styles.iconButton, backgroundColor: 'rgba(244,67,54,0.08)' }}
                  className="hover:bg-red-100 transition"
                  aria-label={t('delete')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#f44336"/>
                  </svg>
                </button>
              </div>
            </>
          )}
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
  iconButton: {
    padding: '8px',
    backgroundColor: 'rgba(25,118,210,0.08)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
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
  input: {
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
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
