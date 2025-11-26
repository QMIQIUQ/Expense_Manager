import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { calculateCardStats } from '../../../utils/cardUtils';
import { WidgetProps } from './types';

const CardsSummaryWidget: React.FC<WidgetProps> = ({ cards, categories, expenses }) => {
  const { t } = useLanguage();

  if (cards.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>💳</span>
        <p>{t('noCards')}</p>
      </div>
    );
  }

  return (
    <div className="cards-summary-widget">
      {cards.slice(0, 3).map((card) => {
        const stats = calculateCardStats(card, expenses, categories);
        const utilizationPercent = card.cardLimit > 0 
          ? (stats.currentCycleSpending / card.cardLimit) * 100 
          : 0;

        return (
          <div key={card.id} className="credit-card-summary-item">
            <div className="card-summary-header">
              <div>
                <h4 className="card-name">{card.name}</h4>
                <p className="card-meta">
                  {t('billingCycle')}: {stats.nextBillingDate}
                </p>
              </div>
              {card.cardType === 'cashback' && stats.estimatedTotalCashback > 0 && (
                <div className="card-cashback">
                  <p className="cashback-label">{t('estimatedCashback')}</p>
                  <p className="cashback-value">
                    ${stats.estimatedTotalCashback.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Utilization Bar */}
            <div className="utilization-section">
              <div className="utilization-info">
                <span>{t('currentCycleSpending')}: ${stats.currentCycleSpending.toFixed(2)}</span>
                <span>{utilizationPercent.toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${
                    utilizationPercent > 80 ? 'error-bg' : 
                    utilizationPercent > 50 ? 'warning-bg' : 'success-bg'
                  }`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
            </div>

            <div className="card-limits">
              <span>{t('availableCredit')}: ${stats.availableCredit.toFixed(2)}</span>
              <span>{t('cardLimit')}: ${card.cardLimit.toLocaleString()}</span>
            </div>

            {/* High Priority Cashback Suggestions */}
            {card.cashbackRules && stats.cashbackByRule.length > 0 && (
              <div className="cashback-suggestions">
                {stats.cashbackByRule
                  .filter(rule => rule.requiredToReachMinSpend > 0 || rule.requiredToReachCap > 0)
                  .slice(0, 2)
                  .map((rule, idx) => (
                    <div key={idx} className="suggestion-item">
                      {rule.requiredToReachMinSpend > 0 ? (
                        <span>
                          💡 Spend ${rule.requiredToReachMinSpend.toFixed(0)} more on{' '}
                          <span className="highlight-text">{rule.categoryName}</span> to unlock higher rate
                        </span>
                      ) : rule.requiredToReachCap > 0 ? (
                        <span>
                          ⭐ Spend ${rule.requiredToReachCap.toFixed(0)} more on{' '}
                          <span className="highlight-text">{rule.categoryName}</span> to max out rewards
                        </span>
                      ) : null}
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {cards.length > 3 && (
        <p className="more-cards-text">
          +{cards.length - 3} {t('more')} {t('cards')}
        </p>
      )}
    </div>
  );
};

export default CardsSummaryWidget;
