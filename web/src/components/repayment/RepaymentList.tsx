import React, { useState } from 'react';
import { Repayment } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { DeleteIcon, EditIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';

interface RepaymentListProps {
  repayments: Repayment[];
  onDelete: (id: string) => void;
  onEdit: (repayment: Repayment) => void;
}

const RepaymentList: React.FC<RepaymentListProps> = ({
  repayments,
  onDelete,
  onEdit,
}) => {
  const { t } = useLanguage();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; repaymentId: string | null }>({
    isOpen: false,
    repaymentId: null,
  });

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
          <div key={repayment.id} style={styles.repaymentCard}>
            {/* First row: Date, Payment Method Chip, Amount */}
            <div style={styles.repaymentRow1}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={styles.date}>{formatDate(repayment.date)}</span>
                {/* Payment Method Chip */}
                <span style={styles.paymentChip}>
                  {repayment.paymentMethod === 'credit_card' && `💳 ${t('creditCard')}`}
                  {repayment.paymentMethod === 'e_wallet' && `📱 ${repayment.paymentMethodName || t('eWallet')}`}
                  {(!repayment.paymentMethod || repayment.paymentMethod === 'cash') && `💵 ${t('cash')}`}
                </span>
              </div>
              <div style={styles.amount}>${repayment.amount.toFixed(2)}</div>
            </div>

            {/* Second row: Payer Name */}
            {repayment.payerName && (
              <div style={styles.repaymentRow2}>
                <span style={styles.payerName}>{repayment.payerName}</span>
              </div>
            )}

            {/* Third row: Note, Edit, Delete */}
            <div style={styles.repaymentRow3}>
              <div style={{ flex: 1 }}>
                {repayment.note && (
                  <span style={styles.noteText}>{repayment.note}</span>
                )}
              </div>
              <div style={styles.actions}>
                <button
                  onClick={() => onEdit(repayment)}
                  style={{ ...styles.iconButton, ...styles.primaryChip }}
                  aria-label="Edit repayment"
                  title={t('edit')}
                >
                  <EditIcon size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(repayment.id!)}
                  style={{ ...styles.iconButton, ...styles.dangerChip }}
                  aria-label="Delete repayment"
                  title={t('delete')}
                >
                  <DeleteIcon size={18} />
                </button>
              </div>
            </div>
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
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
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
    alignItems: 'center',
    gap: '12px',
  },
  paymentChip: {
    padding: '2px 8px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500' as const,
  },
  amount: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#16a34a',
    whiteSpace: 'nowrap' as const,
  },
  date: {
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#333',
  },
  payerName: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#333',
  },
  noteText: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    padding: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  primaryChip: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
  },
  dangerChip: {
    backgroundColor: 'rgba(244,63,94,0.12)',
    color: '#b91c1c',
  },

  noData: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#999',
  },
};

export default RepaymentList;
