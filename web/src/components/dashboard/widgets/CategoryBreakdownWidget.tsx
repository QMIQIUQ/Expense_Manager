import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const CategoryBreakdownWidget: React.FC<WidgetProps> = ({ expenses }) => {
  const { t } = useLanguage();

  // Calculate category totals
  const { categories, total } = React.useMemo(() => {
    const byCategory: { [key: string]: number } = {};
    let total = 0;

    expenses.forEach((exp) => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      byCategory[exp.category] += exp.amount;
      total += exp.amount;
    });

    const categories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return { categories, total };
  }, [expenses]);

  if (categories.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>📋</span>
        <p>{t('noCategories')}</p>
      </div>
    );
  }

  return (
    <div className="category-list">
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
            <span className="category-percentage">{percentage.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryBreakdownWidget;
