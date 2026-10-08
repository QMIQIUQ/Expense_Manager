import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import ShowMoreButton from './ShowMoreButton';
import { getBillingCycleRange } from './utils';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getExpenseDisplaySource } from '../../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../../hooks/useCurrencyConversionMap';
import { sortCategoryEntries } from '../../../utils/categoryOrder';

const CategoryBreakdownWidget: React.FC<WidgetProps> = ({ expenses, categories: configuredCategories, billingCycleDay, size = 'medium', onNavigateToExpenseCategory, displayCurrency }) => {
  const { t } = useLanguage();
  
  const [showAll, setShowAll] = useState(false);

  const { cycleStart, cycleEnd } = React.useMemo(
    () => getBillingCycleRange(billingCycleDay ?? 1),
    [billingCycleDay]
  );

  const openCategory = (category: string) => {
    onNavigateToExpenseCategory?.(
      category,
      cycleStart.toISOString().slice(0, 10),
      cycleEnd.toISOString().slice(0, 10),
    );
  };

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
      .map((expense) => {
        const displaySource = getExpenseDisplaySource(expense, displayCurrency);
        return {
          key: expense.id as string,
          amount: displaySource.amount,
          sourceCurrency: displaySource.sourceCurrency,
          date: expense.date,
        };
      });
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
  const { allCategories, rankedCategories, total } = React.useMemo(() => {
    const byCategory: { [key: string]: number } = {};
    let total = 0;

    filteredExpenses.forEach((exp) => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      const displaySource = getExpenseDisplaySource(exp, displayCurrency);
      const amount = displayCurrency
        ? (displaySource.sourceCurrency === displayCurrency
          ? displaySource.amount
          : expenseDisplayAmountsById[exp.id || ''] ?? displaySource.amount)
        : getExpenseBaseAmount(exp);
      byCategory[exp.category] += amount;
      total += amount;
    });

    const ranked = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

    return { allCategories: sortCategoryEntries(ranked, configuredCategories), rankedCategories: ranked, total };
  }, [configuredCategories, displayCurrency, expenseDisplayAmountsById, filteredExpenses]);

  // Keep the highest spending categories in the compact view, then display them in the user's order.
  const categories = showAll ? allCategories : sortCategoryEntries(rankedCategories.slice(0, maxCategories), configuredCategories);

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
          <button
            type="button"
            key={category}
            className={`category-item ${onNavigateToExpenseCategory ? 'clickable' : ''}`}
            onClick={() => openCategory(category)}
            disabled={!onNavigateToExpenseCategory}
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
          </button>
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
