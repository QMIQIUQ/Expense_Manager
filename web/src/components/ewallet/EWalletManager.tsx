import React, { useState, useEffect } from 'react';
import { EWallet } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '../icons';
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
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  // Filter e-wallets based on search
  const filteredWallets = ewallets.filter((wallet) =>
    wallet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.provider?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    color: '#111827',
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
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxHeight: '80vh',
    overflow: 'auto',
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
    color: '#333',
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
    color: '#666',
    fontSize: '14px',
  },
  walletAccount: {
    margin: 0,
    color: '#999',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxHeight: '70vh',
    overflow: 'auto',
    paddingRight: '4px',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#374151',
  },
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    maxWidth: '100%',
  },
  iconButton: {
    padding: '8px',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: 'white',
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
    border: '2px solid white',
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
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
    backgroundColor: 'rgba(148,163,184,0.2)',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    padding: '8px',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: '8px',
    backgroundColor: 'rgba(244,63,94,0.12)',
    color: '#b91c1c',
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
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold' as const,
    lineHeight: '1',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1000,
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
    color: '#374151',
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
