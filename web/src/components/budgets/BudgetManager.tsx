import React, { useState, useEffect } from 'react';
import { Budget, Category } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';

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
  const [formData, setFormData] = useState({
    categoryId: '',
    categoryName: '',
    amount: 0, // stored in cents
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    alertThreshold: 80,
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
    if (!selectedCategory) return;

    const budgetData = {
      ...formData,
      amount: formData.amount / 100, // Convert from cents to dollars
      categoryName: selectedCategory.name,
    };

    onAdd(budgetData);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      categoryId: '',
      categoryName: '',
      amount: 0,
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      alertThreshold: 80,
    });
  };

  const startInlineEdit = (budget: Budget) => {
    const category = categories.find((cat) => cat.name === budget.categoryName);
    setEditingId(budget.id!);
    setFormData({
      categoryId: category?.id || '',
      categoryName: budget.categoryName,
      amount: Math.round(budget.amount * 100), // Convert from dollars to cents
      period: budget.period,
      startDate: budget.startDate,
      alertThreshold: budget.alertThreshold,
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const saveInlineEdit = (budget: Budget) => {
    const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
    if (!selectedCategory) return;

    const updates: Partial<Budget> = {};
    if (budget.categoryId !== formData.categoryId) {
      updates.categoryId = formData.categoryId;
      updates.categoryName = selectedCategory.name;
    }
    const amountInDollars = formData.amount / 100;
    if (budget.amount !== amountInDollars) updates.amount = amountInDollars;
    if (budget.period !== formData.period) updates.period = formData.period;
    if (budget.startDate !== formData.startDate) updates.startDate = formData.startDate;
    if (budget.alertThreshold !== formData.alertThreshold) updates.alertThreshold = formData.alertThreshold;

    if (Object.keys(updates).length > 0) {
      onUpdate(budget.id!, updates);
    }
    cancelInlineEdit();
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('category')} *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">{t('selectCategory')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('amount')} *</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  placeholder="2000"
                  step="1"
                  min="0"
                  required
                  className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)'
                  }}
                />
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {formData.amount > 0 ? `= $${(formData.amount / 100).toFixed(2)}` : 'Enter amount in cents (e.g., 2000 = $20.00)'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('budgetPeriod')} *</label>
              <select
                value={formData.period}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    period: e.target.value as 'monthly' | 'weekly' | 'yearly',
                  })
                }
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="weekly">{t('periodWeekly')}</option>
                <option value="monthly">{t('periodMonthly')}</option>
                <option value="yearly">{t('periodYearly')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('alertAt')} (%) *</label>
              <input
                type="number"
                value={formData.alertThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, alertThreshold: parseInt(e.target.value) || 0 })
                }
                onFocus={(e) => e.target.select()}
                min="1"
                max="100"
                required
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button 
              type="submit" 
              className="flex-1 px-4 py-3 rounded-lg text-base font-medium transition-colors"
              style={{
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
            >
              {editingId ? t('updateBudget') : t('setBudgetButton')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                resetForm();
              }}
              className="px-6 py-3 rounded-lg text-base font-medium transition-colors"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder={t('searchByName') || 'Search by category name...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={(e) => e.target.select()}
          style={styles.searchInput}
        />
      </div>

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
              <div key={budget.id} className="budget-card" style={openMenuId === budget.id ? { zIndex: 9999 } : undefined}>
                {editingId === budget.id ? (
                  // Inline Edit Mode
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                      <div style={{ flex: 2, minWidth: '150px' }}>
                        <label className="form-label">{t('category')}</label>
                        <select
                          value={formData.categoryId}
                          onChange={(e) => {
                            const cat = categories.find((c) => c.id === e.target.value);
                            setFormData({ ...formData, categoryId: e.target.value, categoryName: cat?.name || '' });
                          }}
                          className="form-select"
                        >
                          <option value="">{t('selectCategory')}</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: '140px' }}>
                        <label className="form-label">{t('amount')}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          placeholder={t('amount')}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                      <div style={{ minWidth: '120px' }}>
                        <label className="form-label">{t('budgetPeriod')}</label>
                        <select
                          value={formData.period}
                          onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' | 'weekly' | 'yearly' })}
                          className="form-select"
                        >
                          <option value="weekly">{t('periodWeekly')}</option>
                          <option value="monthly">{t('periodMonthly')}</option>
                          <option value="yearly">{t('periodYearly')}</option>
                        </select>
                      </div>
                      <div style={{ minWidth: '140px' }}>
                        <label className="form-label">{t('startDate')}</label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div style={{ minWidth: '100px' }}>
                        <label className="form-label">{t('alertAt')}</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.alertThreshold}
                          placeholder={t('alertAt')}
                          onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => saveInlineEdit(budget)} className="btn btn-primary" aria-label={t('save')}>
                        {t('save')}
                      </button>
                      <button onClick={cancelInlineEdit} className="btn btn-secondary" aria-label={t('cancel')}>
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    {/* First row: Period and Amount */}
                    <div style={styles.budgetRow1}>
                      <span style={styles.budgetPeriod}>{t(`period${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}` as any)}</span>
                      <div style={styles.budgetAmount}>
                        <span style={styles.spent}>${spent.toFixed(2)}</span>
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
        message={t('confirmDeleteBudget')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.budgetId) {
            onDelete(deleteConfirm.budgetId);
          }
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
    gap: '20px',
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
    marginBottom: '20px',
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
    gap: '15px',
    marginTop: '20px',
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
