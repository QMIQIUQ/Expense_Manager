import React, { useState, useEffect, useMemo } from 'react';
import { EWallet, Expense, Income, Category, Transfer } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import EWalletForm from './EWalletForm';
import ConfirmModal from '../ConfirmModal';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';
import { SearchBar } from '../common/SearchBar';

// (Inline icon/color picker moved into EWalletForm for consistency)

interface EWalletManagerProps {
  ewallets: EWallet[];
  expenses: Expense[];
  incomes: Income[]; // Add incomes for balance calculation
  transfers: Transfer[];
  categories: Category[];
  onAdd: (ewallet: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: string, ewallet: Partial<EWallet>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EWalletManager: React.FC<EWalletManagerProps> = ({
  ewallets,
  expenses,
  incomes,
  transfers,
  categories,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Keep signature compatible; category data not used here directly
  void categories;
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; walletId: string | null }>({
    isOpen: false,
    walletId: null,
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest('.mobile-actions')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  // Calculate wallet stats including balance
  const getWalletStats = useMemo(() => {
    const stats: { 
      [walletName: string]: { 
        totalIncome: number;
        totalSpending: number;
        balance: number;
        expenses: Expense[];
        incomes: Income[];
      } 
    } = {};
    
    ewallets.forEach((wallet) => {
      // Calculate expenses
      const walletExpenses = expenses.filter(
        (exp) => exp.paymentMethod === 'e_wallet' && exp.paymentMethodName === wallet.name
      );
      const totalSpending = walletExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Calculate incomes
      const walletIncomes = incomes.filter(
        (inc) => inc.paymentMethod === 'e_wallet' && inc.paymentMethodName === wallet.name
      );
      const totalIncome = walletIncomes.reduce((sum, inc) => sum + inc.amount, 0);
      
      // Calculate transfers
      const outgoingTransfers = transfers.filter(
        (t) => t.fromPaymentMethod === 'e_wallet' && t.fromPaymentMethodName === wallet.name
      );
      const totalOutgoing = outgoingTransfers.reduce((sum, t) => sum + t.amount, 0);
      
      const incomingTransfers = transfers.filter(
        (t) => t.toPaymentMethod === 'e_wallet' && t.toPaymentMethodName === wallet.name
      );
      const totalIncoming = incomingTransfers.reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate balance (income + incoming transfers - spending - outgoing transfers)
      const balance = totalIncome + totalIncoming - totalSpending - totalOutgoing;
      
      stats[wallet.name] = {
        totalIncome,
        totalSpending,
        balance,
        expenses: walletExpenses.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date} ${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        }),
        incomes: walletIncomes.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        }),
      };
    });
    
    return stats;
  }, [ewallets, expenses, incomes, transfers]);

  // Filter e-wallets based on search
  const filteredWallets = ewallets.filter((wallet) =>
    wallet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.provider?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    isSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setIsSelectionMode
  } = useMultiSelect<EWallet>();



  const handleAdd = async (payload: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    await onAdd(payload);
    setIsAdding(false);
  };

  const startInlineEdit = (wallet: EWallet) => {
    setEditingId(wallet.id!);
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
  };

  const saveInlineEdit = async (payload: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!editingId) return;
    await onUpdate(editingId, payload);
    setEditingId(null);
  };

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
    <div className="ewallet-manager">
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
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('eWallets')}</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={18} />
            <span>{t('addEWallet')}</span>
          </button>
        )}
      </div>

      <div className="search-container">
        <SearchBar
          placeholder={t('searchEWallets')}
          value={searchTerm}
          onChange={setSearchTerm}
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
        onSelectAll={() => selectAll(filteredWallets)}
        onDeleteSelected={() => {
          if (selectedIds.size > 0) {
             setDeleteConfirm({ isOpen: true, walletId: null });
          }
        }}
        style={{ marginBottom: 20 }}
      />

      {isAdding && (
        <div className="form-card">
          <EWalletForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} title={t('addEWallet')} />
        </div>
      )}

      <div className="ewallet-list">
        {filteredWallets.length === 0 ? (
          <div className="no-data">{searchTerm ? t('noResultsFound') : t('noEWalletsYet')}</div>
        ) : (
          filteredWallets.map((wallet) => (
            <div key={wallet.id} className={`credit-card ${isSelectionMode && selectedIds.has(wallet.id!) ? 'selected' : ''}`} style={openMenuId === wallet.id ? { zIndex: 9999 } : {}}>
              {isSelectionMode && (
                  <div className="selection-checkbox-wrapper" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                      <input
                          type="checkbox"
                          checked={selectedIds.has(wallet.id!)}
                          onChange={() => toggleSelection(wallet.id!)}
                          className="multi-select-checkbox"
                          onClick={(e) => e.stopPropagation()}
                      />
                  </div>
              )}
              {editingId === wallet.id ? (
                <div className="form-card" style={{ width: '100%' }}>
                  <EWalletForm
                    initialData={wallet}
                    onSubmit={saveInlineEdit}
                    onCancel={cancelInlineEdit}
                    title={t('editEWallet')}
                  />
                </div>
              ) : (
                // View Mode - Card-like design matching credit card layout
                <>
                  {/* Card Header with Name and Actions */}
                  <div className="card-header">
                    <div className="card-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Icon with colored circle background */}
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: wallet.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0
                        }}>
                          {wallet.icon}
                        </div>
                        <div>
                          <h3 className="card-name">{wallet.name}</h3>
                          {wallet.provider && (
                            <p style={{
                              margin: 0,
                              fontSize: '14px',
                              color: 'var(--text-secondary)'
                            }}>
                              {wallet.provider}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="card-actions">
                      {/* Desktop: Show both buttons */}
                      <div className="desktop-actions">
                        <button 
                          onClick={() => startInlineEdit(wallet)} 
                          className="btn-icon btn-icon-primary"
                          aria-label={t('edit')}
                        >
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, walletId: wallet.id! })}
                          className="btn-icon btn-icon-danger"
                          aria-label={t('delete')}
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </div>

                      {/* Mobile: Show hamburger menu */}
                      <div className="mobile-actions">
                        <div style={styles.menuContainer}>
                          <button
                            className="menu-trigger-button"
                            onClick={() => setOpenMenuId(openMenuId === wallet.id ? null : wallet.id!)}
                            aria-label="More"
                          >
                            ⋮
                          </button>
                          {openMenuId === wallet.id && (
                            <div style={styles.menu}>
                              <button
                                className="menu-item-hover"
                                style={styles.menuItem}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  startInlineEdit(wallet);
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
                                  setDeleteConfirm({ isOpen: true, walletId: wallet.id! });
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

                  {/* Stats Grid - Same layout as credit cards */}
                  {(() => {
                    const stats = getWalletStats[wallet.name];
                    if (!stats) return null;
                    
                    return (
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
                            color: stats.balance >= 0 ? 'var(--success-text)' : 'var(--error-text)'
                          }}>
                            ${stats.balance.toFixed(2)}
                          </p>
                        </div>
                        <div className="stat-card warning">
                          <p className="stat-label">{t('transactions')}</p>
                          <p className="stat-value warning-text">{stats.expenses.length + stats.incomes.length}</p>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('confirmDelete')}
        message={deleteConfirm.walletId ? t('confirmDeleteEWallet') : t('confirmDeleteSelected')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={async () => {
          if (deleteConfirm.walletId) {
            await onDelete(deleteConfirm.walletId);
          } else if (isSelectionMode) {
             for (const id of selectedIds) {
                 await onDelete(id);
             }
             clearSelection();
             setIsSelectionMode(false);
          }
          setDeleteConfirm({ isOpen: false, walletId: null });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, walletId: null })}
      />
    </div>
  );
};

export default EWalletManager;
