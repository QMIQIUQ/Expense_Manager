import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Expense, Repayment, Card, EWallet } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { repaymentService } from '../../services/repaymentService';
import { incomeService } from '../../services/incomeService';
import RepaymentForm from './RepaymentForm';
import RepaymentList from './RepaymentList';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { PlusIcon } from '../icons';

interface RepaymentManagerProps {
  expense: Expense;
  onClose?: () => void;
  inline?: boolean;
  onRepaymentChange?: () => void; // Callback to notify parent of changes
  cards?: Card[];
  ewallets?: EWallet[];
}

const RepaymentManager: React.FC<RepaymentManagerProps> = ({ expense, onClose, inline = false, onRepaymentChange, cards = [], ewallets = [] }) => {
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

  const handleInlineUpdate = async (id: string, updates: Partial<Repayment>) => {
    if (!currentUser || !expense.id) return;
    
    // Store original for rollback
    const originalRepayment = repayments.find(r => r.id === id);
    if (!originalRepayment) return;
    
    // Optimistic update: immediately update in local state
    setRepayments(prev => prev.map(r => 
      r.id === id 
        ? { ...r, ...updates, updatedAt: new Date() }
        : r
    ));
    
    // Show pending notification
    const notificationId = showNotification('pending', t('saving'), { duration: 0, id: `update-${id}` });
    
    try {
      setSaving(true);
      // Perform actual database operation in background
      await repaymentService.update(id, updates);

      // Update notification to success
      updateNotification(notificationId, { type: 'success', message: t('repaymentUpdated'), duration: 3000 });

      // Handle excess income logic asynchronously
      const updatedRepayments = repayments.map(r => r.id === id ? { ...r, ...updates } : r);
      const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
      
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
            date: updates.date || originalRepayment.date,
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
        r.id === id ? originalRepayment : r
      ));
      // Update notification to error
      updateNotification(notificationId, { type: 'error', message: t('errorSavingData'), duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingRepayment(null);
  };

  const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
  const remainingAmount = expense.amount - totalRepaid;
  const isFullyRepaid = remainingAmount <= 0;
  const hasExcess = remainingAmount < 0;

  // Inline layout styles (for embedded history panel inside an expense card)
  const styles = {
    inlineContainer: {
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '16px',
      background: 'var(--card-bg)',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '14px',
      boxShadow: '0 2px 6px var(--shadow)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: '4px',
      borderBottom: '1px solid var(--border-color)',
    },
    headerTitle: {
      margin: 0,
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '0.5px',
      color: 'var(--text-primary)',
    },
    summaryCard: {
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '12px 14px',
      background: 'var(--bg-tertiary)',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
    },
    summaryRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.85rem',
      color: 'var(--text-secondary)',
    },
    summaryValue: {
      fontWeight: 600,
      fontSize: '0.9rem',
      color: 'var(--text-primary)',
    },
    successValue: {
      fontWeight: 600,
      fontSize: '0.9rem',
      color: 'var(--success-text)',
    },
    warningValue: {
      fontWeight: 600,
      fontSize: '0.9rem',
      color: 'var(--warning-text)',
    },
    infoValue: {
      fontWeight: 600,
      fontSize: '0.9rem',
      color: 'var(--info-text)',
    },
    statusBadge: {
      marginTop: '4px',
      alignSelf: 'flex-start',
      padding: '4px 10px',
      background: 'var(--success-bg)',
      color: 'var(--success-text)',
      fontSize: '12px',
      fontWeight: 600,
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    addButton: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      backgroundColor: 'var(--accent-light)',
      color: 'var(--accent-primary)',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '1rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as React.CSSProperties,
    addButtonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  };

  return (
    <div className={inline ? undefined : 'card repayment-manager'} style={inline ? styles.inlineContainer : undefined}>
      {!inline && (
        <div className="card-header">
          <h3 className="card-title">{t('repayments')}</h3>
          {onClose && (
            <button onClick={onClose} className="btn-close" aria-label="Close">✕</button>
          )}
        </div>
      )}

      {inline && (
        <div style={styles.header}>
          <h4 style={styles.headerTitle}>{t('repaymentHistory')}</h4>
          {onClose && (
            <button onClick={onClose} className="btn-close-small" aria-label="Close">✕</button>
          )}
        </div>
      )}

      <div style={inline ? styles.summaryCard : undefined} className={inline ? undefined : 'expense-info'}>
        <div style={styles.summaryRow}>
          <span>{t('originalExpenseAmount')}</span>
          <span style={styles.summaryValue}>${expense.amount.toFixed(2)}</span>
        </div>
        <div style={styles.summaryRow}>
          <span>{t('totalRepaid')}</span>
          <span style={styles.successValue}>${totalRepaid.toFixed(2)}</span>
        </div>
        <div style={styles.summaryRow}>
          <span>{hasExcess ? t('excessAmount') : t('remainingAmount')}</span>
          <span style={hasExcess ? styles.infoValue : (isFullyRepaid ? styles.successValue : styles.warningValue)}>
            ${Math.abs(remainingAmount).toFixed(2)}
          </span>
        </div>
        {isFullyRepaid && !hasExcess && (
          <div style={styles.statusBadge}>✓ {t('fullyRepaid')}</div>
        )}
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-3 rounded-lg text-base font-medium transition-colors"
          style={{ ...styles.addButton, ...(saving ? styles.addButtonDisabled : {}) }}
          disabled={saving}
        >
          <PlusIcon size={18} />
          <span>{t('addRepayment')}</span>
        </button>
      )}

      {showForm && (
        <div className="form-container">
          <h4 className="form-title">
            {editingRepayment ? t('editRepayment') : t('addRepayment')}
          </h4>
          <RepaymentForm
            expenseId={expense.id!}
            onSubmit={editingRepayment ? handleUpdateRepayment : handleAddRepayment}
            onCancel={handleCancelForm}
            initialData={editingRepayment || undefined}
            cards={cards}
            ewallets={ewallets}
          />
        </div>
      )}

      {loading ? (
        <div className="loading-state">{t('loading')}</div>
      ) : (
        <RepaymentList
          repayments={repayments}
          onDelete={handleDeleteRepayment}
          onEdit={handleEditRepayment}
          onUpdate={handleInlineUpdate}
          cards={cards}
          ewallets={ewallets}
          maxAmount={expense.amount}
        />
      )}
    </div>
  );
};

export default RepaymentManager;
