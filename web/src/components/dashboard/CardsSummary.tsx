import React, { useState } from 'react';
import { Card, Category, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { calculateCardStats } from '../../utils/cardUtils';
import { formatDateWithUserFormat } from '../../utils/dateUtils';
import { ShowMoreButton } from './widgets';
import { formatMoney } from '../../utils/currencyUtils';

interface CardsSummaryProps {
  cards: Card[];
  categories: Category[];
  expenses: Expense[];
}

const CardsSummary: React.FC<CardsSummaryProps> = ({ cards, categories, expenses }) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const [showAll, setShowAll] = useState(false);
  const maxItems = 3;
  
  // Determine how many cards to display
  const displayCards = showAll ? cards : cards.slice(0, maxItems);

  if (cards.length === 0) {
    return (
      <div className="card cards-summary-empty">
        <h3 className="section-title">
          💳 {t('creditCards')}
        </h3>
        <p className="empty-text">{t('noCardsYet')}</p>
      </div>
    );
  }

  return (
    <div className="card cards-summary">
      <h3 className="section-title">
        💳 {t('creditCards')}
      </h3>
      
      <div className="cards-list">
        {displayCards.map((card) => {
          const stats = calculateCardStats(card, expenses, categories);
          const utilizationPercent = (stats.currentCycleSpending / card.cardLimit) * 100;
          
          return (
            <div 
              key={card.id} 
              className="credit-card-summary-item"
            >
              <div className="card-summary-header">
                <div>
                  <h4 className="card-name">{card.name}</h4>
                  <p className="card-meta">
                    {t('billingCycle')}: {formatDateWithUserFormat(stats.nextBillingDate, dateFormat)}
                  </p>
                </div>
                {card.cardType === 'cashback' && stats.estimatedTotalCashback > 0 && (
                  <div className="card-cashback">
                    <p className="cashback-label">{t('estimatedCashback')}</p>
                    <p className="cashback-value">
                      {formatMoney(stats.estimatedTotalCashback, card.currency)}
                    </p>
                  </div>
                )}
              </div>

              {/* Utilization Bar */}
              <div className="utilization-section">
                <div className="utilization-info">
                  <span>{t('currentCycleSpending')}: {formatMoney(stats.currentCycleSpending, card.currency)}</span>
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
                <span>{t('availableCredit')}: {formatMoney(stats.availableCredit, card.currency)}</span>
                <span>{t('cardLimit')}: {formatMoney(card.cardLimit, card.currency)}</span>
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
                            💡 Spend {formatMoney(rule.requiredToReachMinSpend, card.currency)} more on{' '}
                            <span className="highlight-text">{rule.categoryName}</span> to unlock higher rate
                          </span>
                        ) : rule.requiredToReachCap > 0 ? (
                          <span>
                            ⭐ Spend {formatMoney(rule.requiredToReachCap, card.currency)} more on{' '}
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

        <ShowMoreButton
          totalCount={cards.length}
          visibleCount={maxItems}
          isExpanded={showAll}
          onToggle={() => setShowAll(!showAll)}
          itemLabel={t('cards')}
        />
      </div>
    </div>
  );
};

export default CardsSummary;
