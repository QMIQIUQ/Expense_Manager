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
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">💳 {t('creditCards')}</h3>
        <p className="text-gray-500 text-sm">{t('noCardsYet')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">💳 {t('creditCards')}</h3>
      
      <div className="space-y-4">
        {cards.slice(0, 3).map((card) => {
          const stats = calculateCardStats(card, expenses, categories);
          const utilizationPercent = (stats.currentCycleSpending / card.cardLimit) * 100;
          
          return (
            <div key={card.id} className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-800">{card.name}</h4>
                  <p className="text-xs text-gray-500">{t('billingCycle')}: {stats.nextBillingDate}</p>
                </div>
                {card.cardType === 'cashback' && stats.estimatedTotalCashback > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{t('estimatedCashback')}</p>
                    <p className="text-lg font-bold text-purple-600">
                      ${stats.estimatedTotalCashback.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Utilization Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{t('currentCycleSpending')}: ${stats.currentCycleSpending.toFixed(2)}</span>
                  <span>{utilizationPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      utilizationPercent > 80 ? 'bg-red-500' : 
                      utilizationPercent > 50 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-600">
                <span>{t('availableCredit')}: ${stats.availableCredit.toFixed(2)}</span>
                <span>{t('cardLimit')}: ${card.cardLimit.toLocaleString()}</span>
              </div>

              {/* High Priority Cashback Suggestions */}
              {card.cashbackRules && stats.cashbackByRule.length > 0 && (
                <div className="mt-3 pt-3 border-t border-indigo-100">
                  {stats.cashbackByRule
                    .filter(rule => rule.requiredToReachMinSpend > 0 || rule.requiredToReachCap > 0)
                    .slice(0, 2)
                    .map((rule, idx) => (
                      <div key={idx} className="text-xs text-gray-600 mb-1">
                        {rule.requiredToReachMinSpend > 0 ? (
                          <span>
                            💡 Spend ${rule.requiredToReachMinSpend.toFixed(0)} more on{' '}
                            <span className="font-medium">{rule.categoryName}</span> to unlock higher rate
                          </span>
                        ) : rule.requiredToReachCap > 0 ? (
                          <span>
                            ⭐ Spend ${rule.requiredToReachCap.toFixed(0)} more on{' '}
                            <span className="font-medium">{rule.categoryName}</span> to max out rewards
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
          <p className="text-sm text-gray-500 text-center">
            +{cards.length - 3} {t('more')} cards
          </p>
        )}
      </div>
    </div>
  );
};

export default CardsSummary;
