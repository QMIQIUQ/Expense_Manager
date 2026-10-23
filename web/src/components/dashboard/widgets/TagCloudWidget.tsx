import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useExpenseTags } from '../../../hooks/useExpenseTags';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import { getBillingCycleRange } from './utils';

const TagCloudWidget: React.FC<WidgetProps> = ({
  expenses,
  billingCycleDay = 1,
  size = 'medium',
  onNavigateToExpenses,
}) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { rows: definitions } = useExpenseTags(currentUser?.uid);
  const isCompact = size === 'small';

  const tags = React.useMemo(() => {
    const { cycleStart, cycleEnd } = getBillingCycleRange(billingCycleDay);
    const cycleExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= cycleStart && expDate <= cycleEnd;
    });

    const freq = new Map<string, { category: string; count: number; color: string }>();
    cycleExpenses.forEach((exp) => {
      (exp.tagIds ?? []).forEach((id) => {
        const tag = definitions.find((item) => item.id === id);
        if (!tag) return;
        const previous = freq.get(id);
        freq.set(id, { category: tag.name, count: (previous?.count ?? 0) + 1, color: tag.color });
      });
    });

    const maxTags = isCompact ? 6 : 10;
    return Array.from(freq.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, maxTags);
  }, [expenses, definitions, billingCycleDay, isCompact]);

  if (tags.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>🏷️</span>
        <p>{t('noTagData')}</p>
      </div>
    );
  }

  const maxCount = tags[0]?.count || 1;
  const minCount = tags[tags.length - 1]?.count || 1;

  const getFontSize = (count: number): number => {
    if (maxCount === minCount) return 15;
    return Math.round(12 + ((count - minCount) / (maxCount - minCount)) * 6);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onNavigateToExpenses && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onNavigateToExpenses();
    }
  };

  return (
    <div className="tag-cloud-widget" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {tags.map((tag, index) => (
        <div
          key={index}
          className={`tag-item ${onNavigateToExpenses ? 'clickable' : ''}`}
          onClick={onNavigateToExpenses}
          onKeyDown={handleKeyDown}
          role={onNavigateToExpenses ? 'button' : undefined}
          tabIndex={onNavigateToExpenses ? 0 : undefined}
          aria-label={onNavigateToExpenses ? `${tag.category} (${tag.count})` : undefined}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: `${getFontSize(tag.count)}px`,
            color: tag.color,
            cursor: onNavigateToExpenses ? 'pointer' : 'default',
            transition: 'transform 0.2s',
          }}
        >
          {tag.category} ({tag.count})
        </div>
      ))}
    </div>
  );
};

export default TagCloudWidget;
