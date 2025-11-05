import React, { useState } from 'react';
import { RecurringExpense, Category } from '../../types';
import ConfirmModal from '../ConfirmModal';

interface RecurringExpenseManagerProps {
  recurringExpenses: RecurringExpense[];
  categories: Category[];
  onAdd: (expense: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<RecurringExpense>) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const RecurringExpenseManager: React.FC<RecurringExpenseManagerProps> = ({
  recurringExpenses,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onToggleActive,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    dayOfWeek: 1,
    dayOfMonth: 1,
    isActive: true,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; recurringId: string | null }>({
    isOpen: false,
    recurringId: null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expenseData = {
      ...formData,
      endDate: formData.endDate || undefined,
      lastGenerated: undefined,
    };

    if (editingId) {
      onUpdate(editingId, expenseData);
      setEditingId(null);
    } else {
      onAdd(expenseData);
      setIsAdding(false);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: 0,
      category: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dayOfWeek: 1,
      dayOfMonth: 1,
      isActive: true,
    });
  };

  const handleEdit = (expense: RecurringExpense) => {
    setEditingId(expense.id!);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      frequency: expense.frequency,
      startDate: expense.startDate,
      endDate: expense.endDate || '',
      dayOfWeek: expense.dayOfWeek || 1,
      dayOfMonth: expense.dayOfMonth || 1,
      isActive: expense.isActive,
    });
    setIsAdding(true);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Recurring Expenses</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            + Add Recurring
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Netflix Subscription, Rent"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formRow}>
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

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                style={styles.select}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Frequency *</label>
              <select
                value={formData.frequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly',
                  })
                }
                style={styles.select}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitButton}>
              {editingId ? 'Update' : 'Add'} Recurring Expense
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

      <div style={styles.expenseList}>
        {recurringExpenses.length === 0 ? (
          <div style={styles.noData}>
            <p>No recurring expenses set. Add your first one! 🔄</p>
          </div>
        ) : (
          recurringExpenses.map((expense) => (
            <div key={expense.id} style={styles.expenseCard}>
              <div style={styles.expenseMain}>
                <div style={styles.expenseInfo}>
                  <h4 style={styles.description}>{expense.description}</h4>
                  <span style={styles.category}>{expense.category}</span>
                  <span style={styles.frequency}>{expense.frequency}</span>
                </div>
                <div style={styles.expenseDetails}>
                  <div style={styles.amount}>${expense.amount.toFixed(2)}</div>
                  <div style={styles.status}>
                    {expense.isActive ? (
                      <span style={styles.activeStatus}>● Active</span>
                    ) : (
                      <span style={styles.inactiveStatus}>● Inactive</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={styles.actions}>
                <button
                  onClick={() => onToggleActive(expense.id!, !expense.isActive)}
                  style={expense.isActive ? styles.pauseBtn : styles.resumeBtn}
                >
                  {expense.isActive ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => handleEdit(expense)} style={styles.editBtn}>
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, recurringId: expense.id! })}
                  style={styles.deleteBtn}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Recurring Expense"
        message="Are you sure you want to delete this recurring expense?"
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.recurringId) {
            onDelete(deleteConfirm.recurringId);
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, recurringId: null })}
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
  expenseList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  expenseCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
  },
  expenseMain: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
  },
  expenseInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  description: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '500' as const,
    color: '#333',
  },
  category: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
    width: 'fit-content',
  },
  frequency: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f3e5f5',
    color: '#7b1fa2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
    width: 'fit-content',
    textTransform: 'capitalize' as const,
  },
  expenseDetails: {
    textAlign: 'right' as const,
  },
  amount: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#f44336',
    marginBottom: '4px',
  },
  status: {
    fontSize: '12px',
  },
  activeStatus: {
    color: '#4caf50',
    fontWeight: '500' as const,
  },
  inactiveStatus: {
    color: '#999',
    fontWeight: '500' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  pauseBtn: {
    padding: '8px 16px',
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  resumeBtn: {
    padding: '8px 16px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '8px 16px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default RecurringExpenseManager;
