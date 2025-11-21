import React, { useState, useEffect } from 'react';
import { Income, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { EditIcon, DeleteIcon } from '../icons';
import IncomeForm from './IncomeForm';

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
        return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'reimbursement':
        return { bg: 'var(--info-bg)', color: 'var(--info-text)' };
      case 'repayment':
        return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
      case 'other':
        return { bg: 'var(--accent-light)', color: 'var(--accent-primary)' };
      default:
        return { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
    }
  };

  const startInlineEdit = (income: Income) => {
    setEditingId(income.id!);
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
        <div key={income.id} className="income-card" style={openMenuId === income.id ? { zIndex: 9999 } : undefined}>
          {editingId === income.id ? (
            // Inline Edit Mode
            <IncomeForm
              initialData={income}
              expenses={expenses}
              onSubmit={(data) => {
                onInlineUpdate(income.id!, data);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              title={t('editIncome')}
            />
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
                        className="btn-icon btn-icon-primary"
                        aria-label={t('edit')}
                      >
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => income.id && onDelete(income.id)}
                        className="btn-icon btn-icon-danger"
                        aria-label={t('delete')}
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>

                    {/* Mobile: Show hamburger menu */}
                    <div className="mobile-actions">
                      <div style={styles.menuContainer}>
                        <button
                          className="menu-trigger-button"
                          onClick={() => setOpenMenuId(openMenuId === income.id ? null : income.id!)}
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
  amountBadge: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    fontSize: '16px',
    fontWeight: '700' as const,
    color: 'var(--success-text)',
    pointerEvents: 'none' as const,
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1,
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
