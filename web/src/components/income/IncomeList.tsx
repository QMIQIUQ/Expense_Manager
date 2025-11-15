import React, { useState } from 'react';
import { Income, Expense, IncomeType } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '../icons';

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
            <div style={styles.inlineEditor}>
              <div style={styles.inlineRow}>
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
              <div style={styles.inlineRow}>
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
              <div style={styles.inlineRow}>
                <input
                  type="text"
                  value={draft.note || ''}
                  placeholder={t('notesOptional')}
                  onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                  style={{ ...styles.input, flex: 1 }}
                />
              </div>
              <div style={styles.inlineActions}>
                <button
                  onClick={() => saveInlineEdit(income)}
                  style={styles.saveButton}
                  aria-label={t('save')}
                >
                  <CheckIcon size={18} />
                </button>
                <button onClick={cancelInlineEdit} style={styles.cancelButton} aria-label={t('cancel')}>
                  <CloseIcon size={18} />
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
                  <EditIcon size={18} />
                </button>
                <button
                  onClick={() => income.id && onDelete(income.id)}
                  style={{ ...styles.iconButton, backgroundColor: 'rgba(244,63,94,0.12)', color: '#b91c1c' }}
                  aria-label={t('delete')}
                >
                  <DeleteIcon size={18} />
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
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(15,23,42,0.05)',
  },
  incomeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  incomeIcon: {
    fontSize: '30px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    borderRadius: '10px',
  },
  incomeInfo: {
    flex: 1,
    minWidth: 0,
  },
  incomeTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  incomeType: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },
  incomeAmount: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#059669',
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
    color: '#6b7280',
  },
  linkedExpense: {
    fontSize: '13px',
    color: '#1d4ed8',
    backgroundColor: '#e0f2fe',
    padding: '4px 8px',
    borderRadius: '6px',
    width: 'fit-content',
  },
  incomeNote: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic' as const,
  },
  incomeActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  iconButton: {
    padding: '8px',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
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
    color: '#4b5563',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  inlineEditor: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  inlineRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  inlineActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  saveButton: {
    padding: '8px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'rgba(34,197,94,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'rgba(148,163,184,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
};

export default IncomeList;
