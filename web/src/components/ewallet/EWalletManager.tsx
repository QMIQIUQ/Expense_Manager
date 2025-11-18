import React, { useState, useEffect, useMemo } from 'react';
import { EWallet, Expense, Category } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';

// Common e-wallet icons
const EWALLET_ICONS = ['💳', '📱', '💰', '🏦', '💵', '💴', '💶', '💷', '🅰️', '🍎', '🔵', '🟢'];

// Preset colors
const PRESET_COLORS = [
  '#4285F4', '#1677FF', '#07C160', '#FF9500', '#5856D6',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE',
];

const responsiveStyles = `
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
`;

interface EWalletManagerProps {
  ewallets: EWallet[];
  expenses: Expense[];
  categories: Category[];
  onAdd: (ewallet: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: string, ewallet: Partial<EWallet>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EWalletManager: React.FC<EWalletManagerProps> = ({
  ewallets,
  expenses,
  categories,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedWalletId, setExpandedWalletId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    icon: '💳',
    color: '#4285F4',
    provider: '',
    accountNumber: '',
  });
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

  // Calculate wallet stats
  const getWalletStats = useMemo(() => {
    const stats: { [walletName: string]: { totalSpending: number; expenses: Expense[] } } = {};
    
    ewallets.forEach((wallet) => {
      const walletExpenses = expenses.filter(
        (exp) => exp.paymentMethod === 'e_wallet' && exp.paymentMethodName === wallet.name
      );
      const totalSpending = walletExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      stats[wallet.name] = {
        totalSpending,
        expenses: walletExpenses.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date} ${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        }),
      };
    });
    
    return stats;
  }, [ewallets, expenses]);

  // Filter e-wallets based on search
  const filteredWallets = ewallets.filter((wallet) =>
    wallet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.provider?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (walletId: string) => {
    setExpandedWalletId(expandedWalletId === walletId ? null : walletId);
  };

  const formatDate = (dateString: string, time?: string) => {
    const date = new Date(dateString);
    const base = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return time ? `${base} ${time}` : base;
  };

  const getCategoryDisplay = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category) {
      return `${category.icon} ${category.name}`;
    }
    return categoryName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    await onAdd(formData);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '💳',
      color: '#4285F4',
      provider: '',
      accountNumber: '',
    });
  };

  const startInlineEdit = (wallet: EWallet) => {
    setEditingId(wallet.id!);
    setFormData({
      name: wallet.name,
      icon: wallet.icon,
      color: wallet.color,
      provider: wallet.provider || '',
      accountNumber: wallet.accountNumber || '',
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const saveInlineEdit = async () => {
    if (!editingId || !formData.name.trim()) return;

    await onUpdate(editingId, formData);
    setEditingId(null);
    resetForm();
  };

  return (
    <div style={styles.container}>
      <style>{responsiveStyles}</style>
      
      <div style={styles.header}>
        <h2 style={styles.title}>{t('eWallets')}</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            <PlusIcon size={18} />
            <span>{t('addEWallet')}</span>
          </button>
        )}
      </div>

      <div style={styles.searchContainer}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchEWallets')}
          style={styles.searchInput}
        />
      </div>

      {isAdding && (
        <div style={styles.walletCard}>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('eWalletName')}
                style={styles.input}
                autoFocus
              />
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder={t('provider') + ' (' + t('optional') + ')'}
                style={styles.input}
              />
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder={t('accountNumber') + ' (' + t('optional') + ')'}
                style={styles.input}
              />
              <div>
                <label style={styles.label}>{t('icon')}</label>
                <div style={styles.iconGrid}>
                  {EWALLET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      style={{
                        ...styles.iconButton,
                        ...(formData.icon === icon ? styles.iconButtonSelected : {}),
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={styles.label}>{t('color')}</label>
                <div style={styles.colorGrid}>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{
                        ...styles.colorButton,
                        backgroundColor: color,
                        ...(formData.color === color ? styles.colorButtonSelected : {}),
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="submit" style={styles.saveButton}>
                <CheckIcon size={18} />
              </button>
              <button type="button" onClick={() => { setIsAdding(false); resetForm(); }} style={styles.cancelButton}>
                <CloseIcon size={18} />
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.walletList}>
        {filteredWallets.length === 0 ? (
          <div style={styles.noData}>{searchTerm ? t('noResultsFound') : t('noEWalletsYet')}</div>
        ) : (
          filteredWallets.map((wallet) => (
            <div key={wallet.id} style={styles.walletCard}>
              {editingId === wallet.id ? (
                // Edit Mode
                <div style={styles.formGrid}>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('eWalletName')}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder={t('provider') + ' (' + t('optional') + ')'}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder={t('accountNumber') + ' (' + t('optional') + ')'}
                    style={styles.input}
                  />
                  <div>
                    <label style={styles.label}>{t('icon')}</label>
                    <div style={styles.iconGrid}>
                      {EWALLET_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          style={{
                            ...styles.iconButton,
                            ...(formData.icon === icon ? styles.iconButtonSelected : {}),
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={styles.label}>{t('color')}</label>
                    <div style={styles.colorGrid}>
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          style={{
                            ...styles.colorButton,
                            backgroundColor: color,
                            ...(formData.color === color ? styles.colorButtonSelected : {}),
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={styles.formActions}>
                    <button onClick={saveInlineEdit} style={styles.saveButton}>
                      <CheckIcon size={18} />
                    </button>
                    <button onClick={cancelInlineEdit} style={styles.cancelButton}>
                      <CloseIcon size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  {/* First row: Icon, Name, Color Badge */}
                  <div style={styles.walletRow1}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={styles.walletIcon}>{wallet.icon}</span>
                      <h3 style={styles.walletName}>{wallet.name}</h3>
                      <div style={{ ...styles.colorBadge, backgroundColor: wallet.color }} />
                    </div>
                  </div>

                  {/* Second row: Provider and Account Number */}
                  <div style={styles.walletRow2}>
                    {wallet.provider && (
                      <p style={styles.walletProvider}>{wallet.provider}</p>
                    )}
                    {wallet.accountNumber && (
                      <p style={styles.walletAccount}>···· {wallet.accountNumber}</p>
                    )}
                  </div>

                  {/* Expense stats and breakdown */}
                  {getWalletStats[wallet.name]?.expenses.length > 0 && (
                    <div style={styles.statsSection}>
                      <div style={styles.statRow}>
                        <span style={styles.statLabel}>{t('totalSpending')}:</span>
                        <span style={styles.statValue}>
                          ${getWalletStats[wallet.name].totalSpending.toFixed(2)}
                        </span>
                        <button
                          onClick={() => toggleExpand(wallet.id!)}
                          style={styles.expandButton}
                        >
                          {expandedWalletId === wallet.id ? (
                            <ChevronUpIcon size={18} />
                          ) : (
                            <ChevronDownIcon size={18} />
                          )}
                        </button>
                      </div>

                      {expandedWalletId === wallet.id && (
                        <div style={styles.expenseList}>
                          {getWalletStats[wallet.name].expenses.map((exp) => (
                            <div key={exp.id} style={styles.expenseItem}>
                              <div style={styles.expenseInfo}>
                                <span style={styles.expenseCategory}>
                                  {getCategoryDisplay(exp.category)}
                                </span>
                                <span style={styles.expenseDate}>
                                  {formatDate(exp.date, exp.time)}
                                </span>
                                {exp.description && (
                                  <span style={styles.expenseDesc}>{exp.description}</span>
                                )}
                              </div>
                              <span style={styles.expenseAmount}>${exp.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Third row: Actions */}
                  <div style={styles.walletRow3}>
                    {/* Desktop: Show individual buttons */}
                    <div className="desktop-actions" style={{ gap: '8px' }}>
                      <button onClick={() => startInlineEdit(wallet)} style={styles.editBtn}>
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, walletId: wallet.id! })}
                        style={styles.deleteBtn}
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>

                    {/* Mobile: Show hamburger menu */}
                    <div className="mobile-actions">
                      <div style={styles.menuContainer}>
                        <button
                          className="menu-item-hover"
                          onClick={() => setOpenMenuId(openMenuId === wallet.id ? null : wallet.id!)}
                          style={styles.menuButton}
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
                              style={{ ...styles.menuItem, color: '#b91c1c' }}
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
                </>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('confirmDelete')}
        message={t('confirmDeleteEWallet')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.walletId) {
            onDelete(deleteConfirm.walletId);
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, walletId: null })}
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
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  walletList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  walletCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    boxShadow: '0 3px 10px var(--shadow)',
    transition: 'all 0.2s ease',
  },
  walletRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletRow2: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  walletRow3: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  walletIcon: {
    fontSize: '28px',
  },
  walletName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  colorBadge: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid white',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
  },
  walletProvider: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  walletAccount: {
    margin: 0,
    color: 'var(--text-tertiary)',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxHeight: '60vh',
    overflow: 'auto',
    paddingRight: '4px',
  },
  input: {
    padding: '10px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    maxWidth: '100%',
  },
  iconButton: {
    padding: '8px',
    border: '2px solid var(--border-color)',
    borderRadius: '6px',
    backgroundColor: 'var(--card-bg)',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  iconButtonSelected: {
    borderColor: '#4f46e5',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    maxWidth: '100%',
  },
  colorButton: {
    width: '40px',
    height: '40px',
    border: '2px solid var(--border-color)',
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: '0 0 0 1px var(--border-color)',
  },
  colorButtonSelected: {
    boxShadow: '0 0 0 3px rgba(79,70,229,0.5)',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  saveButton: {
    padding: '8px',
    backgroundColor: 'rgba(34,197,94,0.15)',
    color: '#16a34a',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    padding: '8px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    padding: '8px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: '8px',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContainer: {
    position: 'relative' as const,
  },
  menuButton: {
    padding: '8px 12px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold' as const,
    lineHeight: '1',
  },
  statsSection: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-color)',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: '500' as const,
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--accent-primary)',
    flex: 1,
    textAlign: 'right' as const,
  },
  expandButton: {
    padding: '4px',
    backgroundColor: 'transparent',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  expenseItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    gap: '12px',
  },
  expenseInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  },
  expenseCategory: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  expenseDate: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  expenseDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic' as const,
  },
  expenseAmount: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: 'var(--success-text)',
    whiteSpace: 'nowrap' as const,
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
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left' as const,
    color: 'var(--text-primary)',
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666',
  },
};
