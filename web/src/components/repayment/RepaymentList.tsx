import React, { useState } from 'react';
import { Repayment, Card, EWallet, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDateWithUserFormat } from '../../utils/dateUtils';
import { DeleteIcon, EditIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';

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
  onEdit,
  onUpdate: _onUpdate,
  cards: _cards = [],
  ewallets: _ewallets = [],
  banks: _banks = [],
  maxAmount: _maxAmount,
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const { effectiveTheme } = useTheme();
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

  // Inline editing is handled by parent via pop-out.

  const formatDate = (dateString: string) => {
    return formatDateWithUserFormat(dateString, dateFormat);
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
            <div style={styles.repaymentContent}>
              {/* Left section: Main info */}
              <div style={styles.leftSection}>
                {/* Row 1: Payer Name (if exists) or Payment Method */}
                <div style={styles.headerRow}>
                  {repayment.payerName ? (
                    <span style={getPayerNameStyle()}>{repayment.payerName}</span>
                  ) : (
                    <span style={getPaymentChipStyle()}>
                      {repayment.paymentMethod === 'credit_card' && `💳 ${t('creditCard')}`}
                      {repayment.paymentMethod === 'e_wallet' && `📱 ${repayment.paymentMethodName || t('eWallet')}`}
                      {(!repayment.paymentMethod || repayment.paymentMethod === 'cash') && `💵 ${t('cash')}`}
                    </span>
                  )}
                </div>

                {/* Row 2: Date and Payment Method (if payer exists) */}
                <div style={styles.metaRow}>
                  <span style={getDateStyle()}>{formatDate(repayment.date)}</span>
                  {repayment.payerName && (
                    <span style={{ ...getPaymentChipStyle(), fontSize: '11px', padding: '2px 8px' }}>
                      {repayment.paymentMethod === 'credit_card' && `💳 ${t('creditCard')}`}
                      {repayment.paymentMethod === 'e_wallet' && `📱 ${repayment.paymentMethodName || t('eWallet')}`}
                      {(!repayment.paymentMethod || repayment.paymentMethod === 'cash') && `💵 ${t('cash')}`}
                    </span>
                  )}
                </div>

                {/* Row 3: Note (if exists) */}
                {repayment.note && (
                  <div style={styles.noteRow}>
                    <span style={getNoteStyle()}>{repayment.note}</span>
                  </div>
                )}
              </div>

              {/* Right section: Amount and actions */}
              <div style={styles.rightSection}>
                <div style={getAmountStyle()}>${repayment.amount.toFixed(2)}</div>
                <div style={styles.actions}>
                  <button
                    onClick={() => onEdit(repayment)}
                    className="btn-icon btn-icon-primary"
                    aria-label={t('editRepayment')}
                    title={t('edit')}
                  >
                    <EditIcon size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(repayment.id!)}
                    className="btn-icon btn-icon-danger"
                    aria-label={t('delete')}
                    title={t('delete')}
                  >
                    <DeleteIcon size={16} />
                  </button>
                </div>
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
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '14px 16px',
    boxShadow: '0 2px 8px var(--shadow)',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  repaymentContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  leftSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    minWidth: 0,
  },
  rightSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '8px',
    flexShrink: 0,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  noteRow: {
    marginTop: '2px',
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
    fontSize: '18px',
    fontWeight: '700' as const,
    color: '#16a34a',
    whiteSpace: 'nowrap' as const,
    textShadow: '0 1px 2px rgba(22, 163, 74, 0.1)',
  },
  date: {
    fontSize: '0.85rem',
    color: '#666',
  },
  payerName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#333',
  },
  noteText: {
    fontSize: '0.8rem',
    color: '#888',
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#999',
  },
};

export default RepaymentList;
