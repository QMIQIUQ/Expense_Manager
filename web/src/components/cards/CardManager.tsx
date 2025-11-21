import React, { useState, useEffect } from 'react';
import { Card, Bank, Category, Expense, CardStats } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import CardForm from './CardForm';
import { calculateCardStats } from '../../utils/cardUtils';
import { PlusIcon, EditIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon } from '../icons';

interface CardManagerProps {
  cards: Card[];
  banks?: Bank[];
  categories: Category[];
  expenses: Expense[];
  onAdd: (card: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Card>) => void;
  onDelete: (id: string) => void;
}

const CardManager: React.FC<CardManagerProps> = ({
  cards,
  banks = [],
  categories,
  expenses,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  const handleAdd = (cardData: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    onAdd(cardData);
    setIsAdding(false);
  };

  const handleUpdate = (cardData: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (editingId) {
      onUpdate(editingId, cardData);
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDeleteCard'))) {
      onDelete(id);
    }
  };

  const toggleExpand = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
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
    <>
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
      <div className="card-manager">
        <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('creditCards')}</h3>
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
          <span>{t('addCard')}</span>
        </button>
      </div>

      {isAdding && (
        <div className="form-card">
          <CardForm
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
            categories={categories}
            // Provide banks for autocomplete in CardForm
            banks={banks}
          />
        </div>
      )}

      {cards.length === 0 && !isAdding ? (
        <div className="empty-state">
          <p className="empty-text">{t('noCardsYet')}</p>
        </div>
      ) : (
        <div className="card-list">
          {cards.map((card) => {
            const isEditing = editingId === card.id;
            const isExpanded = expandedCardId === card.id;
            const stats: CardStats = calculateCardStats(card, expenses, categories);

            if (isEditing) {
              return (
                <div key={card.id} className="credit-card" style={openMenuId === card.id ? { zIndex: 9999 } : {}}>
                  <CardForm
                    onSubmit={handleUpdate}
                    onCancel={() => setEditingId(null)}
                    initialData={card}
                    categories={categories}
                    banks={banks}
                  />
                </div>
              );
            }

            return (
              <div key={card.id} className="credit-card" style={openMenuId === card.id ? { zIndex: 9999 } : {}}>
                <div className="card-header">
                  <div className="card-info">
                    <h3 className="card-name">{card.name}</h3>
                    <p className="card-limit">
                      {t('cardLimit')}: ${card.cardLimit.toLocaleString()}
                    </p>
                  </div>
                  <div className="card-actions">
                    {/* Desktop: Show both buttons */}
                    <div className="desktop-actions">
                      <button onClick={() => setEditingId(card.id!)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
                        <EditIcon size={18} />
                      </button>
                      <button onClick={() => handleDelete(card.id!)} className="btn-icon btn-icon-danger" aria-label={t('delete')}>
                        <DeleteIcon size={18} />
                      </button>
                    </div>

                    {/* Mobile: Show hamburger menu */}
                    <div className="mobile-actions">
                      <div style={styles.menuContainer}>
                        <button
                          className="menu-trigger-button"
                          onClick={() => setOpenMenuId(openMenuId === card.id ? null : card.id!)}
                          aria-label="More"
                        >
                          ⋮
                        </button>
                        {openMenuId === card.id && (
                          <div style={styles.menu}>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                setEditingId(card.id!);
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
                                handleDelete(card.id!);
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

                <div className="stats-grid">
                  <div className="stat-card info">
                    <p className="stat-label">{t('currentCycleSpending')}</p>
                    <p className="stat-value info-text">${stats.currentCycleSpending.toFixed(2)}</p>
                  </div>
                  <div className="stat-card success">
                    <p className="stat-label">{t('availableCredit')}</p>
                    <p className="stat-value success-text">${stats.availableCredit.toFixed(2)}</p>
                  </div>
                  <div className="stat-card accent">
                    <p className="stat-label">{t('estimatedCashback')}</p>
                    <p className="stat-value accent-text">${stats.estimatedTotalCashback.toFixed(2)}</p>
                  </div>
                  <div className="stat-card warning">
                    <p className="stat-label">{t('nextBillingDate')}</p>
                    <p className="stat-value warning-text">{stats.nextBillingDate}</p>
                  </div>
                </div>

                {card.cashbackRules && card.cashbackRules.length > 0 && (
                  <button onClick={() => toggleExpand(card.id!)} className="btn-toggle">
                    {isExpanded ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
                    <span>{t('cashbackBreakdown')}</span>
                  </button>
                )}

                {isExpanded && card.cashbackRules && (
                  <div className="breakdown-section">
                    {stats.cashbackByRule.map((ruleStats, index) => (
                      <div key={ruleStats.ruleId || index} className="breakdown-row">
                        <div>
                          <div className="breakdown-title">{ruleStats.categoryName}</div>
                          <div className="breakdown-meta">
                            {t('categorySpend')}: ${ruleStats.categorySpend.toFixed(2)}
                          </div>
                          {ruleStats.requiredToReachMinSpend > 0 && (
                            <div className="breakdown-meta warning-text">
                              ${ruleStats.requiredToReachMinSpend.toFixed(2)} {t('toReachMinSpend')}
                            </div>
                          )}
                          {ruleStats.requiredToReachCap > 0 && (
                            <div className="breakdown-meta info-text">
                              ${ruleStats.requiredToReachCap.toFixed(2)} {t('toReachCap')}
                            </div>
                          )}
                        </div>
                        <div className="breakdown-value">+${ruleStats.estimatedCashback.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
};

export default CardManager;
