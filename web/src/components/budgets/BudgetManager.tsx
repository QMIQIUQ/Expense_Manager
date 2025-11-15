import React, { useState } from 'react';
import { Budget, Category } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '../icons';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    categoryId: '',
    categoryName: '',
    amount: 0,
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    alertThreshold: 80,
  });
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
      amount: budget.amount,
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
    if (budget.amount !== formData.amount) updates.amount = formData.amount;
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
    if (percentage >= 100) return '#f44336';
    if (percentage >= threshold) return '#ff9800';
    return '#4caf50';
  };

  return (
    <div style={styles.container}>
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
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('category')} *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                style={styles.select}
              >
                <option value="">{t('selectCategory')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('amount')} ($) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                onFocus={(e) => e.target.select()}
                step="0.01"
                min="0.01"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('budgetPeriod')} *</label>
              <select
                value={formData.period}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    period: e.target.value as 'monthly' | 'weekly' | 'yearly',
                  })
                }
                style={styles.select}
              >
                <option value="weekly">{t('periodWeekly')}</option>
                <option value="monthly">{t('periodMonthly')}</option>
                <option value="yearly">{t('periodYearly')}</option>
              </select>
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('alertAt')} *</label>
              <input
                type="number"
                value={formData.alertThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })
                }
                onFocus={(e) => e.target.select()}
                min="1"
                max="100"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitButton}>
              {editingId ? t('updateBudget') : t('setBudgetButton')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                resetForm();
              }}
              style={styles.cancelButton}
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
              <div key={budget.id} style={styles.budgetCard}>
                {editingId === budget.id ? (
                  // Inline Edit Mode
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => {
                          const cat = categories.find((c) => c.id === e.target.value);
                          setFormData({ ...formData, categoryId: e.target.value, categoryName: cat?.name || '' });
                        }}
                        style={{ ...styles.inlineSelect, flex: 2, minWidth: '150px' }}
                      >
                        <option value="">{t('selectCategory')}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        placeholder={t('amount')}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        style={{ ...styles.inlineInput, width: '140px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                      <select
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' | 'weekly' | 'yearly' })}
                        style={{ ...styles.inlineSelect, minWidth: '120px' }}
                      >
                        <option value="weekly">{t('periodWeekly')}</option>
                        <option value="monthly">{t('periodMonthly')}</option>
                        <option value="yearly">{t('periodYearly')}</option>
                      </select>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        style={{ ...styles.inlineInput, minWidth: '140px' }}
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.alertThreshold}
                        placeholder={t('alertAt')}
                        onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        style={{ ...styles.inlineInput, width: '100px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => saveInlineEdit(budget)} style={styles.saveButton} aria-label={t('save')}>
                        <CheckIcon size={18} />
                      </button>
                      <button onClick={cancelInlineEdit} style={styles.cancelIconButton} aria-label={t('cancel')}>
                        <CloseIcon size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div style={styles.budgetHeader}>
                      <h4 style={styles.budgetCategory}>{budget.categoryName}</h4>
                      <span style={styles.budgetPeriod}>{budget.period}</span>
                    </div>

                    <div style={styles.budgetAmount}>
                      <span style={styles.spent}>${spent.toFixed(2)}</span>
                      <span style={styles.separator}>/</span>
                      <span style={styles.total}>${budget.amount.toFixed(2)}</span>
                    </div>

                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${percentage}%`,
                          backgroundColor: progressColor,
                        }}
                      />
                    </div>

                    <div style={styles.budgetFooter}>
                      <span style={styles.percentage}>{percentage.toFixed(1)}% {t('used')}</span>
                      <div style={styles.actions}>
                        <button onClick={() => startInlineEdit(budget)} style={styles.editBtn} aria-label={t('edit')}>
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, budgetId: budget.id! })}
                          style={styles.deleteBtn}
                        >
                          <DeleteIcon size={18} />
                        </button>
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
    fontWeight: '600' as const,
    cursor: 'pointer',
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
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
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
  label: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#333',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  select: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  submitButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666',
  },
  budgetList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px',
  },
  budgetCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    minWidth: 0,
    overflow: 'hidden',
  },
  budgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 0,
    gap: '10px',
  },
  budgetCategory: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
    minWidth: 0,
  },
  budgetPeriod: {
    padding: '4px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  budgetAmount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '5px',
  },
  spent: {
    fontSize: '24px',
    fontWeight: '600' as const,
    color: '#333',
  },
  separator: {
    fontSize: '20px',
    color: '#999',
  },
  total: {
    fontSize: '18px',
    color: '#666',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  budgetFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentage: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500' as const,
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
  inlineInput: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  inlineSelect: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  saveButton: {
    padding: '8px',
    backgroundColor: 'rgba(34,197,94,0.15)',
    color: '#16a34a',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIconButton: {
    padding: '8px',
    backgroundColor: 'rgba(148,163,184,0.2)',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default BudgetManager;
