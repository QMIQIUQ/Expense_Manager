import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const CardsSummaryWidget: React.FC<WidgetProps> = ({ cards, expenses, billingCycleDay = 1 }) => {
  const { t } = useLanguage();

  // Calculate billing cycle
  const { cycleStart, cycleEnd } = React.useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();

    let cycleStart: Date;
    let cycleEnd: Date;

    if (currentDay >= billingCycleDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay - 1);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay - 1);
    }

    return { cycleStart, cycleEnd };
  }, [billingCycleDay]);

  // Calculate card usage
  const cardSummaries = React.useMemo(() => {
    return cards.map((card) => {
      const cardExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.date);
        const matchesCard = exp.cardId === card.id;
        const inCycle = expDate >= cycleStart && expDate <= cycleEnd;
        return matchesCard && inCycle;
      });

      const spent = cardExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const utilization = card.cardLimit > 0 ? (spent / card.cardLimit) * 100 : 0;
      // Calculate basic cashback (simplified - actual calculation would need cashbackRules)
      const cashback = card.cashbackRules?.length ? spent * 0.01 : 0; // Assume 1% default

      return {
        ...card,
        spent,
        utilization,
        cashback,
        transactionCount: cardExpenses.length,
      };
    });
  }, [cards, expenses, cycleStart, cycleEnd]);

  if (cardSummaries.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>💳</span>
        <p>{t('noCards')}</p>
      </div>
    );
  }

  return (
    <div className="cards-summary-list">
      {cardSummaries.map((card) => (
        <div key={card.id} className="credit-card-summary-item">
          <div className="card-summary-header">
            <span className="card-name">{card.name}</span>
            <span className="card-meta">
              {card.transactionCount} {t('transactions')}
            </span>
          </div>

          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-label">{t('spent')}</span>
              <span className="stat-value">${card.spent.toFixed(2)}</span>
            </div>
            {card.cardLimit > 0 && (
              <div className="stat-item">
                <span className="stat-label">{t('limit')}</span>
                <span className="stat-value">${card.cardLimit.toFixed(2)}</span>
              </div>
            )}
            {card.cashback > 0 && (
              <div className="stat-item">
                <span className="stat-label">{t('cashback')}</span>
                <span className="stat-value success-text">${card.cashback.toFixed(2)}</span>
              </div>
            )}
          </div>

          {card.cardLimit > 0 && (
            <div className="utilization-section">
              <div className="utilization-info">
                <span>{t('utilization')}</span>
                <span className={card.utilization > 80 ? 'error-text' : card.utilization > 50 ? 'warning-text' : 'success-text'}>
                  {card.utilization.toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${card.utilization > 80 ? 'error-bg' : card.utilization > 50 ? 'warning-bg' : 'success-bg'}`}
                  style={{ width: `${Math.min(100, card.utilization)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CardsSummaryWidget;
