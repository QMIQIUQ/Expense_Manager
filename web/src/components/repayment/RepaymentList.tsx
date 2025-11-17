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

  const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.summary}>
          <span style={styles.summaryLabel}>{t('totalRepaid')}:</span>
          <span style={styles.summaryAmount}>${totalRepaid.toFixed(2)}</span>
        </div>
      </div>
      
      <div style={styles.list}>
        {repayments.map((repayment) => (
          <div key={repayment.id} style={styles.repaymentCard}>
            <div style={styles.repaymentHeader}>
              <div style={styles.repaymentInfo}>
                <span style={styles.amount}>${repayment.amount.toFixed(2)}</span>
                <span style={styles.date}>{formatDate(repayment.date)}</span>
              </div>
              <div style={styles.actions}>
                <button
                  onClick={() => onEdit(repayment)}
                  style={styles.editButton}
                  aria-label="Edit repayment"
                  title={t('edit')}
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => handleDeleteClick(repayment.id!)}
                  style={styles.deleteButton}
                  aria-label="Delete repayment"
                  title={t('delete')}
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
            
            {repayment.payerName && (
              <div style={styles.detail}>
                <span style={styles.detailLabel}>{t('paidBy')}:</span>
                <span style={styles.detailValue}>{repayment.payerName}</span>
              </div>
            )}
            
            {repayment.note && (
              <div style={styles.note}>{repayment.note}</div>
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
  header: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#666',
  },
  summaryAmount: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#4CAF50',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  repaymentCard: {
    padding: '12px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    transition: 'box-shadow 0.2s',
  } as React.CSSProperties,
  repaymentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  repaymentInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  amount: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#333',
  },
  date: {
    fontSize: '13px',
    color: '#666',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#2196F3',
    fontSize: '16px',
    transition: 'color 0.2s',
  } as React.CSSProperties,
  deleteButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#f44336',
    fontSize: '16px',
    transition: 'color 0.2s',
  } as React.CSSProperties,
  detail: {
    display: 'flex',
    gap: '6px',
    fontSize: '13px',
    marginBottom: '4px',
  },
  detailLabel: {
    color: '#666',
    fontWeight: '500' as const,
  },
  detailValue: {
    color: '#333',
  },
  note: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic' as const,
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#999',
  },
};

export default RepaymentList;
