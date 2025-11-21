import React, { useState } from 'react';
import { Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import BankForm from './BankForm';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';

interface BankManagerProps {
  banks: Bank[];
  onAdd: (bank: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onUpdate: (id: string, bank: Partial<Bank>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const BankManager: React.FC<BankManagerProps> = ({ banks, onAdd, onUpdate, onDelete }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; bankId: string | null }>({ isOpen: false, bankId: null });
  
  const {
    isSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setIsSelectionMode
  } = useMultiSelect<Bank>();

  const handleAdd = async (data: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    await onAdd(data);
    setIsAdding(false);
  };

  const handleUpdate = async (data: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!editingId) return;
    await onUpdate(editingId, data);
    setEditingId(null);
  };

  const confirmDelete = (id: string) => setDeleteConfirm({ isOpen: true, bankId: id });
  const doDelete = async () => {
    if (deleteConfirm.bankId) {
      await onDelete(deleteConfirm.bankId);
      setDeleteConfirm({ isOpen: false, bankId: null });
    }
  };

  const filteredBanks = banks.filter(bank => 
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bank.code && bank.code.includes(searchTerm))
  );

  return (
    <div className="bank-manager">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('banks')}</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', border: 'none', borderRadius: 8, fontWeight: 600 }}>
            <PlusIcon size={18} />
            <span>{t('addBank')}</span>
          </button>
        )}
      </div>

      <div className="search-container">
        <SearchBar
          placeholder={t('searchByName')}
          value={searchTerm}
          onChange={setSearchTerm}
          style={{ marginBottom: 20 }}
        />
      </div>

      <MultiSelectToolbar
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        onToggleSelectionMode={() => {
            if (isSelectionMode) {
                clearSelection();
                setIsSelectionMode(false);
            } else {
                setIsSelectionMode(true);
            }
        }}
        onSelectAll={() => selectAll(filteredBanks)}
        onDeleteSelected={() => {
          if (selectedIds.size > 0) {
             setDeleteConfirm({ isOpen: true, bankId: null });
          }
        }}
        style={{ marginBottom: 20 }}
      />

      {isAdding && (
        <div className="form-card">
          <BankForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} title={t('addBank')} />
        </div>
      )}

      <div className="bank-list">
        {filteredBanks.map((bank) => (
          <div key={bank.id} className={`bank-card card ${isSelectionMode && selectedIds.has(bank.id!) ? 'selected' : ''}`} style={{ position: 'relative' }}>
            {isSelectionMode && (
                <div className="selection-checkbox-wrapper" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                    <input
                        type="checkbox"
                        checked={selectedIds.has(bank.id!)}
                        onChange={() => toggleSelection(bank.id!)}
                        className="multi-select-checkbox"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{bank.name}</h4>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{bank.country || ''} {bank.code ? `• ${bank.code}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditingId(bank.id!)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
                  <EditIcon size={18} />
                </button>
                <button onClick={() => confirmDelete(bank.id!)} className="btn-icon btn-icon-danger" aria-label={t('delete')}>
                  <DeleteIcon size={18} />
                </button>
              </div>
            </div>
            {editingId === bank.id && (
              <div className="form-card" style={{ marginTop: 12 }}>
                <BankForm initialData={bank} onSubmit={handleUpdate} onCancel={() => setEditingId(null)} title={t('editBank')} />
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('delete') + ' ' + t('bank')}
        message={deleteConfirm.bankId ? t('confirmDelete') : t('confirmDeleteSelected')}
        onConfirm={async () => {
            if (deleteConfirm.bankId) {
                await doDelete();
            } else if (isSelectionMode) {
                for (const id of selectedIds) {
                    await onDelete(id);
                }
                clearSelection();
                setIsSelectionMode(false);
                setDeleteConfirm({ isOpen: false, bankId: null });
            }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, bankId: null })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger
      />
    </div>
  );
};

export default BankManager;
