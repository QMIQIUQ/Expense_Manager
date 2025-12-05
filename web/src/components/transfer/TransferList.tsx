import React from 'react';
import { Transfer, EWallet, Bank, Card } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { DeleteIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';

interface TransferListProps {
  transfers: Transfer[];
  ewallets: EWallet[];
  banks: Bank[];
  cards: Card[];
  onDelete: (id: string) => Promise<void>;
}

const TransferList: React.FC<TransferListProps> = ({
  transfers,
  ewallets,
  banks,
  cards,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ isOpen: boolean; transferId: string | null }>({
    isOpen: false,
    transferId: null,
  });

  // Helper to get account display name
  const getAccountName = (
    paymentMethod: string,
    paymentMethodName?: string,
    bankId?: string,
    cardId?: string
  ): string => {
    if (paymentMethod === 'e_wallet' && paymentMethodName) {
      const wallet = ewallets.find(w => w.name === paymentMethodName);
      return wallet ? `${wallet.icon || '📱'} ${wallet.name}` : paymentMethodName;
    }
    if (paymentMethod === 'bank' && bankId) {
      const bank = banks.find(b => b.id === bankId);
      return bank ? `🏦 ${bank.name}` : t('bank');
    }
    if (paymentMethod === 'credit_card' && cardId) {
      const card = cards.find(c => c.id === cardId);
      return card ? `💳 ${card.name}` : t('creditCard');
    }
    if (paymentMethod === 'cash') {
      return `💵 ${t('cash')}`;
    }
    return paymentMethod;
  };

  // Sort transfers by date (newest first)
  const sortedTransfers = [...transfers].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt).getTime();
    const dateB = new Date(b.date || b.createdAt).getTime();
    return dateB - dateA;
  });

  const handleDelete = async () => {
    if (deleteConfirm.transferId) {
      await onDelete(deleteConfirm.transferId);
      setDeleteConfirm({ isOpen: false, transferId: null });
    }
  };

  if (sortedTransfers.length === 0) {
    return (
      <div className="no-data" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {t('noTransfersYet')}
        </p>
      </div>
    );
  }

  return (
    <div className="transfer-list">
      <style>{`
        .transfer-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          transition: background-color 0.2s;
        }
        .transfer-item:hover {
          background-color: var(--hover-bg);
        }
        .transfer-item:last-child {
          border-bottom: none;
        }
        .transfer-accounts {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .transfer-arrow {
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .transfer-account {
          font-size: 14px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .transfer-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          margin-right: 12px;
        }
        .transfer-amount {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .transfer-date {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .transfer-note {
          font-size: 12px;
          color: var(--text-tertiary);
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 640px) {
          .transfer-item {
            flex-wrap: wrap;
            gap: 8px;
          }
          .transfer-accounts {
            width: 100%;
          }
          .transfer-details {
            align-items: flex-start;
            margin-right: 0;
          }
        }
      `}</style>

      {sortedTransfers.map((transfer) => (
        <div key={transfer.id} className="transfer-item">
          <div className="transfer-accounts">
            <span className="transfer-account">
              {getAccountName(
                transfer.fromPaymentMethod,
                transfer.fromPaymentMethodName,
                transfer.fromBankId,
                transfer.fromCardId
              )}
            </span>
            <span className="transfer-arrow">→</span>
            <span className="transfer-account">
              {getAccountName(
                transfer.toPaymentMethod,
                transfer.toPaymentMethodName,
                transfer.toBankId,
                transfer.toCardId
              )}
            </span>
          </div>
          <div className="transfer-details">
            <span className="transfer-amount">${transfer.amount.toFixed(2)}</span>
            <span className="transfer-date">
              {new Date(transfer.date || transfer.createdAt).toLocaleDateString()}
            </span>
            {transfer.note && (
              <span className="transfer-note" title={transfer.note}>
                {transfer.note}
              </span>
            )}
          </div>
          <button
            onClick={() => setDeleteConfirm({ isOpen: true, transferId: transfer.id! })}
            className="btn-icon btn-icon-danger"
            aria-label={t('delete')}
            style={{ flexShrink: 0 }}
          >
            <DeleteIcon size={18} />
          </button>
        </div>
      ))}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('confirmDelete')}
        message={t('confirmDelete')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, transferId: null })}
      />
    </div>
  );
};

export default TransferList;
