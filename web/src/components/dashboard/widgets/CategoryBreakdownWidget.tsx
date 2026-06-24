import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import ShowMoreButton from './ShowMoreButton';
import { getBillingCycleRange } from './utils';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getExpenseBaseCurrency } from '../../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../../hooks/useCurrencyConversionMap';

const CategoryBreakdownWidget: React.FC<WidgetProps> = ({ expenses, billingCycleDay, size = 'medium', onNavigateToExpenses, displayCurrency }) => {
  const { t } = useLanguage();
  
  const [showAll, setShowAll] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onNavigateToExpenses && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onNavigateToExpenses();
    }
  };

  const { cycleStart, cycleEnd } = React.useMemo(
    () => getBillingCycleRange(billingCycleDay ?? 1),
    [billingCycleDay]
  );

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= cycleStart && expDate <= cycleEnd;
    });
  }, [expenses, cycleStart, cycleEnd]);

  const expenseDisplayEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return filteredExpenses
      .filter((expense) => !!expense.id)
      .map((expense) => ({
        key: expense.id as string,
        amount: getExpenseBaseAmount(expense),
        sourceCurrency: getExpenseBaseCurrency(expense),
        date: expense.date,
      }));
  }, [displayCurrency, filteredExpenses]);

  const expenseDisplayAmountsById = useCurrencyConversionMap(expenseDisplayEntries, displayCurrency);

  // Determine how many categories to show initially based on size
  const maxCategories = React.useMemo(() => {
    switch (size) {
      case 'small':
        return 3;
      case 'large':
      case 'full':
        return 8;
      default:
        return 3;
    }
  }, [size]);

  // Calculate category totals
  const { allCategories, total } = React.useMemo(() => {
    const byCategory: { [key: string]: number } = {};
    let total = 0;

    filteredExpenses.forEach((exp) => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      const amount = displayCurrency
        ? (expenseDisplayAmountsById[exp.id || ''] ?? getExpenseBaseAmount(exp))
        : getExpenseBaseAmount(exp);
      byCategory[exp.category] += amount;
      total += amount;
    });

    const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

    return { allCategories: sorted, total };
  }, [displayCurrency, expenseDisplayAmountsById, filteredExpenses]);

  // Determine which categories to display (respect showAll state)
  const categories = showAll ? allCategories : allCategories.slice(0, maxCategories);

  if (categories.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>📋</span>
        <p>{t('noCategories')}</p>
      </div>
    );
  }

  return (
    <div className={`category-list ${size === 'small' ? 'category-list-compact' : ''}`}>
      {categories.map(([category, amount]) => {
        const percentage = total > 0 ? (amount / total) * 100 : 0;
        return (
          <div
            key={category}
            className={`category-item ${onNavigateToExpenses ? 'clickable' : ''}`}
            onClick={onNavigateToExpenses}
            onKeyDown={handleKeyDown}
            role={onNavigateToExpenses ? 'button' : undefined}
            tabIndex={onNavigateToExpenses ? 0 : undefined}
          >
            <div className="category-info">
              <span className="category-name">{category}</span>
              <span className="category-amount error-text">{formatMoney(amount, displayCurrency || DEFAULT_BASE_CURRENCY)}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {size !== 'small' && (
              <span className="category-percentage">{percentage.toFixed(1)}%</span>
            )}
          </div>
        );
      })}

      <ShowMoreButton
        totalCount={allCategories.length}
        visibleCount={maxCategories}
        isExpanded={showAll}
        onToggle={() => setShowAll(!showAll)}
      />
    </div>
  );
};

export default CategoryBreakdownWidget;
