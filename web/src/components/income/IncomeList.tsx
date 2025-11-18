import React, { useState, useEffect } from 'react';
import { Income, Expense, IncomeType } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '../icons';

// Add responsive styles for action buttons
const responsiveStyles = `
  .desktop-actions {
    display: none;
    gap: 8px;
  }
  .mobile-actions {
    display: block;
  }
  @media (min-width: 640px) {
    .desktop-actions {
      display: flex;
    }
    .mobile-actions {
      display: none;
    }
  }
`;

interface IncomeListProps {
  incomes: Income[];
  expenses: Expense[];
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<Income>) => void;
  onOpenExpenseById?: (id: string) => void;
}

const IncomeList: React.FC<IncomeListProps> = ({ incomes, expenses, onDelete, onInlineUpdate, onOpenExpenseById }) => {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<{
    title?: string;
    amount?: string;
    date?: string;
    type?: IncomeType;
    payerName?: string;
    linkedExpenseId?: string;
    note?: string;
  }>({});

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest('.mobile-actions')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

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

  const getIncomeTypeColor = (type: string) => {
    switch (type) {
      case 'salary':
        return { bg: '#dcfce7', color: '#15803d' };
      case 'reimbursement':
        return { bg: '#dbeafe', color: '#1e40af' };
      case 'repayment':
        return { bg: '#fef3c7', color: '#b45309' };
      case 'other':
        return { bg: '#f3e8ff', color: '#7c3aed' };
      default:
        return { bg: '#e5e7eb', color: '#4b5563' };
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

  const toggleGroupCollapse = (date: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group incomes by date for display
  const groupIncomesByDate = () => {
    const grouped: { [date: string]: Income[] } = {};
    
    // Sort incomes by date (newest first)
    const sortedIncomes = [...incomes].sort((a, b) => b.date.localeCompare(a.date));
    
    sortedIncomes.forEach((income) => {
      const dateKey = income.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(income);
    });

    // Convert to array with daily totals
    return Object.entries(grouped).map(([date, incs]) => {
      const dailyTotal = incs.reduce((sum, inc) => sum + inc.amount, 0);
      return { date, incomes: incs, dailyTotal };
    }).sort((a, b) => b.date.localeCompare(a.date)); // Sort descending (newest first)
  };

  const groupedIncomes = groupIncomesByDate();

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
      <style>{responsiveStyles}</style>
      {groupedIncomes.map(({ date, incomes: dayIncomes, dailyTotal }) => {
        const isCollapsed = collapsedGroups.has(date);
        return (
          <div key={date} style={styles.dateGroup}>
            {/* Date group header with daily subtotal - clickable to expand/collapse */}
            <div className="date-group-header" style={styles.dateGroupHeader} onClick={() => toggleGroupCollapse(date)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
                <span style={styles.dateGroupDate}>{formatDate(date)}</span>
                <span style={styles.incomeCount}>({dayIncomes.length})</span>
              </div>
              <span style={styles.dateGroupTotal}>+${dailyTotal.toFixed(2)}</span>
            </div>
            
            {/* Incomes for this date - hidden when collapsed */}
            {!isCollapsed && dayIncomes.map((income) => (
        <div key={income.id} style={{ ...styles.incomeCard, ...(openMenuId === income.id ? { zIndex: 9999 } : {}) }}>
          {editingId === income.id ? (
            // Inline Edit Mode
            <div style={styles.inlineEditor}>
              <div style={styles.inlineRow}>
                <div style={{ flex: 2, minWidth: '180px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('title')}</label>
                  <input
                    type="text"
                    value={draft.title || ''}
                    placeholder={t('titleOptional')}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    style={{ ...styles.input, width: '100%' }}
                  />
                </div>
                <div style={{ width: '140px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('amount')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.amount || ''}
                    placeholder={t('amount')}
                    onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                    style={{ ...styles.input, width: '100%' }}
                  />
                </div>
                <div style={{ minWidth: '140px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('type')}</label>
                  <select
                    value={draft.type || 'other'}
                    onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as IncomeType }))}
                    style={{ ...styles.select, width: '100%' }}
                  >
                    <option value="salary">{t('salary')}</option>
                    <option value="reimbursement">{t('reimbursement')}</option>
                    <option value="repayment">{t('repayment')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              </div>
              <div style={styles.inlineRow}>
                <div style={{ width: '160px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('date')}</label>
                  <input
                    type="date"
                    value={draft.date || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                    style={{ ...styles.input, width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('payerName')}</label>
                  <input
                    type="text"
                    value={draft.payerName || ''}
                    placeholder={t('payerNameOptional')}
                    onChange={(e) => setDraft((d) => ({ ...d, payerName: e.target.value }))}
                    style={{ ...styles.input, width: '100%' }}
                  />
                </div>
                  {expenses.length > 0 && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('linkToExpense')}</label>
                    <select
                      value={draft.linkedExpenseId || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, linkedExpenseId: e.target.value }))}
                      style={{ ...styles.select, width: '100%' }}
                    >
                      <option value="">-- {t('noLink')} --</option>
                      {expenses.map((expense) => (
                        <option key={expense.id} value={expense.id}>
                          {expense.description} - ${expense.amount.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div style={styles.inlineRow}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('notes')}</label>
                  <input
                    type="text"
                    value={draft.note || ''}
                    placeholder={t('notesOptional')}
                    onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                    style={{ ...styles.input, width: '100%' }}
                  />
                </div>
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
              {/* Amount badge at top-right */}
              <div style={styles.amountBadge}>
                +${income.amount.toFixed(2)}
              </div>

              {/* Header row with time, linked expense, date */}
              <div style={styles.headerRow}>
                <div style={styles.dateDisplay}>
                  {new Date(income.date).toLocaleDateString()}
                </div>
                {income.linkedExpenseId && (
                  <button
                    type="button"
                    onClick={() => onOpenExpenseById && onOpenExpenseById(income.linkedExpenseId!)}
                    title={t('expenses')}
                    style={styles.linkedExpenseChip as React.CSSProperties}
                    aria-label={t('expenses')}
                  >
                    🔗 {getExpenseDescription(income.linkedExpenseId)}
                  </button>
                )}
              </div>

              {/* Main content row */}
              <div style={styles.mainRow}>
                <div style={styles.leftCol}>
                  {/* Title with type badge */}
                  <div style={styles.titleRow}>
                    <div style={{
                      ...styles.typeBadge,
                      backgroundColor: getIncomeTypeColor(income.type).bg,
                      color: getIncomeTypeColor(income.type).color,
                    }}>
                      {getIncomeTypeLabel(income.type)}
                    </div>
                    <div style={styles.titleInfo}>
                      <h3 style={styles.incomeTitle}>
                        {income.title || getIncomeTypeLabel(income.type)}
                      </h3>
                      {income.payerName && (
                        <div style={styles.payerName}>
                          {income.payerName}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Note + actions in one row */}
                  <div style={styles.bottomRow}>
                    <div style={styles.incomeNote}>
                      {income.note ? `📝 ${income.note}` : ''}
                    </div>
                    
                    {/* Desktop: Show individual buttons */}
                    <div className="desktop-actions" style={{ gap: '8px' }}>
                      <button
                        onClick={() => startInlineEdit(income)}
                        style={styles.iconButton}
                        aria-label={t('edit')}
                      >
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => income.id && onDelete(income.id)}
                        style={{ ...styles.iconButton, ...styles.deleteButton }}
                        aria-label={t('delete')}
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>

                    {/* Mobile: Show hamburger menu */}
                    <div className="mobile-actions">
                      <div style={styles.menuContainer}>
                        <button
                          className="menu-item-hover"
                          onClick={() => setOpenMenuId(openMenuId === income.id ? null : income.id!)}
                          style={styles.menuButton}
                          aria-label="More"
                        >
                          ⋮
                        </button>
                        {openMenuId === income.id && (
                          <div style={styles.menu}>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                startInlineEdit(income);
                              }}
                            >
                              <span style={styles.menuIcon}><EditIcon size={16} /></span>
                              {t('edit')}
                            </button>
                            <button
                              className="menu-item-hover"
                              style={{ ...styles.menuItem, color: '#b91c1c' }}
                              onClick={() => {
                                setOpenMenuId(null);
                                income.id && onDelete(income.id);
                              }}
                            >
                              <span style={styles.menuIcon}><DeleteIcon size={16} /></span>
                              {t('delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
          </div>
        );
      })}
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
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 3px 10px var(--shadow)',
    position: 'relative' as const,
    overflow: 'visible' as const,
    transition: 'all 0.2s ease',
  },
  amountBadge: {
    position: 'absolute' as const,
    top: '14px',
    right: '14px',
    fontSize: '20px',
    fontWeight: '800' as const,
    color: '#059669',
    pointerEvents: 'none' as const,
    textShadow: '0 1px 3px rgba(5, 150, 105, 0.15)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
    minWidth: 0,
    paddingRight: '96px', // reserve space for top-right amount badge
  },
  dateDisplay: {
    fontSize: '13px',
    color: '#6b7280',
    flexShrink: 0,
  },
  linkedExpenseChip: {
    fontSize: '12px',
    color: 'var(--accent-primary)',
    background: 'var(--accent-light)',
    padding: '5px 10px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    maxWidth: '60%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
    border: 'none',
    fontWeight: '600' as const,
    boxShadow: '0 1px 3px var(--shadow)',
  },
  mainRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '4px',
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  typeBadge: {
    fontSize: '11px',
    fontWeight: '600' as const,
    padding: '4px 10px',
    borderRadius: '6px',
    flexShrink: 0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  titleInfo: {
    flex: 1,
    minWidth: 0,
  },
  incomeTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  payerName: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },
  incomeNote: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic' as const,
    marginTop: '4px',
    flex: 1,
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '8px',
  },
  incomeActions: {
    display: 'flex',
    gap: '8px',
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
  deleteButton: {
    backgroundColor: 'rgba(244,63,94,0.12)',
    color: '#b91c1c',
  },
  menuContainer: {
    position: 'relative' as const,
  },
  menuButton: {
    padding: '8px 12px',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold' as const,
    lineHeight: '1',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 9999,
    minWidth: '160px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
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
    backgroundColor: 'var(--card-bg)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: 'var(--card-bg)',
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
  dateGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '12px',
  },
  dateGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: '#e8f5e9',
    borderRadius: '10px',
    borderLeft: '5px solid #4caf50',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none' as const,
    boxShadow: '0 2px 6px var(--shadow)',
  },
  dateGroupDate: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  incomeCount: {
    fontSize: '12px',
    fontWeight: '400' as const,
    color: 'var(--text-secondary)',
  },
  collapseIcon: {
    fontSize: '10px',
    color: '#16a34a',
    display: 'inline-block',
    width: '12px',
    transition: 'transform 0.2s',
  },
  dateGroupTotal: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#16a34a',
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
