import React, { useState } from 'react';
import { Budget, Category } from '../../types';

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
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    categoryName: '',
    amount: 0,
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    alertThreshold: 80,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
    if (!selectedCategory) return;

    const budgetData = {
      ...formData,
      categoryName: selectedCategory.name,
    };

    if (editingId) {
      onUpdate(editingId, budgetData);
      setEditingId(null);
    } else {
      onAdd(budgetData);
      setIsAdding(false);
    }
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

  const handleEdit = (budget: Budget) => {
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
    setIsAdding(true);
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
        <h3 style={styles.title}>Budget Management</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            + Set Budget
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                style={styles.select}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Amount ($) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                step="0.01"
                min="0.01"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Period *</label>
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
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Alert at (%) *</label>
              <input
                type="number"
                value={formData.alertThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })
                }
                min="1"
                max="100"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitButton}>
              {editingId ? 'Update' : 'Set'} Budget
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
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={styles.budgetList}>
        {budgets.length === 0 ? (
          <div style={styles.noData}>
            <p>No budgets set yet. Create your first budget! 💰</p>
          </div>
        ) : (
          budgets.map((budget) => {
            const spent = spentByCategory[budget.categoryName] || 0;
            const percentage = getProgressPercentage(budget.categoryName, budget.amount);
            const progressColor = getProgressColor(percentage, budget.alertThreshold);

            return (
              <div key={budget.id} style={styles.budgetCard}>
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
                  <span style={styles.percentage}>{percentage.toFixed(1)}% used</span>
                  <div style={styles.actions}>
                    <button onClick={() => handleEdit(budget)} style={styles.editBtn}>
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this budget?')) {
                          onDelete(budget.id!);
                        }
                      }}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
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
    fontSize: '20px',
    fontWeight: '600' as const,
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
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
  },
  budgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetCategory: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600' as const,
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
    padding: '6px 12px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 12px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
};

export default BudgetManager;
