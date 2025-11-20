import React, { useState, useEffect, useMemo } from 'react';
import { EWallet, Expense, Category } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';

// Common e-wallet icons
const EWALLET_ICONS = ['💳', '📱', '💰', '🏦', '💵', '💴', '💶', '💷', '🅰️', '🍎', '🔵', '🟢'];

// Preset colors
const PRESET_COLORS = [
  '#4285F4', '#1677FF', '#07C160', '#FF9500', '#5856D6',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE',
];

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
      <div className="header-actions">
        <h2 className="section-title">{t('eWallets')}</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">
            <PlusIcon size={18} />
            <span>{t('addEWallet')}</span>
          </button>
        )}
      </div>

      <div className="search-container">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchEWallets')}
          className="form-input"
        />
      </div>

      {isAdding && (
        <div className="ewallet-card">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('eWalletName')}
                className="form-input"
                autoFocus
              />
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder={t('provider') + ' (' + t('optional') + ')'}
                className="form-input"
              />
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder={t('accountNumber') + ' (' + t('optional') + ')'}
                className="form-input"
              />
              <div>
                <label className="form-label">{t('icon')}</label>
                <div className="icon-grid">
                  {EWALLET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`icon-button ${formData.icon === icon ? 'selected' : ''}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">{t('color')}</label>
                <div className="color-grid">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`color-button ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                {t('addEWallet')}
              </button>
              <button type="button" onClick={() => { setIsAdding(false); resetForm(); }} className="btn btn-secondary">
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="ewallet-list">
        {filteredWallets.length === 0 ? (
          <div className="no-data">{searchTerm ? t('noResultsFound') : t('noEWalletsYet')}</div>
        ) : (
          filteredWallets.map((wallet) => (
            <div key={wallet.id} className="ewallet-card" style={openMenuId === wallet.id ? { zIndex: 9999 } : {}}>
              {editingId === wallet.id ? (
                // Edit Mode
                <div className="form-grid">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('eWalletName')}
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder={t('provider') + ' (' + t('optional') + ')'}
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder={t('accountNumber') + ' (' + t('optional') + ')'}
                    className="form-input"
                  />
                  <div>
                    <label className="form-label">{t('icon')}</label>
                    <div className="icon-grid">
                      {EWALLET_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          className={`icon-button ${formData.icon === icon ? 'selected' : ''}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{t('color')}</label>
                    <div className="color-grid">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`color-button ${formData.color === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="button-group">
                    <button onClick={saveInlineEdit} className="btn btn-primary">
                      {t('save')}
                    </button>
                    <button onClick={cancelInlineEdit} className="btn btn-secondary">
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode - Simplified design matching screenshot
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    {/* Left: Icon, Name, Status, and Provider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
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

                      {/* Name, Status indicator, and Provider */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {wallet.name}
                          </h3>
                          {/* Active status indicator (blue dot) */}
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#4285F4',
                            flexShrink: 0
                          }} />
                        </div>
                        {wallet.provider && (
                          <p style={{
                            margin: 0,
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {wallet.provider}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {/* Desktop: Show individual buttons */}
                      <div className="desktop-actions" style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => startInlineEdit(wallet)} 
                          className="btn-icon btn-icon-primary"
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <EditIcon size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, walletId: wallet.id! })}
                          className="btn-icon btn-icon-danger"
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <DeleteIcon size={16} />
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

                  {/* Expandable expense details section */}
                  {getWalletStats[wallet.name]?.expenses.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {t('totalSpending')}:
                          </span>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                            ${getWalletStats[wallet.name].totalSpending.toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleExpand(wallet.id!)}
                          className="btn-icon"
                          style={{
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {expandedWalletId === wallet.id ? (
                            <ChevronUpIcon size={16} />
                          ) : (
                            <ChevronDownIcon size={16} />
                          )}
                        </button>
                      </div>

                      {expandedWalletId === wallet.id && (
                        <div style={{ marginTop: '12px' }}>
                          {getWalletStats[wallet.name].expenses.map((exp) => (
                            <div 
                              key={exp.id} 
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: '1px solid var(--border-color)'
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                  {getCategoryDisplay(exp.category)}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {formatDate(exp.date, exp.time)}
                                </div>
                                {exp.description && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                    {exp.description}
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginLeft: '12px' }}>
                                ${exp.amount.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Total spending summary */}
      {filteredWallets.length > 0 && (() => {
        const totalSpending = Object.values(getWalletStats).reduce(
          (sum, stats) => sum + stats.totalSpending,
          0
        );
        return totalSpending > 0 ? (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {t('totalSpending')}:
            </span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent-primary)' }}>
              ${totalSpending.toFixed(2)}
            </span>
          </div>
        ) : null;
      })()}

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
