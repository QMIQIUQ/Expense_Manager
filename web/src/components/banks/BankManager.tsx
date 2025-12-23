import React, { useState, useMemo } from 'react';
import { Bank, Expense, Income, Transfer } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import BankForm from './BankForm';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';
import PopupModal from '../common/PopupModal';

interface BankManagerProps {
  banks: Bank[];
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  onAdd: (bank: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onUpdate: (id: string, bank: Partial<Bank>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const BankManager: React.FC<BankManagerProps> = ({ banks, expenses, incomes, transfers, onAdd, onUpdate, onDelete }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; bankId: string | null }>({ isOpen: false, bankId: null });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
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
    if (!editingBank) return;
    await onUpdate(editingBank.id!, data);
    setEditingBank(null);
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

  // Calculate bank stats including balance
  const getBankStats = useMemo(() => {
    const stats: { 
      [bankId: string]: { 
        totalIncome: number;
        totalSpending: number;
        balance: number;
        expenses: Expense[];
        incomes: Income[];
      } 
    } = {};
    
    banks.forEach((bank) => {
      // Calculate expenses
      const bankExpenses = expenses.filter(
        (exp) => exp.paymentMethod === 'bank' && exp.bankId === bank.id
      );
      const totalSpending = bankExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Calculate incomes
      const bankIncomes = incomes.filter(
        (inc) => inc.paymentMethod === 'bank' && inc.bankId === bank.id
      );
      const totalIncome = bankIncomes.reduce((sum, inc) => sum + inc.amount, 0);
      
      // Calculate transfers
      const outgoingTransfers = transfers.filter(
        (t) => t.fromPaymentMethod === 'bank' && t.fromBankId === bank.id
      );
      const totalOutgoing = outgoingTransfers.reduce((sum, t) => sum + t.amount, 0);
      
      const incomingTransfers = transfers.filter(
        (t) => t.toPaymentMethod === 'bank' && t.toBankId === bank.id
      );
      const totalIncoming = incomingTransfers.reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate balance (income + incoming transfers - spending - outgoing transfers)
      const balance = totalIncome + totalIncoming - totalSpending - totalOutgoing;
      
      stats[bank.id!] = {
        totalIncome,
        totalSpending,
        balance,
        expenses: bankExpenses.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date} ${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        }),
        incomes: bankIncomes.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        }),
      };
    });
    
    return stats;
  }, [banks, expenses, incomes, transfers]);

  const styles = {
    menuContainer: {
      position: 'relative' as const,
    },
    menu: {
      position: 'absolute' as const,
      right: 0,
      top: '100%',
      marginTop: '4px',
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999,
      minWidth: '160px',
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      padding: '12px 16px',
      border: 'none',
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
      fontSize: '14px',
      cursor: 'pointer',
      textAlign: 'left' as const,
    },
    menuIcon: {
      display: 'flex',
      alignItems: 'center',
    },
  };

  return (
    <div className="bank-manager">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('banks')}</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-accent-light">
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

      {/* Add Form - PopupModal */}
      <PopupModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title={t('addBank')}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="500px"
      >
        <BankForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} title={t('addBank')} />
      </PopupModal>

      {/* Edit Form - PopupModal */}
      <PopupModal
        isOpen={editingBank !== null}
        onClose={() => setEditingBank(null)}
        title={t('editBank')}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="500px"
      >
        {editingBank && (
          <BankForm initialData={editingBank} onSubmit={handleUpdate} onCancel={() => setEditingBank(null)} title={t('editBank')} />
        )}
      </PopupModal>

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

      <style>{`
        .desktop-actions {
          display: none;
          gap: 8px;
        }
        .mobile-actions {
          display: block;
        }
        @media (min-width: 640px) {
          .desktop-actions {
            display: flex;
          }
          .mobile-actions {
            display: none;
          }
        }
      `}</style>

      <div className="bank-list">
        {filteredBanks.map((bank) => {
          const stats = getBankStats[bank.id!];
          return (
            <div key={bank.id} className={`credit-card ${isSelectionMode && selectedIds.has(bank.id!) ? 'selected' : ''}`} style={openMenuId === bank.id ? { zIndex: 9999 } : {}}>
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
              <>
                  {/* Card Header */}
                  <div className="card-header">
                    <div className="card-info">
                      <h3 className="card-name">{bank.name}</h3>
                      {(bank.country || bank.code) && (
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                          {bank.country || ''} {bank.code ? `• ${bank.code}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="card-actions">
                      {/* Desktop: Show both buttons */}
                      <div className="desktop-actions">
                        <button onClick={() => setEditingBank(bank)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
                          <EditIcon size={18} />
                        </button>
                        <button onClick={() => confirmDelete(bank.id!)} className="btn-icon btn-icon-danger" aria-label={t('delete')}>
                          <DeleteIcon size={18} />
                        </button>
                      </div>

                      {/* Mobile: Show hamburger menu */}
                      <div className="mobile-actions">
                        <div style={styles.menuContainer}>
                          <button
                            className="menu-trigger-button"
                            onClick={() => setOpenMenuId(openMenuId === bank.id ? null : bank.id!)}
                            aria-label="More"
                          >
                            ⋮
                          </button>
                          {openMenuId === bank.id && (
                            <div style={styles.menu}>
                              <button
                                className="menu-item-hover"
                                style={styles.menuItem}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setEditingBank(bank);
                                }}
                              >
                                <span style={styles.menuIcon}><EditIcon size={16} /></span>
                                {t('edit')}
                              </button>
                              <button
                                className="menu-item-hover"
                                style={{ ...styles.menuItem, color: 'var(--error-text)' }}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  confirmDelete(bank.id!);
                                }}
                              >
                                <span style={styles.menuIcon}><DeleteIcon size={16} /></span>
                                {t('delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid - Same layout as credit cards and e-wallets */}
                  {stats && (
                    <div className="stats-grid">
                      <div className="stat-card info">
                        <p className="stat-label">{t('walletIncome')}</p>
                        <p className="stat-value success-text">${stats.totalIncome.toFixed(2)}</p>
                      </div>
                      <div className="stat-card success">
                        <p className="stat-label">{t('walletSpending')}</p>
                        <p className="stat-value info-text">${stats.totalSpending.toFixed(2)}</p>
                      </div>
                      <div className="stat-card accent">
                        <p className="stat-label">{t('walletBalance')}</p>
                        <p className="stat-value" style={{ 
                          color: (bank.balance ?? stats.balance) >= 0 ? 'var(--success-text)' : 'var(--error-text)'
                        }}>
                          ${(bank.balance ?? stats.balance).toFixed(2)}
                        </p>
                      </div>
                      <div className="stat-card warning">
                        <p className="stat-label">{t('transactions')}</p>
                        <p className="stat-value warning-text">{stats.expenses.length + stats.incomes.length}</p>
                      </div>
                    </div>
                  )}
              </>
            </div>
          );
        })}
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
