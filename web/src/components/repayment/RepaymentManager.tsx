import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Expense, Repayment } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { repaymentService } from '../../services/repaymentService';
import { incomeService } from '../../services/incomeService';
import RepaymentForm from './RepaymentForm';
import RepaymentList from './RepaymentList';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface RepaymentManagerProps {
  expense: Expense;
  onClose?: () => void;
  inline?: boolean;
  onRepaymentChange?: () => void; // Callback to notify parent of changes
}

const RepaymentManager: React.FC<RepaymentManagerProps> = ({ expense, onClose, inline = false, onRepaymentChange }) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { showNotification, updateNotification } = useNotification();
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRepayment, setEditingRepayment] = useState<Repayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const notifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced notification to parent
  const notifyParentDebounced = useCallback(() => {
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
    }
    notifyTimeoutRef.current = setTimeout(() => {
      if (onRepaymentChange) {
        onRepaymentChange();
      }
    }, 500); // Wait 500ms after last change before notifying parent
  }, [onRepaymentChange]);

  useEffect(() => {
    loadRepayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }
    };
  }, []);

  const loadRepayments = async () => {
    if (!currentUser || !expense.id) return;
    try {
      setLoading(true);
      const data = await repaymentService.getByExpenseId(currentUser.uid, expense.id);
      setRepayments(data);
    } catch (error) {
      console.error('Failed to load repayments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepayment = async (repaymentData: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>) => {
    if (!currentUser || !expense.id) return;
    
    // Optimistic update: immediately add to local state
    const tempId = `temp-${Date.now()}`;
    const optimisticRepayment: Repayment = {
      ...repaymentData,
      id: tempId,
      userId: currentUser.uid,
      expenseId: expense.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setRepayments(prev => [...prev, optimisticRepayment]);
    setShowForm(false);
    
    // Show pending notification
    const notificationId = showNotification('pending', t('saving'), { duration: 0, id: `add-${tempId}` });
    
    try {
      setSaving(true);
      // Perform actual database operation in background
      const newRepaymentId = await repaymentService.create({
        ...repaymentData,
        userId: currentUser.uid,
        expenseId: expense.id,
      });

      // Replace temp repayment with real one
      setRepayments(prev => prev.map(r => 
        r.id === tempId ? { ...optimisticRepayment, id: newRepaymentId } : r
      ));

      // Update notification to success
      updateNotification(notificationId, { type: 'success', message: t('repaymentAdded'), duration: 3000 });

      // Handle excess income logic asynchronously
      const totalRepaid = [...repayments, optimisticRepayment].reduce((sum, r) => sum + r.amount, 0);
      
      if (totalRepaid > expense.amount) {
        const linkedIncomes = await incomeService.getByExpenseId(currentUser.uid, expense.id);
        const existingExcessIncome = linkedIncomes.find(inc => inc.type === 'repayment');
        const excessAmount = totalRepaid - expense.amount;
        
        if (existingExcessIncome) {
          await incomeService.update(existingExcessIncome.id!, { amount: excessAmount });
        } else {
          await incomeService.create({
            userId: currentUser.uid,
            amount: excessAmount,
            date: repaymentData.date,
            type: 'repayment',
            linkedExpenseId: expense.id,
            title: `Excess repayment for ${expense.description}`,
            note: `Automatically created from excess repayment`,
          });
          showNotification('info', t('excessConvertedToIncome'));
        }
      }

      // Notify parent to refresh data (debounced)
      notifyParentDebounced();
    } catch (error) {
      console.error('Failed to add repayment:', error);
      // Rollback optimistic update on error
      setRepayments(prev => prev.filter(r => r.id !== tempId));
      // Update notification to error
      updateNotification(notificationId, { type: 'error', message: t('errorSavingData'), duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRepayment = async (repaymentData: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>) => {
    if (!currentUser || !editingRepayment?.id || !expense.id) return;
    
    // Store original for rollback
    const originalRepayment = editingRepayment;
    const repaymentId = editingRepayment.id;
    
    // Optimistic update: immediately update in local state
    setRepayments(prev => prev.map(r => 
      r.id === editingRepayment.id 
        ? { ...r, ...repaymentData, updatedAt: new Date() }
        : r
    ));
    setShowForm(false);
    setEditingRepayment(null);
    
    // Show pending notification
    const notificationId = showNotification('pending', t('saving'), { duration: 0, id: `update-${repaymentId}` });
    
    try {
      setSaving(true);
      // Perform actual database operation in background
      await repaymentService.update(repaymentId, repaymentData);

      // Update notification to success
      updateNotification(notificationId, { type: 'success', message: t('repaymentUpdated'), duration: 3000 });

      // Handle excess income logic asynchronously
      const totalRepaid = repayments
        .map(r => r.id === editingRepayment.id ? { ...r, ...repaymentData } : r)
        .reduce((sum, r) => sum + r.amount, 0);
      
      if (totalRepaid > expense.amount) {
        const linkedIncomes = await incomeService.getByExpenseId(currentUser.uid, expense.id);
        const existingExcessIncome = linkedIncomes.find(inc => inc.type === 'repayment');
        const excessAmount = totalRepaid - expense.amount;
        
        if (existingExcessIncome) {
          await incomeService.update(existingExcessIncome.id!, { amount: excessAmount });
        } else {
          await incomeService.create({
            userId: currentUser.uid,
            amount: excessAmount,
            date: repaymentData.date,
            type: 'repayment',
            linkedExpenseId: expense.id,
            title: `Excess repayment for ${expense.description}`,
            note: `Automatically created from excess repayment`,
          });
          showNotification('info', t('excessConvertedToIncome'));
        }
      } else {
        const linkedIncomes = await incomeService.getByExpenseId(currentUser.uid, expense.id);
        const existingExcessIncome = linkedIncomes.find(inc => inc.type === 'repayment');
        if (existingExcessIncome) {
          await incomeService.delete(existingExcessIncome.id!);
        }
      }

      // Notify parent to refresh data
      notifyParentDebounced();
    } catch (error) {
      console.error('Failed to update repayment:', error);
      // Rollback optimistic update on error
      setRepayments(prev => prev.map(r => 
        r.id === originalRepayment.id ? originalRepayment : r
      ));
      // Update notification to error
      updateNotification(notificationId, { type: 'error', message: t('errorSavingData'), duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRepayment = async (id: string) => {
    if (!currentUser || !expense.id) return;
    
    // Store original for rollback
    const deletedRepayment = repayments.find(r => r.id === id);
    if (!deletedRepayment) return;
    
    // Optimistic update: immediately remove from local state
    setRepayments(prev => prev.filter(r => r.id !== id));
    
    // Show pending notification
    const notificationId = showNotification('pending', t('deleting'), { duration: 0, id: `delete-${id}` });
    
    try {
      // Perform actual database operation in background
      await repaymentService.delete(id);
      
      // Update notification to success
      updateNotification(notificationId, { type: 'success', message: t('repaymentDeleted'), duration: 3000 });
      
      // Handle excess income logic asynchronously
      const totalRepaid = repayments
        .filter(r => r.id !== id)
        .reduce((sum, r) => sum + r.amount, 0);
      
      const linkedIncomes = await incomeService.getByExpenseId(currentUser.uid, expense.id);
      for (const income of linkedIncomes) {
        if (income.type === 'repayment') {
          if (totalRepaid <= expense.amount) {
            await incomeService.delete(income.id!);
          } else {
            const newExcessAmount = totalRepaid - expense.amount;
            await incomeService.update(income.id!, { amount: newExcessAmount });
          }
        }
      }
      
      // Notify parent to refresh data
      notifyParentDebounced();
    } catch (error) {
      console.error('Failed to delete repayment:', error);
      // Rollback optimistic update on error
      setRepayments(prev => [...prev, deletedRepayment]);
      // Update notification to error
      updateNotification(notificationId, { type: 'error', message: t('errorDeletingData'), duration: 5000 });
    }
  };

  const handleEditRepayment = (repayment: Repayment) => {
    setEditingRepayment(repayment);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingRepayment(null);
  };

  const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
  const remainingAmount = expense.amount - totalRepaid;
  const isFullyRepaid = remainingAmount <= 0;
  const hasExcess = remainingAmount < 0;

  return (
    <div style={inline ? styles.inlineContainer : styles.container}>
      {!inline && (
        <div style={styles.header}>
          <h3 style={styles.title}>{t('repayments')}</h3>
          {onClose && (
            <button onClick={onClose} style={styles.closeButton} aria-label="Close">
              ✕
            </button>
          )}
        </div>
      )}

      {inline && (
        <div style={styles.inlineHeader}>
          <h4 style={styles.inlineTitle}>{t('repaymentHistory')}</h4>
          {onClose && (
            <button onClick={onClose} style={styles.inlineCloseButton} aria-label="Close">
              ✕
            </button>
          )}
        </div>
      )}

      <div style={inline ? styles.inlineExpenseInfo : styles.expenseInfo}>
        <div style={styles.expenseDetail}>
          <span style={styles.label}>{t('originalExpenseAmount')}:</span>
          <span style={styles.value}>${expense.amount.toFixed(2)}</span>
        </div>
        <div style={styles.expenseDetail}>
          <span style={styles.label}>{t('totalRepaid')}:</span>
          <span style={{ ...styles.value, color: '#4CAF50', fontWeight: '600' }}>
            ${totalRepaid.toFixed(2)}
          </span>
        </div>
        <div style={styles.expenseDetail}>
          <span style={styles.label}>
            {hasExcess ? t('excessAmount') : t('remainingAmount')}:
          </span>
          <span 
            style={{ 
              ...styles.value, 
              color: hasExcess ? '#2196F3' : (isFullyRepaid ? '#4CAF50' : '#ff9800'),
              fontWeight: '600' 
            }}
          >
            ${Math.abs(remainingAmount).toFixed(2)}
          </span>
        </div>
        {isFullyRepaid && !hasExcess && (
          <div style={styles.statusBadge}>
            ✓ {t('fullyRepaid')}
          </div>
        )}
      </div>

      {!showForm && (
        <button 
          onClick={() => setShowForm(true)} 
          style={styles.addButton}
          disabled={saving}
        >
          + {t('addRepayment')}
        </button>
      )}

      {showForm && (
        <div style={styles.formContainer}>
          <h4 style={styles.formTitle}>
            {editingRepayment ? t('editRepayment') : t('addRepayment')}
          </h4>
          <RepaymentForm
            expenseId={expense.id!}
            onSubmit={editingRepayment ? handleUpdateRepayment : handleAddRepayment}
            onCancel={handleCancelForm}
            initialData={editingRepayment || undefined}
          />
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>{t('loading')}</div>
      ) : (
        <RepaymentList
          repayments={repayments}
          onDelete={handleDeleteRepayment}
          onEdit={handleEditRepayment}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  inlineContainer: {
    backgroundColor: 'transparent',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e0e0e0',
  },
  inlineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#333',
  },
  inlineTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#333',
  },
  closeButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    color: '#666',
    transition: 'color 0.2s',
  } as React.CSSProperties,
  inlineCloseButton: {
    padding: '2px 6px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#666',
    transition: 'color 0.2s',
  } as React.CSSProperties,
  expenseInfo: {
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  inlineExpenseInfo: {
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    marginBottom: '12px',
    border: '1px solid #e0e0e0',
  },
  expenseDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500' as const,
  },
  value: {
    fontSize: '14px',
    color: '#333',
  },
  statusBadge: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    borderRadius: '4px',
    textAlign: 'center' as const,
    fontWeight: '600' as const,
    fontSize: '14px',
  },
  addButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  formContainer: {
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  formTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#333',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#999',
  },
};

export default RepaymentManager;
