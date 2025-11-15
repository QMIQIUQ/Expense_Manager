import React, { useState } from 'react';
import { Card, Category, Expense, CardStats } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import CardForm from './CardForm';
import { calculateCardStats } from '../../utils/cardUtils';
import { PlusIcon, EditIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon } from '../icons';

interface CardManagerProps {
  cards: Card[];
  categories: Category[];
  expenses: Expense[];
  onAdd: (card: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Card>) => void;
  onDelete: (id: string) => void;
}

const CardManager: React.FC<CardManagerProps> = ({
  cards,
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{t('creditCards')}</h2>
        </div>
        <button onClick={() => setIsAdding(true)} style={styles.addButton}>
          <PlusIcon size={18} />
          <span>{t('addCard')}</span>
        </button>
      </div>

      {isAdding && (
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h3 style={styles.formTitle}>{t('addCard')}</h3>
            <button onClick={() => setIsAdding(false)} style={styles.cancelIconButton} aria-label={t('cancel')}>
              <CloseIcon size={18} />
            </button>
          </div>
          <CardForm
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
            categories={categories}
          />
        </div>
      )}

      {cards.length === 0 && !isAdding ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>{t('noCardsYet')}</p>
        </div>
      ) : (
        <div style={styles.cardList}>
          {cards.map((card) => {
            const isEditing = editingId === card.id;
            const isExpanded = expandedCardId === card.id;
            const stats: CardStats = calculateCardStats(card, expenses, categories);

            if (isEditing) {
              return (
                <div key={card.id} style={styles.card}>
                  <div style={styles.editingHeader}>
                    <h3 style={styles.formTitle}>{t('editCard')}</h3>
                    <button onClick={() => setEditingId(null)} style={styles.cancelIconButton} aria-label={t('cancel')}>
                      <CloseIcon size={18} />
                    </button>
                  </div>
                  <CardForm
                    onSubmit={handleUpdate}
                    onCancel={() => setEditingId(null)}
                    initialData={card}
                    categories={categories}
                  />
                </div>
              );
            }

            return (
              <div key={card.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardInfo}>
                    <h3 style={styles.cardName}>{card.name}</h3>
                    <p style={styles.cardLimit}>
                      {t('cardLimit')}: ${card.cardLimit.toLocaleString()}
                    </p>
                  </div>
                  <div style={styles.cardActions}>
                    <button onClick={() => setEditingId(card.id!)} style={styles.iconButton} aria-label={t('edit')}>
                      <EditIcon size={18} />
                    </button>
                    <button onClick={() => handleDelete(card.id!)} style={styles.deleteButton} aria-label={t('delete')}>
                      <DeleteIcon size={18} />
                    </button>
                  </div>
                </div>

                <div style={styles.statsGrid}>
                  <div style={{ ...styles.statCard, backgroundColor: '#e0f2fe' }}>
                    <p style={styles.statLabel}>{t('currentCycleSpending')}</p>
                    <p style={{ ...styles.statValue, color: '#0f62fe' }}>${stats.currentCycleSpending.toFixed(2)}</p>
                  </div>
                  <div style={{ ...styles.statCard, backgroundColor: '#dcfce7' }}>
                    <p style={styles.statLabel}>{t('availableCredit')}</p>
                    <p style={{ ...styles.statValue, color: '#15803d' }}>${stats.availableCredit.toFixed(2)}</p>
                  </div>
                  <div style={{ ...styles.statCard, backgroundColor: '#ede9fe' }}>
                    <p style={styles.statLabel}>{t('estimatedCashback')}</p>
                    <p style={{ ...styles.statValue, color: '#6d28d9' }}>${stats.estimatedTotalCashback.toFixed(2)}</p>
                  </div>
                  <div style={{ ...styles.statCard, backgroundColor: '#fff7ed' }}>
                    <p style={styles.statLabel}>{t('nextBillingDate')}</p>
                    <p style={{ ...styles.statValue, color: '#c2410c' }}>{stats.nextBillingDate}</p>
                  </div>
                </div>

                {card.cashbackRules && card.cashbackRules.length > 0 && (
                  <button onClick={() => toggleExpand(card.id!)} style={styles.toggleButton}>
                    {isExpanded ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
                    <span>{t('cashbackBreakdown')}</span>
                  </button>
                )}

                {isExpanded && card.cashbackRules && (
                  <div style={styles.breakdown}>
                    {stats.cashbackByRule.map((ruleStats, index) => (
                      <div key={ruleStats.ruleId || index} style={styles.breakdownRow}>
                        <div>
                          <div style={styles.breakdownTitle}>{ruleStats.categoryName}</div>
                          <div style={styles.breakdownMeta}>
                            {t('categorySpend')}: ${ruleStats.categorySpend.toFixed(2)}
                          </div>
                          {ruleStats.requiredToReachMinSpend > 0 && (
                            <div style={{ ...styles.breakdownMeta, color: '#c2410c' }}>
                              ${ruleStats.requiredToReachMinSpend.toFixed(2)} {t('toReachMinSpend')}
                            </div>
                          )}
                          {ruleStats.requiredToReachCap > 0 && (
                            <div style={{ ...styles.breakdownMeta, color: '#2563eb' }}>
                              ${ruleStats.requiredToReachCap.toFixed(2)} {t('toReachCap')}
                            </div>
                          )}
                        </div>
                        <div style={styles.breakdownValue}>+${ruleStats.estimatedCashback.toFixed(2)}</div>
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
  );
};

export default CardManager;

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
  formCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  formTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600 as const,
    color: '#111827',
  },
  cancelIconButton: {
    border: 'none',
    backgroundColor: 'rgba(148,163,184,0.2)',
    borderRadius: '999px',
    padding: '6px',
    cursor: 'pointer',
    color: '#4b5563',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
  },
  emptyText: {
    margin: 0,
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: 500 as const,
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
  },
  editingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600 as const,
    color: '#111827',
  },
  cardLimit: {
    marginTop: '4px',
    color: '#6b7280',
    fontSize: '14px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    padding: '8px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    padding: '8px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'rgba(244,63,94,0.12)',
    color: '#b91c1c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    marginBottom: '12px',
  },
  statCard: {
    borderRadius: '12px',
    padding: '12px',
  },
  statLabel: {
    margin: 0,
    color: '#6b7280',
    fontSize: '12px',
    marginBottom: '6px',
  },
  statValue: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600 as const,
  },
  toggleButton: {
    width: '100%',
    border: 'none',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    borderRadius: '10px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontWeight: 500 as const,
  },
  breakdown: {
    marginTop: '16px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#f9fafb',
  },
  breakdownTitle: {
    fontSize: '15px',
    fontWeight: 600 as const,
    color: '#111827',
  },
  breakdownMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  breakdownValue: {
    fontWeight: 600 as const,
    color: '#6d28d9',
    whiteSpace: 'nowrap' as const,
  },
};
