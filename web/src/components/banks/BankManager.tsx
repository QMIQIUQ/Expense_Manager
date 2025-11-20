import React, { useState } from 'react';
import { Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import BankForm from './BankForm';
import { PlusIcon, EditIcon, DeleteIcon, CloseIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';

interface BankManagerProps {
  banks: Bank[];
  onAdd: (bank: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onUpdate: (id: string, bank: Partial<Bank>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const BankManager: React.FC<BankManagerProps> = ({ banks, onAdd, onUpdate, onDelete }) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; bankId: string | null }>({ isOpen: false, bankId: null });

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

      {isAdding && (
        <div className="form-card">
          <div className="form-header">
            <h3 className="form-title">{t('addBank')}</h3>
            <button onClick={() => setIsAdding(false)} className="btn-close" aria-label={t('cancel')}>
              <CloseIcon size={18} />
            </button>
          </div>
          <BankForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} />
        </div>
      )}

      <div className="bank-list">
        {banks.map((bank) => (
          <div key={bank.id} className="bank-card card">
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
                <div className="form-header">
                  <h3 className="form-title">{t('editBank')}</h3>
                  <button onClick={() => setEditingId(null)} className="btn-close" aria-label={t('cancel')}>
                    <CloseIcon size={18} />
                  </button>
                </div>
                <BankForm initialData={bank} onSubmit={handleUpdate} onCancel={() => setEditingId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('delete') + ' ' + t('bank')}
        message={t('confirmDelete')}
        onConfirm={doDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, bankId: null })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger
      />
    </div>
  );
};

export default BankManager;
