import React, { useState, useEffect } from 'react';
import { Budget, Category } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import BudgetForm from './BudgetForm';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';

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

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  onAdd: (budget: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Budget>) => void;
  onDelete: (id: string) => void;
  spentByCategory: { [key: string]: number };
}

const BudgetManager: React.FC<BudgetManagerProps> = ({
  budgets,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  spentByCategory,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');


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

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; budgetId: string | null }>({
    isOpen: false,
    budgetId: null,
  });
  
  // Filter budgets by search term
  const filteredBudgets = budgets.filter((budget) =>
    budget.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    isSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setIsSelectionMode
  } = useMultiSelect<Budget>();





  const startInlineEdit = (budget: Budget) => {
    setEditingId(budget.id!);
  };





  const getProgressPercentage = (categoryName: string, budgetAmount: number) => {
    const spent = spentByCategory[categoryName] || 0;
    return Math.min((spent / budgetAmount) * 100, 100);
  };

  const getProgressColor = (percentage: number, threshold: number) => {
    if (percentage >= 100) return '#dc2626'; // Red - over budget
    if (percentage >= 90) return '#ea580c'; // Orange-red
    if (percentage >= threshold) return '#f59e0b'; // Orange - warning
    if (percentage >= 60) return '#fbbf24'; // Yellow
    if (percentage >= 40) return '#a3e635'; // Light green
    return '#22c55e'; // Green - safe
  };

  return (
    <div style={styles.container}>
      <style>{responsiveStyles}</style>
      <div style={styles.header}>
        <h2 style={styles.title}>{t('budgetManagement')}</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            <PlusIcon size={18} />
            <span>{t('setBudget')}</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-5">
          <BudgetForm
            categories={categories}
            onSubmit={(data) => {
              onAdd(data);
              setIsAdding(false);
            }}
            onCancel={() => {
              setIsAdding(false);
              setEditingId(null);
            }}
          />
        </div>
      )}

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <SearchBar
          placeholder={t('searchByName') || 'Search by category name...'}
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      <MultiSelectToolbar
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        onToggleSelectionMode={() => {
            if (isSelectionMode) {
                clearSelection();
                setIsSelectionMode(false);
            } else {
                setIsSelectionMode(true);
            }
        }}
        onSelectAll={() => selectAll(filteredBudgets)}
        onDeleteSelected={() => {
          if (selectedIds.size > 0) {
             setDeleteConfirm({ isOpen: true, budgetId: null });
          }
        }}
      />

      <div style={styles.budgetList}>
        {filteredBudgets.length === 0 ? (
          <div style={styles.noData}>
            <p>{budgets.length === 0 ? t('noBudgetsYet') : t('noResults') || 'No results found'}</p>
          </div>
        ) : (
          filteredBudgets.map((budget) => {
            const spent = spentByCategory[budget.categoryName] || 0;
            const percentage = getProgressPercentage(budget.categoryName, budget.amount);
            const progressColor = getProgressColor(percentage, budget.alertThreshold);

            return (
              <div key={budget.id} className={`budget-card ${isSelectionMode && selectedIds.has(budget.id!) ? 'selected' : ''}`} style={openMenuId === budget.id ? { zIndex: 9999 } : undefined}>
                {isSelectionMode && (
                    <div className="selection-checkbox-wrapper" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                        <input
                            type="checkbox"
                            checked={selectedIds.has(budget.id!)}
                            onChange={() => toggleSelection(budget.id!)}
                            className="multi-select-checkbox"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
                {editingId === budget.id ? (
                  <BudgetForm
                    initialData={{
                      categoryId: budget.categoryId,
                      categoryName: budget.categoryName,
                      amount: Math.round(budget.amount * 100),
                      period: budget.period,
                      startDate: budget.startDate,
                      alertThreshold: budget.alertThreshold,
                    }}
                    categories={categories}
                    onSubmit={(data) => {
                      const updates: Partial<Budget> = {};
                      if (budget.categoryId !== data.categoryId) {
                        updates.categoryId = data.categoryId;
                        updates.categoryName = data.categoryName;
                      }
                      const amountInDollars = data.amount / 100;
                      if (budget.amount !== amountInDollars) updates.amount = amountInDollars;
                      if (budget.period !== data.period) updates.period = data.period;
                      if (budget.startDate !== data.startDate) updates.startDate = data.startDate;
                      if (budget.alertThreshold !== data.alertThreshold) updates.alertThreshold = data.alertThreshold;

                      if (Object.keys(updates).length > 0) {
                        onUpdate(budget.id!, updates);
                      }
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    isEditing={true}
                  />
                ) : (
                  // View Mode
                  <>
                    {/* First row: Period and Amount */}
                    <div style={styles.budgetRow1}>
                      <span style={styles.budgetPeriod}>{t(`period${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}` as any)}</span>
                      <div style={styles.budgetAmount}>
                        <span style={{ ...styles.spent, color: progressColor }}>${spent.toFixed(2)}</span>
                        <span style={styles.separator}> / </span>
                        <span style={styles.total}>${budget.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Second row: Category name */}
                    <div style={styles.budgetRow2}>
                      <h4 style={styles.budgetCategory}>{budget.categoryName}</h4>
                    </div>

                    {/* Third row: Progress bar, percentage, and Hamburger */}
                    <div style={styles.budgetRow3}>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${percentage}%`,
                            backgroundColor: progressColor,
                          }}
                        />
                      </div>
                      <span style={styles.percentage}>{percentage.toFixed(1)}%</span>
                      
                      {/* Desktop: Show individual buttons */}
                      <div className="desktop-actions" style={{ gap: '8px' }}>
                        <button onClick={() => startInlineEdit(budget)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, budgetId: budget.id! })}
                          className="btn-icon btn-icon-danger"
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </div>

                      {/* Mobile: Show hamburger menu */}
                      <div className="mobile-actions">
                        <div style={styles.menuContainer}>
                          <button
                            className="menu-trigger-button"
                            onClick={() => setOpenMenuId(openMenuId === budget.id ? null : budget.id!)}
                            aria-label="More"
                          >
                            ⋮
                          </button>
                          {openMenuId === budget.id && (
                            <div style={styles.menu}>
                              <button
                                className="menu-item-hover"
                                style={styles.menuItem}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  startInlineEdit(budget);
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
                                  setDeleteConfirm({ isOpen: true, budgetId: budget.id! });
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
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('deleteBudget')}
        message={deleteConfirm.budgetId ? t('confirmDeleteBudget') : t('confirmDeleteSelected')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.budgetId) {
            onDelete(deleteConfirm.budgetId);
          } else if (isSelectionMode) {
             selectedIds.forEach(id => onDelete(id));
             clearSelection();
             setIsSelectionMode(false);
          }
          setDeleteConfirm({ isOpen: false, budgetId: null });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, budgetId: null })}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  form: {
    backgroundColor: 'var(--bg-secondary)',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    marginBottom: '12px',
    border: '1px solid var(--border-color)',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  formRow: {
    display: 'flex',
    gap: '15px',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: 'var(--text-secondary)',
  },
  budgetList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '12px',
    marginTop: '12px',
  },
  budgetRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  budgetRow2: {
    display: 'flex',
    alignItems: 'center',
  },
  budgetRow3: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  budgetCategory: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  budgetPeriod: {
    padding: '5px 10px',
    background: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    borderRadius: '16px',
    fontSize: '11px',
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
    boxShadow: '0 1px 3px var(--shadow)',
  },
  budgetAmount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    whiteSpace: 'nowrap' as const,
  },
  spent: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  separator: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  total: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: 'var(--border-color)',
    borderRadius: '3px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  percentage: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500' as const,
    minWidth: '45px',
    textAlign: 'right' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '8px',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: '8px',
    backgroundColor: 'rgba(244,63,94,0.12)',
    color: '#b91c1c',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    border: '1px solid var(--border-color)',
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
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
  },
};

export default BudgetManager;
