import React, { useState } from 'react';
import { GrabEarning, GrabTripType, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import GrabEarningForm from './GrabEarningForm';

interface Props {
  earnings: GrabEarning[];
  expenses: Expense[];
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<GrabEarning>) => void;
}

const GrabEarningList: React.FC<Props> = ({ earnings, expenses, onDelete, onInlineUpdate }) => {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterTripType, setFilterTripType] = useState<GrabTripType | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const handleDelete = (id: string) => {
    if (window.confirm(`${t('confirmDelete')}`)) {
      onDelete(id);
    }
  };

  const handleEdit = (earning: GrabEarning) => {
    setEditingId(earning.id || null);
  };

  const handleUpdate = (data: Omit<GrabEarning, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (editingId) {
      onInlineUpdate(editingId, data);
      setEditingId(null);
    }
  };

  // Get unique months from earnings
  const months = Array.from(
    new Set(earnings.map((e) => e.date.substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  // Filter earnings
  const filteredEarnings = earnings.filter((earning) => {
    if (filterTripType !== 'all' && earning.tripType !== filterTripType) {
      return false;
    }
    if (filterMonth !== 'all' && !earning.date.startsWith(filterMonth)) {
      return false;
    }
    return true;
  });

  if (earnings.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🚗</div>
        <h3 style={styles.emptyTitle}>{t('noGrabEarningsYet')}</h3>
        <p style={styles.emptyText}>{t('startTrackingGrabEarnings')}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>{t('filterByTripType')}</label>
          <select
            value={filterTripType}
            onChange={(e) => setFilterTripType(e.target.value as GrabTripType | 'all')}
            style={styles.filterSelect}
          >
            <option value="all">{t('allTripTypes')}</option>
            <option value="ride">{t('ride')}</option>
            <option value="delivery">{t('delivery')}</option>
            <option value="other">{t('other')}</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>{t('selectMonth')}</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">{t('allMonths')}</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.summary}>
        {t('total')}: {filteredEarnings.length} {t('trips')} | 
        {t('totalNet')}: ${filteredEarnings.reduce((sum, e) => sum + e.netAmount, 0).toFixed(2)}
      </div>

      <div style={styles.list}>
        {filteredEarnings.map((earning) => {
          if (editingId === earning.id) {
            return (
              <div key={earning.id} style={styles.editCard}>
                <GrabEarningForm
                  initialData={earning}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingId(null)}
                  expenses={expenses}
                />
              </div>
            );
          }

          const tripTypeEmoji = {
            ride: '🚗',
            delivery: '🛵',
            other: '📦',
          }[earning.tripType];

          return (
            <div key={earning.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardHeaderLeft}>
                  <span style={styles.tripTypeIcon}>{tripTypeEmoji}</span>
                  <span style={styles.tripType}>{t(earning.tripType)}</span>
                  {earning.tripIdOrRef && (
                    <span style={styles.tripRef}>#{earning.tripIdOrRef}</span>
                  )}
                </div>
                <div style={styles.cardHeaderRight}>
                  <span style={styles.date}>{earning.date}</span>
                </div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.amountRow}>
                  <div style={styles.amountItem}>
                    <span style={styles.amountLabel}>{t('grossAmount')}</span>
                    <span style={styles.amountValue}>${earning.grossAmount.toFixed(2)}</span>
                  </div>
                  <div style={styles.amountItem}>
                    <span style={styles.amountLabel}>{t('platformFees')}</span>
                    <span style={{ ...styles.amountValue, color: '#f44336' }}>
                      -${earning.platformFees.toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.amountItem}>
                    <span style={styles.amountLabel}>{t('tips')}</span>
                    <span style={{ ...styles.amountValue, color: '#4caf50' }}>
                      +${earning.tips.toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.amountItem}>
                    <span style={styles.amountLabel}>{t('netAmount')}</span>
                    <span style={{ ...styles.amountValue, fontWeight: 700, fontSize: '18px' }}>
                      ${earning.netAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {(earning.payoutDate || earning.payoutReference) && (
                  <div style={styles.payoutInfo}>
                    {earning.payoutDate && (
                      <span style={styles.payoutText}>
                        💳 {t('payoutDate')}: {earning.payoutDate}
                      </span>
                    )}
                    {earning.payoutReference && (
                      <span style={styles.payoutText}>
                        {t('payoutReference')}: {earning.payoutReference}
                      </span>
                    )}
                  </div>
                )}

                {earning.notes && (
                  <div style={styles.notes}>
                    <strong>{t('notes')}:</strong> {earning.notes}
                  </div>
                )}

                {earning.linkedExpenseId && (
                  <div style={styles.linkedExpense}>
                    🔗 {t('linkedTo')} {t('expense')}: {
                      expenses.find(e => e.id === earning.linkedExpenseId)?.description || earning.linkedExpenseId
                    }
                  </div>
                )}
              </div>

              <div style={styles.cardActions}>
                <button
                  onClick={() => handleEdit(earning)}
                  style={styles.editButton}
                >
                  {t('edit')}
                </button>
                <button
                  onClick={() => earning.id && handleDelete(earning.id)}
                  style={styles.deleteButton}
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#666',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    outline: 'none',
  },
  summary: {
    fontSize: '14px',
    color: '#666',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  editCard: {
    backgroundColor: 'white',
    border: '2px solid #6366f1',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 8px rgba(99,102,241,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f0f0f0',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tripTypeIcon: {
    fontSize: '20px',
  },
  tripType: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#333',
    textTransform: 'capitalize' as const,
  },
  tripRef: {
    fontSize: '12px',
    color: '#999',
    backgroundColor: '#f5f5f5',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  date: {
    fontSize: '14px',
    color: '#666',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  amountRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px',
  },
  amountItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  amountLabel: {
    fontSize: '12px',
    color: '#999',
  },
  amountValue: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#333',
  },
  payoutInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    fontSize: '12px',
    color: '#666',
    padding: '8px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
  },
  payoutText: {
    fontSize: '12px',
  },
  notes: {
    fontSize: '13px',
    color: '#666',
    padding: '8px',
    backgroundColor: '#fff9e6',
    borderRadius: '6px',
    borderLeft: '3px solid #ffc107',
  },
  linkedExpense: {
    fontSize: '12px',
    color: '#6366f1',
    padding: '6px',
    backgroundColor: '#f0f0ff',
    borderRadius: '6px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f0f0f0',
  },
  editButton: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#6366f1',
    backgroundColor: 'white',
    border: '1px solid #6366f1',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#f44336',
    backgroundColor: 'white',
    border: '1px solid #f44336',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
  },
};

export default GrabEarningList;
