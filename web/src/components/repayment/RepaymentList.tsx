import React, { useState } from 'react';
import { Repayment, Card, EWallet, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DeleteIcon, EditIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';
import RepaymentForm from './RepaymentForm';

interface RepaymentListProps {
  repayments: Repayment[];
  onDelete: (id: string) => void;
  onEdit: (repayment: Repayment) => void;
  onUpdate?: (id: string, data: Partial<Repayment>) => void;
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[];
  maxAmount?: number;
}

const RepaymentList: React.FC<RepaymentListProps> = ({
  repayments,
  onDelete,
  onEdit: _onEdit,
  onUpdate,
  cards = [],
  ewallets: _ewallets = [],
  banks: _banks = [],
  maxAmount: _maxAmount,
}) => {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; repaymentId: string | null }>({
    isOpen: false,
    repaymentId: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, repaymentId: id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.repaymentId) {
      onDelete(deleteConfirm.repaymentId);
    }
    setDeleteConfirm({ isOpen: false, repaymentId: null });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, repaymentId: null });
  };

  const startInlineEdit = (repayment: Repayment) => {
    setEditingId(repayment.id!);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get theme-aware payment chip style
  const getPaymentChipStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.paymentChip,
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.25) 100%)',
        color: '#86efac',
        boxShadow: '0 1px 3px rgba(34, 197, 94, 0.2)',
      };
    }
    return styles.paymentChip;
  };

  // Get theme-aware amount style
  const getAmountStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.amount,
        color: '#86efac',
        textShadow: '0 1px 2px rgba(134, 239, 172, 0.2)',
      };
    }
    return styles.amount;
  };

  // Get theme-aware payer name style
  const getPayerNameStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.payerName,
        color: 'var(--text-primary)',
      } as React.CSSProperties;
    }
    return styles.payerName as React.CSSProperties;
  };

  // Get theme-aware date style
  const getDateStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.date,
        color: 'var(--text-secondary)',
      } as React.CSSProperties;
    }
    return styles.date as React.CSSProperties;
  };

  // Get theme-aware note text style
  const getNoteStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.noteText,
        color: 'var(--text-secondary)',
      } as React.CSSProperties;
    }
    return styles.noteText as React.CSSProperties;
  };

  if (repayments.length === 0) {
    return (
      <div style={styles.noData}>
        <p>{t('noRepaymentsYet')}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {repayments.map((repayment) => (
          <div key={repayment.id} className="repayment-card" style={styles.repaymentCard}>
            {editingId === repayment.id ? (
              <RepaymentForm
                expenseId={repayment.expenseId}
                initialData={repayment}
                cards={cards}
                ewallets={_ewallets}
                banks={_banks}
                onSubmit={(data) => {
                  if (onUpdate && repayment.id) {
                    onUpdate(repayment.id, data);
                  }
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />


            ) : (
              <>
                {/* First row: Date, Payment Method Chip, Amount */}
                <div style={styles.repaymentRow1}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={getDateStyle()}>{formatDate(repayment.date)}</span>
                    {/* Payment Method Chip */}
                    <span style={getPaymentChipStyle()}>
                      {repayment.paymentMethod === 'credit_card' && `💳 ${t('creditCard')}`}
                      {repayment.paymentMethod === 'e_wallet' && `📱 ${repayment.paymentMethodName || t('eWallet')}`}
                      {(!repayment.paymentMethod || repayment.paymentMethod === 'cash') && `💵 ${t('cash')}`}
                    </span>
                  </div>
                  <div style={getAmountStyle()}>${repayment.amount.toFixed(2)}</div>
                </div>

                {/* Second row: Payer Name */}
                {repayment.payerName && (
                  <div style={styles.repaymentRow2}>
                    <span style={getPayerNameStyle()}>{repayment.payerName}</span>
                  </div>
                )}

                {/* Third row: Note, Edit, Delete */}
                <div style={styles.repaymentRow3}>
                  <div style={{ flex: 1 }}>
                    {repayment.note && (
                      <span style={getNoteStyle()}>{repayment.note}</span>
                    )}
                  </div>
                  <div style={styles.actions}>
                    <button
                      onClick={() => startInlineEdit(repayment)}
                      className="btn-icon btn-icon-primary"
                      aria-label="Edit repayment"
                      title={t('edit')}
                    >
                      <EditIcon size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(repayment.id!)}
                      className="btn-icon btn-icon-danger"
                      aria-label="Delete repayment"
                      title={t('delete')}
                    >
                      <DeleteIcon size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('delete') + ' ' + t('repayments')}
        message={t('confirmDeleteRepayment')}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
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
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  repaymentCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    boxShadow: '0 2px 8px var(--shadow)',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  repaymentRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  repaymentRow2: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '2px',
  },
  repaymentRow3: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  paymentChip: {
    padding: '4px 10px',
    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#15803d',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600' as const,
    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.15)',
  },
  amount: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#16a34a',
    whiteSpace: 'nowrap' as const,
    textShadow: '0 1px 2px rgba(22, 163, 74, 0.1)',
  },
  date: {
    fontSize: '0.9rem',
    color: '#666',
  },
  payerName: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#333',
  },
  noteText: {
    fontSize: '0.9rem',
    color: '#666',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#999',
  },
};

export default RepaymentList;
