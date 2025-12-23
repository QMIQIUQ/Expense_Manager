import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import ShowMoreButton from './ShowMoreButton';
import { getBillingCycleRange } from './utils';

const CategoryBreakdownWidget: React.FC<WidgetProps> = ({ expenses, billingCycleDay = 1, size = 'medium' }) => {
  const { t } = useLanguage();
  
  const [showAll, setShowAll] = useState(false);

  const { cycleStart, cycleEnd } = React.useMemo(
    () => getBillingCycleRange(billingCycleDay),
    [billingCycleDay]
  );

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= cycleStart && expDate <= cycleEnd;
    });
  }, [expenses, cycleStart, cycleEnd]);

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
      byCategory[exp.category] += exp.amount;
      total += exp.amount;
    });

    const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

    return { allCategories: sorted, total };
  }, [filteredExpenses]);

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
          <div key={category} className="category-item">
            <div className="category-info">
              <span className="category-name">{category}</span>
              <span className="category-amount error-text">${amount.toFixed(2)}</span>
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
