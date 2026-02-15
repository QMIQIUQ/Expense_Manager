import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { calculateCardStats } from '../../../utils/cardUtils';
import { formatDateWithUserFormat } from '../../../utils/dateUtils';
import { WidgetProps } from './types';
import ShowMoreButton from './ShowMoreButton';

type CardSortMode = 'default' | 'spending' | 'cashback-remaining';

const CardsSummaryWidget: React.FC<WidgetProps & { onNavigateToPaymentMethods?: () => void }> = ({ cards, categories, expenses, size = 'full', onNavigateToPaymentMethods }) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const [showAll, setShowAll] = useState(false);
  const [sortMode, setSortMode] = useState<CardSortMode>('default');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onNavigateToPaymentMethods && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onNavigateToPaymentMethods();
    }
  };
  
  // Determine display settings based on size - only 'small' uses compact mode
  const isCompact = size === 'small';
  const maxItems = useMemo(() => {
    switch (size) {
      case 'small':
        return 1;
      case 'medium':
        return 2;
      default:
        return 3;
    }
  }, [size]);

  // Pre-compute stats for all cards (used for sorting)
  const cardStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateCardStats>>();
    cards.forEach(card => {
      map.set(card.id || '', calculateCardStats(card, expenses, categories));
    });
    return map;
  }, [cards, expenses, categories]);

  // Sort cards based on selected mode
  const sortedCards = useMemo(() => {
    const sorted = [...cards];
    if (sortMode === 'spending') {
      sorted.sort((a, b) => {
        const statsA = cardStatsMap.get(a.id || '');
        const statsB = cardStatsMap.get(b.id || '');
        return (statsB?.currentCycleSpending || 0) - (statsA?.currentCycleSpending || 0);
      });
    } else if (sortMode === 'cashback-remaining') {
      sorted.sort((a, b) => {
        const statsA = cardStatsMap.get(a.id || '');
        const statsB = cardStatsMap.get(b.id || '');
        const remainA = statsA?.cashbackByRule.reduce((sum, r) => sum + r.requiredToReachCap, 0) || 0;
        const remainB = statsB?.cashbackByRule.reduce((sum, r) => sum + r.requiredToReachCap, 0) || 0;
        // Cards with remaining cashback first (descending), then cards without
        if (remainA > 0 && remainB === 0) return -1;
        if (remainA === 0 && remainB > 0) return 1;
        return remainB - remainA;
      });
    }
    return sorted;
  }, [cards, sortMode, cardStatsMap]);
  
  // Determine how many cards to display
  const displayCards = showAll ? sortedCards : sortedCards.slice(0, maxItems);

  if (cards.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>💳</span>
        <p>{t('noCards')}</p>
      </div>
    );
  }

  return (
    <div className={`cards-summary-widget ${isCompact ? 'cards-summary-compact' : ''}`}>
      {/* Sort controls */}
      {cards.length > 1 && !isCompact && (
        <div className="cards-sort-controls" style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '10px',
          flexWrap: 'wrap',
        }}>
          {(['default', 'spending', 'cashback-remaining'] as CardSortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={(e) => { e.stopPropagation(); setSortMode(mode); }}
              className={`cards-sort-btn ${sortMode === mode ? 'active' : ''}`}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                border: `1px solid ${sortMode === mode ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: sortMode === mode ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: sortMode === mode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: sortMode === mode ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {mode === 'default' ? t('defaultSort') :
               mode === 'spending' ? t('sortBySpending') :
               t('sortByCashbackRemaining')}
            </button>
          ))}
        </div>
      )}
      {displayCards.map((card) => {
        const stats = cardStatsMap.get(card.id || '') || calculateCardStats(card, expenses, categories);
        const utilizationPercent = card.cardLimit > 0 
          ? (stats.currentCycleSpending / card.cardLimit) * 100 
          : 0;

        return (
          <div
            key={card.id}
            className={`credit-card-summary-item ${onNavigateToPaymentMethods ? 'clickable' : ''}`}
            onClick={onNavigateToPaymentMethods}
            onKeyDown={handleKeyDown}
            role={onNavigateToPaymentMethods ? 'button' : undefined}
            tabIndex={onNavigateToPaymentMethods ? 0 : undefined}
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

      <ShowMoreButton
        totalCount={cards.length}
        visibleCount={maxItems}
        isExpanded={showAll}
        onToggle={() => setShowAll(!showAll)}
        itemLabel={t('cards')}
      />
    </div>
  );
};

export default CardsSummaryWidget;
