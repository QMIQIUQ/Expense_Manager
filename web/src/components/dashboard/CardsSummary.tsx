import React from 'react';
import { Card, Category, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { calculateCardStats } from '../../utils/cardUtils';

interface CardsSummaryProps {
  cards: Card[];
  categories: Category[];
  expenses: Expense[];
}

const CardsSummary: React.FC<CardsSummaryProps> = ({ cards, categories, expenses }) => {
  const { t } = useLanguage();

  if (cards.length === 0) {
    return (
      <div 
        className="rounded-lg shadow-sm p-6 border" 
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          💳 {t('creditCards')}
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('noCardsYet')}</p>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg shadow-sm p-6 border" 
      style={{ 
        backgroundColor: 'var(--card-bg)', 
        borderColor: 'var(--border-color)' 
      }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        💳 {t('creditCards')}
      </h3>
      
      <div className="space-y-4">
        {cards.slice(0, 3).map((card) => {
          const stats = calculateCardStats(card, expenses, categories);
          const utilizationPercent = (stats.currentCycleSpending / card.cardLimit) * 100;
          
          return (
            <div 
              key={card.id} 
              className="p-4 rounded-lg border"
              style={{
                background: 'linear-gradient(135deg, var(--accent-light) 0%, var(--icon-bg) 100%)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{card.name}</h4>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {t('billingCycle')}: {stats.nextBillingDate}
                  </p>
                </div>
                {card.cardType === 'cashback' && stats.estimatedTotalCashback > 0 && (
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('estimatedCashback')}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>
                      ${stats.estimatedTotalCashback.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Utilization Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>{t('currentCycleSpending')}: ${stats.currentCycleSpending.toFixed(2)}</span>
                  <span>{utilizationPercent.toFixed(0)}%</span>
                </div>
                <div 
                  className="w-full rounded-full h-2" 
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div
                    className={`h-2 rounded-full transition-all ${
                      utilizationPercent > 80 ? 'bg-red-500' : 
                      utilizationPercent > 50 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{t('availableCredit')}: ${stats.availableCredit.toFixed(2)}</span>
                <span>{t('cardLimit')}: ${card.cardLimit.toLocaleString()}</span>
              </div>

              {/* High Priority Cashback Suggestions */}
              {card.cashbackRules && stats.cashbackByRule.length > 0 && (
                <div 
                  className="mt-3 pt-3 border-t"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  {stats.cashbackByRule
                    .filter(rule => rule.requiredToReachMinSpend > 0 || rule.requiredToReachCap > 0)
                    .slice(0, 2)
                    .map((rule, idx) => (
                      <div key={idx} className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {rule.requiredToReachMinSpend > 0 ? (
                          <span>
                            💡 Spend ${rule.requiredToReachMinSpend.toFixed(0)} more on{' '}
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{rule.categoryName}</span> to unlock higher rate
                          </span>
                        ) : rule.requiredToReachCap > 0 ? (
                          <span>
                            ⭐ Spend ${rule.requiredToReachCap.toFixed(0)} more on{' '}
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{rule.categoryName}</span> to max out rewards
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
          <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
            +{cards.length - 3} {t('more')} cards
          </p>
        )}
      </div>
    </div>
  );
};

export default CardsSummary;
