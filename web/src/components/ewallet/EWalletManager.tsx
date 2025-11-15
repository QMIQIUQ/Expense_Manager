import React, { useState } from 'react';
import { EWallet } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon, SearchIcon } from '../icons';
import EWalletForm from './EWalletForm';
import ConfirmModal from '../ConfirmModal';

interface EWalletManagerProps {
  ewallets: EWallet[];
  onAdd: (ewallet: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: string, ewallet: Partial<EWallet>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EWalletManager: React.FC<EWalletManagerProps> = ({
  ewallets,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<EWallet | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EWallet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter e-wallets based on search
  const filteredWallets = ewallets.filter((wallet) =>
    wallet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.provider?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async (walletData: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    await onAdd(walletData);
    setShowForm(false);
  };

  const handleUpdate = async (walletData: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (editingWallet?.id) {
      await onUpdate(editingWallet.id, walletData);
      setEditingWallet(null);
      setShowForm(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm?.id) {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (wallet: EWallet) => {
    setEditingWallet(wallet);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingWallet(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{t('eWallets')}</h2>
          <p style={styles.subtitle}>{t('manageEWallets')}</p>
        </div>
        <button
          onClick={() => {
            setEditingWallet(null);
            setShowForm(true);
          }}
          style={styles.addButton}
        >
          <PlusIcon size={18} />
          <span>{t('addEWallet')}</span>
        </button>
      </div>

      <div style={styles.searchRow}>
        <div style={styles.searchWrapper}>
          <SearchIcon size={18} className="text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchEWallets')}
            style={styles.searchInput}
          />
        </div>
      </div>

      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingWallet ? t('editEWallet') : t('addEWallet')}</h3>
              <button style={styles.closeButton} onClick={handleCancelForm} aria-label={t('cancel')}>
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <EWalletForm
                onSubmit={editingWallet ? handleUpdate : handleAdd}
                onCancel={handleCancelForm}
                initialData={editingWallet || undefined}
              />
            </div>
          </div>
        </div>
      )}

      {filteredWallets.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>{t('noEWalletsYet')}</p>
          <p style={styles.emptySubtext}>{t('addYourFirstEWallet')}</p>
        </div>
      ) : (
        <div style={styles.walletGrid}>
          {filteredWallets.map((wallet) => (
            <div key={wallet.id} style={styles.walletCard}>
              <div style={styles.walletHeader}>
                <div style={styles.walletInfo}>
                  <span style={styles.walletIcon}>{wallet.icon}</span>
                  <div style={styles.walletText}>
                    <h3 style={styles.walletName}>{wallet.name}</h3>
                    {wallet.provider && <p style={styles.walletProvider}>{wallet.provider}</p>}
                    {wallet.accountNumber && (
                      <p style={styles.walletAccount}>···· {wallet.accountNumber}</p>
                    )}
                  </div>
                </div>
                <div style={styles.walletActions}>
                  <button
                    onClick={() => handleEdit(wallet)}
                    style={styles.iconButton}
                    aria-label={t('edit')}
                  >
                    <EditIcon size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(wallet)}
                    style={styles.deleteButton}
                    aria-label={t('delete')}
                    title={t('delete')}
                  >
                    <DeleteIcon size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title={t('confirmDelete')}
        message={t('confirmDeleteEWallet')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        variant="danger"
      />
    </div>
  );
};

export default EWalletManager;

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
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: '#111827',
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#6b7280',
    fontSize: '14px',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600 as const,
    cursor: 'pointer',
  },
  searchRow: {
    display: 'flex',
  },
  searchWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 50,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px 0 24px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600 as const,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  modalBody: {
    padding: '20px 24px 24px 24px',
    overflowY: 'auto' as const,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  emptyText: {
    margin: 0,
    color: '#4b5563',
    fontSize: '16px',
    fontWeight: 500 as const,
  },
  emptySubtext: {
    marginTop: '4px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  walletGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  walletCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
  },
  walletHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  walletInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  walletIcon: {
    fontSize: '32px',
  },
  walletText: {
    flex: 1,
    minWidth: 0,
  },
  walletName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600 as const,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  walletProvider: {
    margin: '4px 0 0 0',
    color: '#6b7280',
    fontSize: '14px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  walletAccount: {
    margin: '6px 0 0 0',
    color: '#9ca3af',
    fontSize: '12px',
  },
  walletActions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'rgba(59,130,246,0.12)',
    color: '#1d4ed8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'rgba(244,63,94,0.12)',
    color: '#b91c1c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
