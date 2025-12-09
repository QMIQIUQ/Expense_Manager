/**
 * BudgetAdjustmentCard - Display budget adjustment suggestions
 * Phase 3.3 Implementation
 */

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BudgetAdjustmentSuggestion, getSuggestionReasonKey } from '../../utils/budgetAnalysis';

interface BudgetAdjustmentCardProps {
  suggestion: BudgetAdjustmentSuggestion;
  onApply: (budgetId: string, newAmount: number) => void;
  onDismiss: (budgetId: string) => void;
}

const BudgetAdjustmentCard: React.FC<BudgetAdjustmentCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
}) => {
  const { t } = useLanguage();
  
  const isIncrease = suggestion.suggestedAmount > suggestion.currentAmount;
  const difference = Math.abs(suggestion.suggestedAmount - suggestion.currentAmount);
  const percentChange = ((difference / suggestion.currentAmount) * 100).toFixed(0);

  const confidenceColors = {
    high: 'var(--accent-primary)',
    medium: 'var(--warning-text)',
    low: 'var(--text-tertiary)',
  };

  const confidenceLabels = {
    high: t('highConfidence') || 'High',
    medium: t('mediumConfidence') || 'Medium',
    low: t('lowConfidence') || 'Low',
  };

  return (
    <div className="budget-suggestion-card budget-adjustment-card">
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>{isIncrease ? '📈' : '📉'}</span>
          <span style={styles.categoryName}>{suggestion.categoryName}</span>
        </div>
        <span
          style={{
            ...styles.confidenceBadge,
            backgroundColor: confidenceColors[suggestion.confidence],
          }}
        >
          {confidenceLabels[suggestion.confidence]}
        </span>
      </div>

      <p style={styles.reason}>
        {t(getSuggestionReasonKey(suggestion.reason) as keyof typeof import('../../locales/translations').translations) ||
          (suggestion.reason === 'consistently_over'
            ? 'Consistently over budget for the past 3 months'
            : 'Consistently under budget for the past 3 months')}
      </p>

      <div style={styles.amounts}>
        <div style={styles.amountBox}>
          <span style={styles.amountLabel}>{t('current') || 'Current'}</span>
          <span style={styles.amountValue}>${suggestion.currentAmount.toFixed(0)}</span>
        </div>
        <div style={styles.arrow}>{isIncrease ? '→' : '→'}</div>
        <div style={styles.amountBox}>
          <span style={styles.amountLabel}>{t('suggested') || 'Suggested'}</span>
          <span style={{ ...styles.amountValue, color: isIncrease ? 'var(--error-text)' : 'var(--success-text)' }}>
            ${suggestion.suggestedAmount.toFixed(0)}
          </span>
        </div>
        <div style={styles.changeBadge}>
          <span style={{ color: isIncrease ? 'var(--error-text)' : 'var(--success-text)' }}>
            {isIncrease ? '+' : '-'}${difference.toFixed(0)} ({percentChange}%)
          </span>
        </div>
      </div>

      <div style={styles.usageHistory}>
        <span style={styles.historyLabel}>{t('recentUsage') || 'Recent Usage'}:</span>
        <div style={styles.historyBars}>
          {suggestion.usageHistory.map((usage, index) => (
            <div key={index} style={styles.historyBarContainer}>
              <div
                style={{
                  ...styles.historyBar,
                  height: `${Math.min(100, usage)}%`,
                  backgroundColor: usage > 100 ? 'var(--error-text)' : usage > 80 ? 'var(--warning-text)' : 'var(--success-text)',
                }}
              />
              <span style={styles.historyValue}>{usage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={() => onDismiss(suggestion.budgetId)} style={styles.dismissButton}>
          {t('dismiss') || 'Dismiss'}
        </button>
        <button
          onClick={() => onApply(suggestion.budgetId, suggestion.suggestedAmount)}
          style={styles.applyButton}
        >
          {t('apply') || 'Apply'}
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '20px',
  },
  categoryName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  confidenceBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'white',
  },
  reason: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  amounts: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  amountBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  amountLabel: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
  amountValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  arrow: {
    fontSize: '18px',
    color: 'var(--text-tertiary)',
  },
  changeBadge: {
    marginLeft: 'auto',
    padding: '4px 8px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
  },
  usageHistory: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyLabel: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
  historyBars: {
    display: 'flex',
    gap: '8px',
    height: '40px',
    alignItems: 'flex-end',
  },
  historyBarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
  },
  historyBar: {
    width: '100%',
    minHeight: '4px',
    borderRadius: '2px',
    transition: 'height 0.3s ease',
  },
  historyValue: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  dismissButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  applyButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default BudgetAdjustmentCard;
