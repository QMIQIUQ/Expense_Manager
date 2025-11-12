import React from 'react';
import { GrabEarning } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  earnings: GrabEarning[];
  monthlyExpenses: number;
}

const GrabDashboardCards: React.FC<Props> = ({ earnings, monthlyExpenses }) => {
  const { t } = useLanguage();

  // Calculate current month stats
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthEarnings = earnings.filter(e => e.date.startsWith(currentMonth));

  const stats = {
    totalGross: currentMonthEarnings.reduce((sum, e) => sum + e.grossAmount, 0),
    totalFees: currentMonthEarnings.reduce((sum, e) => sum + e.platformFees, 0),
    totalTips: currentMonthEarnings.reduce((sum, e) => sum + e.tips, 0),
    totalNet: currentMonthEarnings.reduce((sum, e) => sum + e.netAmount, 0),
    tripCount: currentMonthEarnings.length,
  };

  // Calculate daily target
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysLeft = Math.max(1, daysInMonth - currentDay + 1);
  
  const remainingToBreakEven = Math.max(0, monthlyExpenses - stats.totalNet);
  const needPerDay = remainingToBreakEven / daysLeft;
  const targetMet = stats.totalNet >= monthlyExpenses;
  const surplus = stats.totalNet - monthlyExpenses;

  // Calculate average per trip
  const avgPerTrip = stats.tripCount > 0 ? stats.totalNet / stats.tripCount : 0;

  return (
    <div style={styles.container}>
      {/* Main stats cards */}
      <div style={styles.statsGrid}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>💰</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('totalGross')}</div>
            <div style={styles.cardValue}>${stats.totalGross.toFixed(2)}</div>
            <div style={styles.cardSubtext}>
              {stats.tripCount} {t('trips')}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ ...styles.cardIcon, backgroundColor: '#ffebee' }}>💸</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('totalFees')}</div>
            <div style={{ ...styles.cardValue, color: '#f44336' }}>
              ${stats.totalFees.toFixed(2)}
            </div>
            <div style={styles.cardSubtext}>
              {stats.totalGross > 0 ? ((stats.totalFees / stats.totalGross) * 100).toFixed(1) : 0}% {t('of')} {t('grossAmount')}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ ...styles.cardIcon, backgroundColor: '#e8f5e9' }}>💵</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('totalTips')}</div>
            <div style={{ ...styles.cardValue, color: '#4caf50' }}>
              ${stats.totalTips.toFixed(2)}
            </div>
            <div style={styles.cardSubtext}>
              {stats.tripCount > 0 ? `$${(stats.totalTips / stats.tripCount).toFixed(2)} / ${t('trips')}` : '-'}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ ...styles.cardIcon, backgroundColor: '#e3f2fd' }}>🎯</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('totalNet')}</div>
            <div style={{ ...styles.cardValue, color: '#2196f3', fontSize: '22px' }}>
              ${stats.totalNet.toFixed(2)}
            </div>
            <div style={styles.cardSubtext}>
              {t('averagePerTrip')}: ${avgPerTrip.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Target achievement card */}
      <div style={styles.targetCard}>
        <h3 style={styles.targetTitle}>
          {targetMet ? '🎉 ' : '📊 '}{t('targetAchievement')}
        </h3>
        
        <div style={styles.targetContent}>
          <div style={styles.comparisonRow}>
            <div style={styles.comparisonItem}>
              <span style={styles.comparisonLabel}>{t('monthlyGrabEarnings')}</span>
              <span style={{ ...styles.comparisonValue, color: '#4caf50' }}>
                ${stats.totalNet.toFixed(2)}
              </span>
            </div>
            <div style={styles.comparisonVs}>vs</div>
            <div style={styles.comparisonItem}>
              <span style={styles.comparisonLabel}>{t('thisMonth')} {t('expenses')}</span>
              <span style={{ ...styles.comparisonValue, color: '#f44336' }}>
                ${monthlyExpenses.toFixed(2)}
              </span>
            </div>
          </div>

          {targetMet ? (
            <div style={styles.successMessage}>
              <div style={styles.successTitle}>{t('targetMet')}</div>
              <div style={styles.successText}>
                {t('surplusThisMonth')}: <strong>${surplus.toFixed(2)}</strong>
              </div>
            </div>
          ) : (
            <>
              <div style={styles.progressSection}>
                <div style={styles.progressLabel}>
                  <span>{t('remainingToBreakEven')}</span>
                  <span style={{ fontWeight: 700 }}>${remainingToBreakEven.toFixed(2)}</span>
                </div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(100, (stats.totalNet / monthlyExpenses) * 100)}%`,
                    }}
                  />
                </div>
                <div style={styles.progressPercentage}>
                  {monthlyExpenses > 0 ? ((stats.totalNet / monthlyExpenses) * 100).toFixed(1) : 0}% {t('of')} {t('target')}
                </div>
              </div>

              <div style={styles.dailyTarget}>
                <div style={styles.dailyTargetIcon}>📅</div>
                <div style={styles.dailyTargetContent}>
                  <div style={styles.dailyTargetTitle}>{t('dailyTargetRemaining')}</div>
                  <div style={styles.dailyTargetValue}>
                    ${needPerDay.toFixed(2)} / {t('day')}
                  </div>
                  <div style={styles.dailyTargetSubtext}>
                    ({t('daysLeftInMonth')}: {daysLeft} {t('days')})
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  cardIcon: {
    fontSize: '32px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: '50%',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    textAlign: 'center' as const,
  },
  cardLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500' as const,
  },
  cardValue: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#333',
  },
  cardSubtext: {
    fontSize: '11px',
    color: '#999',
  },
  targetCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  targetTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#333',
  },
  targetContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  comparisonRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: '16px',
  },
  comparisonItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  comparisonLabel: {
    fontSize: '13px',
    color: '#666',
    textAlign: 'center' as const,
  },
  comparisonValue: {
    fontSize: '24px',
    fontWeight: '700' as const,
  },
  comparisonVs: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#999',
  },
  successMessage: {
    padding: '20px',
    backgroundColor: '#e8f5e9',
    borderRadius: '10px',
    textAlign: 'center' as const,
    border: '2px solid #4caf50',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#2e7d32',
    marginBottom: '8px',
  },
  successText: {
    fontSize: '16px',
    color: '#388e3c',
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#666',
  },
  progressBar: {
    height: '12px',
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    transition: 'width 0.3s ease',
  },
  progressPercentage: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'right' as const,
  },
  dailyTarget: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#fff9e6',
    borderRadius: '10px',
    border: '1px solid #ffc107',
  },
  dailyTargetIcon: {
    fontSize: '32px',
  },
  dailyTargetContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  dailyTargetTitle: {
    fontSize: '13px',
    color: '#666',
    fontWeight: '500' as const,
  },
  dailyTargetValue: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#f57c00',
  },
  dailyTargetSubtext: {
    fontSize: '11px',
    color: '#999',
  },
};

export default GrabDashboardCards;
