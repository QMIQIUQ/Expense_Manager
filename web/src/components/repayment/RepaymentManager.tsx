import React, { useState, useEffect } from 'react';
import { Expense, Repayment } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { repaymentService } from '../../services/repaymentService';
import { incomeService } from '../../services/incomeService';
import RepaymentForm from './RepaymentForm';
import RepaymentList from './RepaymentList';
import { useAuth } from '../../contexts/AuthContext';

interface RepaymentManagerProps {
  expense: Expense;
  onClose?: () => void;
}

const RepaymentManager: React.FC<RepaymentManagerProps> = ({ expense, onClose }) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRepayment, setEditingRepayment] = useState<Repayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRepayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense.id]);

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
    
    try {
      setSaving(true);
      await repaymentService.create({
        ...repaymentData,
        userId: currentUser.uid,
        expenseId: expense.id,
      });

      // Check if total repayments exceed expense amount
      const updatedRepayments = await repaymentService.getByExpenseId(currentUser.uid, expense.id);
      const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
      
      if (totalRepaid > expense.amount) {
        // Create income for the excess amount
        const excessAmount = totalRepaid - expense.amount;
        await incomeService.create({
          userId: currentUser.uid,
          amount: excessAmount,
          date: repaymentData.date,
          type: 'repayment',
          linkedExpenseId: expense.id,
          title: `Excess repayment for ${expense.description}`,
          note: `Automatically created from excess repayment`,
        });
        alert(t('excessConvertedToIncome'));
      }

      await loadRepayments();
      setShowForm(false);
      alert(t('repaymentAdded'));
    } catch (error) {
      console.error('Failed to add repayment:', error);
      alert(t('errorSavingData'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRepayment = async (repaymentData: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>) => {
    if (!currentUser || !editingRepayment?.id || !expense.id) return;
    
    try {
      setSaving(true);
      await repaymentService.update(editingRepayment.id, repaymentData);

      // Check if total repayments exceed expense amount
      const updatedRepayments = await repaymentService.getByExpenseId(currentUser.uid, expense.id);
      const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
      
      if (totalRepaid > expense.amount) {
        // Create income for the excess amount
        const excessAmount = totalRepaid - expense.amount;
        await incomeService.create({
          userId: currentUser.uid,
          amount: excessAmount,
          date: repaymentData.date,
          type: 'repayment',
          linkedExpenseId: expense.id,
          title: `Excess repayment for ${expense.description}`,
          note: `Automatically created from excess repayment`,
        });
        alert(t('excessConvertedToIncome'));
      }

      await loadRepayments();
      setShowForm(false);
      setEditingRepayment(null);
      alert(t('repaymentUpdated'));
    } catch (error) {
      console.error('Failed to update repayment:', error);
      alert(t('errorSavingData'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRepayment = async (id: string) => {
    try {
      await repaymentService.delete(id);
      await loadRepayments();
      alert(t('repaymentDeleted'));
    } catch (error) {
      console.error('Failed to delete repayment:', error);
      alert(t('errorDeletingData'));
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
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t('repayments')}</h3>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <div style={styles.expenseInfo}>
        <div style={styles.expenseDetail}>
          <span style={styles.label}>{t('expense')}:</span>
          <span style={styles.value}>{expense.description}</span>
        </div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '20px',
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
  expenseInfo: {
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    marginBottom: '16px',
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
