import React, { useCallback, useId, useMemo, useState } from 'react';
import type { Category, CurrencyCode, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseDisplaySource, getExpenseBaseCurrency } from '../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../hooks/useCurrencyConversionMap';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronDownIcon, ChevronUpIcon } from '../icons';
import type { ExpensePeriodSelection } from '../../types/expensePeriod';
import { countInclusiveDays, getExpensePeriodBounds } from '../../utils/expensePeriodUtils';
import { getTodayLocal } from '../../utils/dateUtils';

interface ExpensePeriodSummaryProps {
  expenses: Expense[];
  categories: Category[];
  period: ExpensePeriodSelection;
  displayCurrency?: CurrencyCode;
}

interface CategoryTotal {
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
}

const getPeriodLabel = (period: ExpensePeriodSelection, language: string): string => {
  const viewMode = period.mode;
  const selectedDate = period.anchorDate;
  const date = new Date(`${selectedDate}T00:00:00`);
  const locale = language === 'zh-CN' ? 'zh-CN' : language === 'zh' ? 'zh-TW' : 'en';

  if (viewMode === 'year') return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date);
  if (viewMode === 'month') return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
  if (viewMode === 'day') return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  if (viewMode === 'range' && period.startDate && period.endDate) {
    const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    return `${formatter.format(new Date(`${period.startDate}T00:00:00`))} – ${formatter.format(new Date(`${period.endDate}T00:00:00`))}`;
  }
  return language === 'en' ? 'All expenses' : language === 'zh-CN' ? '全部支出' : '全部支出';
};

const getPeriodDays = (period: ExpensePeriodSelection, expenses: Expense[]): number => {
  const configuredBounds = getExpensePeriodBounds(period);
  if (!configuredBounds) {
    if (expenses.length === 0) return 1;
    const dates = expenses.map((expense) => expense.date).sort();
    return countInclusiveDays(dates[0], dates[dates.length - 1]);
  }

  const today = getTodayLocal();
  const endDate = configuredBounds.startDate <= today && configuredBounds.endDate > today
    ? today
    : configuredBounds.endDate;
  return countInclusiveDays(configuredBounds.startDate, endDate);
};

const ExpensePeriodSummary: React.FC<ExpensePeriodSummaryProps> = ({
  expenses,
  categories,
  period,
  displayCurrency,
}) => {
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();

  const baseCurrency = getExpenseBaseCurrency(expenses[0] || { baseCurrency: DEFAULT_BASE_CURRENCY });
  const targetCurrency = displayCurrency || baseCurrency;
  const conversionEntries = useMemo(
    () => expenses.map((expense, index) => {
      const displaySource = getExpenseDisplaySource(expense, targetCurrency);
      return {
        key: expense.id || `${expense.date}-${index}`,
        amount: displaySource.amount,
        sourceCurrency: displaySource.sourceCurrency,
        date: expense.date,
      };
    }),
    [expenses, targetCurrency]
  );
  const convertedAmounts = useCurrencyConversionMap(conversionEntries, targetCurrency);
  const getConvertedAmount = useCallback((expense: Expense, index: number): number => {
    const key = expense.id || `${expense.date}-${index}`;
    const displaySource = getExpenseDisplaySource(expense, targetCurrency);
    return convertedAmounts[key] ?? displaySource.amount;
  }, [convertedAmounts, targetCurrency]);
  const total = useMemo(
    () => expenses.reduce((sum, expense, index) => sum + getConvertedAmount(expense, index), 0),
    [expenses, getConvertedAmount]
  );
  const averageDaily = total / getPeriodDays(period, expenses);

  const categoryTotals = useMemo<CategoryTotal[]>(() => {
    const totals = new Map<string, number>();
    expenses.forEach((expense, index) => {
      totals.set(expense.category, (totals.get(expense.category) || 0) + getConvertedAmount(expense, index));
    });

    return Array.from(totals.entries())
      .map(([name, amount]) => {
        const category = categories.find((item) => item.name === name);
        return {
          name,
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          icon: category?.icon || '💰',
          color: category?.color || 'var(--accent-primary)',
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [categories, expenses, getConvertedAmount, total]);

  const monthlyTotals = useMemo(() => {
    if (period.mode !== 'year') return [];
    const year = period.anchorDate.slice(0, 4);
    return Array.from({ length: 12 }, (_, month) => {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      return {
        month: new Intl.DateTimeFormat(language === 'en' ? 'en' : language === 'zh-CN' ? 'zh-CN' : 'zh-TW', { month: 'short' }).format(new Date(2020, month, 1)),
        amount: expenses
          .map((expense, index) => ({ expense, index }))
          .filter(({ expense }) => expense.date.slice(0, 7) === key)
          .reduce((sum, { expense, index }) => sum + getConvertedAmount(expense, index), 0),
      };
    });
  }, [expenses, getConvertedAmount, language, period.anchorDate, period.mode]);

  return (
    <section style={styles.container} aria-label={t('totalExpenses')}>
      <div style={styles.titleRow}>
        <div>
          <h3 style={styles.title}>{getPeriodLabel(period, language)}</h3>
          <span style={styles.subtitle}>{t('totalExpenses')}</span>
        </div>
        <div style={styles.summaryActions}>
          <strong style={styles.total}>{formatMoney(total, targetCurrency)}</strong>
          <button
            type="button"
            style={styles.toggleButton}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            aria-label={isExpanded ? t('collapseSummary') : t('expandSummary')}
            title={isExpanded ? t('collapseSummary') : t('expandSummary')}
          >
            {isExpanded ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div id={detailsId}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>{t('totalExpensesCount')}</span>
              <strong style={styles.statValue}>{expenses.length}</strong>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>{t('dailyAverage')}</span>
              <strong style={styles.statValue}>{formatMoney(averageDaily, targetCurrency)}</strong>
            </div>
          </div>

          {categoryTotals.length > 0 && (
            <div style={styles.categorySection}>
              <h4 style={styles.sectionTitle}>{t('categoryDistribution')}</h4>
              <div style={styles.categoryList}>
                {categoryTotals.slice(0, 6).map((category) => (
                  <div key={category.name} style={styles.categoryRow}>
                    <span style={styles.categoryName}>
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </span>
                    <span style={styles.categoryAmount}>
                      {formatMoney(category.amount, targetCurrency)} · {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {period.mode === 'year' && (
            <div style={styles.chartSection}>
              <h4 style={styles.sectionTitle}>{t('monthlyTrend')}</h4>
              <div style={styles.chart}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTotals} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={48} />
                    <Tooltip formatter={(value: number) => formatMoney(value, targetCurrency)} />
                    <Bar dataKey="amount" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {expenses.length === 0 && <p style={styles.empty}>{t('noExpenses')}</p>}
        </div>
      )}
    </section>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--card-bg, white)',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '12px',
    padding: '16px',
  },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' },
  title: { margin: 0, color: 'var(--text-primary)', fontSize: '18px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '12px' },
  summaryActions: { display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' },
  total: { color: 'var(--error-text, #dc3545)', fontSize: '24px' },
  toggleButton: {
    minWidth: '44px',
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-primary)',
    background: 'var(--accent-light, #e8f0fe)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '9px',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '14px' },
  statCard: { background: 'var(--bg-secondary, #f8f9fa)', borderRadius: '8px', padding: '10px 12px' },
  statLabel: { display: 'block', color: 'var(--text-secondary)', fontSize: '12px' },
  statValue: { display: 'block', color: 'var(--text-primary)', fontSize: '17px', marginTop: '3px' },
  categorySection: { marginTop: '16px' },
  sectionTitle: { margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '14px' },
  categoryList: { display: 'flex', flexDirection: 'column', gap: '7px' },
  categoryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '13px' },
  categoryName: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' },
  categoryAmount: { color: 'var(--text-secondary)', whiteSpace: 'nowrap' },
  chartSection: { marginTop: '16px' },
  chart: { height: '220px', width: '100%' },
  empty: { margin: '16px 0 0', color: 'var(--text-secondary)', fontSize: '13px' },
};

export default ExpensePeriodSummary;
