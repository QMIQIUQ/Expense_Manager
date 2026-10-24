/**
 * BudgetAdjustmentCard - Display budget adjustment suggestions
 * Phase 3.3 Implementation
 */

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BudgetAdjustmentSuggestion, getSuggestionReasonKey } from '../../utils/budgetAnalysis';
import DisplayCurrencyAmount from '../common/DisplayCurrencyAmount';

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
          <span style={styles.amountValue}><DisplayCurrencyAmount amount={suggestion.currentAmount} currency={suggestion.currency} /></span>
        </div>
        <div style={styles.arrow}>{isIncrease ? '→' : '→'}</div>
        <div style={styles.amountBox}>
          <span style={styles.amountLabel}>{t('suggested') || 'Suggested'}</span>
          <span style={{ ...styles.amountValue, color: isIncrease ? 'var(--error-text)' : 'var(--success-text)' }}>
            <DisplayCurrencyAmount amount={suggestion.suggestedAmount} currency={suggestion.currency} />
          </span>
        </div>
        <div style={styles.changeBadge}>
          <span style={{ color: isIncrease ? 'var(--error-text)' : 'var(--success-text)' }}>
            {isIncrease ? '+' : '-'}<DisplayCurrencyAmount amount={difference} currency={suggestion.currency} /> ({percentChange}%)
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
    gap: 'var(--ui-space-8px)',
  },
  icon: {
    fontSize: 'var(--ui-font-20px)',
  },
  categoryName: {
    fontSize: 'var(--ui-font-16px)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  confidenceBadge: {
    padding: 'var(--ui-space-4px) var(--ui-space-8px)',
    borderRadius: 'var(--ui-radius-12px)',
    fontSize: 'var(--ui-font-11px)',
    fontWeight: 600,
    color: 'white',
  },
  reason: {
    margin: 'var(--ui-space-0px)',
    fontSize: 'var(--ui-font-13px)',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  amounts: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-12px)',
    flexWrap: 'wrap',
  },
  amountBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--ui-space-2px)',
  },
  amountLabel: {
    fontSize: 'var(--ui-font-11px)',
    color: 'var(--text-tertiary)',
  },
  amountValue: {
    fontSize: 'var(--ui-font-18px)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  arrow: {
    fontSize: 'var(--ui-font-18px)',
    color: 'var(--text-tertiary)',
  },
  changeBadge: {
    marginLeft: 'auto',
    padding: 'var(--ui-space-4px) var(--ui-space-8px)',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--ui-radius-6px)',
    fontSize: 'var(--ui-font-12px)',
    fontWeight: 500,
  },
  usageHistory: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--ui-space-8px)',
  },
  historyLabel: {
    fontSize: 'var(--ui-font-11px)',
    color: 'var(--text-tertiary)',
  },
  historyBars: {
    display: 'flex',
    gap: 'var(--ui-space-8px)',
    height: '40px',
    alignItems: 'flex-end',
  },
  historyBarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--ui-space-4px)',
    flex: 1,
  },
  historyBar: {
    width: '100%',
    minHeight: '4px',
    borderRadius: 'var(--ui-radius-2px)',
    transition: 'height 0.3s ease',
  },
  historyValue: {
    fontSize: 'var(--ui-font-10px)',
    color: 'var(--text-tertiary)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--ui-space-8px)',
    marginTop: 'var(--ui-space-4px)',
  },
  dismissButton: {
    flex: 1,
    padding: 'var(--ui-space-8px) var(--ui-space-12px)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-13px)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  applyButton: {
    flex: 1,
    padding: 'var(--ui-space-8px) var(--ui-space-12px)',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-13px)',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default BudgetAdjustmentCard;
