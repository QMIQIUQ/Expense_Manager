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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('eWallets')}</h2>
          <p className="text-sm text-gray-600 mt-1">{t('manageEWallets')}</p>
        </div>
        <button
          onClick={() => {
            setEditingWallet(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon size={20} />
          <span>{t('addEWallet')}</span>
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchEWallets')}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* E-Wallet Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingWallet ? t('editEWallet') : t('addEWallet')}
              </h3>
              <EWalletForm
                onSubmit={editingWallet ? handleUpdate : handleAdd}
                onCancel={handleCancelForm}
                initialData={editingWallet || undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* E-Wallets list */}
      {filteredWallets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('noEWalletsYet')}</p>
          <p className="text-sm text-gray-400 mt-2">{t('addYourFirstEWallet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{wallet.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{wallet.name}</h3>
                    {wallet.provider && (
                      <p className="text-sm text-gray-500 truncate">{wallet.provider}</p>
                    )}
                    {wallet.accountNumber && (
                      <p className="text-xs text-gray-400 mt-1">
                        ···· {wallet.accountNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(wallet)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label={t('edit')}
                  >
                    <EditIcon size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(wallet)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label={t('delete')}
                    disabled={wallet.isDefault}
                  >
                    <DeleteIcon size={18} />
                  </button>
                </div>
              </div>
              {wallet.isDefault && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {t('default')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
