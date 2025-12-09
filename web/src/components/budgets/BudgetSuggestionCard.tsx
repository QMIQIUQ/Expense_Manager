import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface BudgetSuggestionCardProps {
  categoryName: string;
  suggestedAmount: number;
  averageSpending: number;
  maxSpending: number;
  minSpending: number;
  monthsAnalyzed: number;
  confidence: 'high' | 'medium' | 'low';
  onApply?: (categoryName: string, amount: number) => void;
}

export const BudgetSuggestionCard: React.FC<BudgetSuggestionCardProps> = ({
  categoryName,
  suggestedAmount,
  averageSpending,
  maxSpending,
  minSpending,
  monthsAnalyzed,
  confidence,
  onApply,
}) => {
  const { t } = useLanguage();

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(0)}`;
  };

  const getConfidenceInfo = () => {
    switch (confidence) {
      case 'high':
        return { label: t('highConfidence'), color: 'var(--success-color)', icon: '🟢' };
      case 'medium':
        return { label: t('mediumConfidence'), color: 'var(--warning-color)', icon: '🟡' };
      case 'low':
        return { label: t('lowConfidence'), color: 'var(--danger-color)', icon: '🔴' };
    }
  };

  const confidenceInfo = getConfidenceInfo();

  return (
    <div className="budget-suggestion-card">
      <div className="suggestion-header">
        <span className="suggestion-category">{categoryName}</span>
        <span 
          className="suggestion-confidence"
          style={{ color: confidenceInfo.color }}
          title={confidenceInfo.label}
        >
          {confidenceInfo.icon}
        </span>
      </div>
      
      <div className="suggestion-body">
        <div className="suggestion-main">
          <span className="suggestion-label">{t('suggestedBudget')}</span>
          <span className="suggestion-amount">{formatCurrency(suggestedAmount)}</span>
        </div>
        
        <div className="suggestion-details">
          <div className="suggestion-detail">
            <span className="detail-label">{t('averageSpending')}</span>
            <span className="detail-value">{formatCurrency(averageSpending)}</span>
          </div>
          <div className="suggestion-detail">
            <span className="detail-label">{t('spendingRange')}</span>
            <span className="detail-value">
              {formatCurrency(minSpending)} - {formatCurrency(maxSpending)}
            </span>
          </div>
        </div>
        
        <div className="suggestion-meta">
          <span className="months-analyzed">
            {t('monthsAnalyzed').replace('{count}', String(monthsAnalyzed))}
          </span>
        </div>
      </div>
      
      {onApply && (
        <button 
          className="suggestion-apply-btn"
          onClick={() => onApply(categoryName, suggestedAmount)}
        >
          {t('applySuggestion')}
        </button>
      )}
    </div>
  );
};

export default BudgetSuggestionCard;
