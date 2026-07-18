import React, { useCallback, useMemo } from 'react';
import type { Category, CurrencyCode, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseDisplaySource, getExpenseBaseCurrency } from '../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../hooks/useCurrencyConversionMap';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ExpensePeriodSummaryProps {
  expenses: Expense[];
  categories: Category[];
  viewMode: 'all' | 'day' | 'month' | 'year';
  selectedDate: string;
  displayCurrency?: CurrencyCode;
}

interface CategoryTotal {
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
}

const getPeriodLabel = (viewMode: ExpensePeriodSummaryProps['viewMode'], selectedDate: string, language: string): string => {
  const date = new Date(`${selectedDate}T00:00:00`);
  const locale = language === 'zh-CN' ? 'zh-CN' : language === 'zh' ? 'zh-TW' : 'en';

  if (viewMode === 'year') return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date);
  if (viewMode === 'month') return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
  if (viewMode === 'day') return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  return language === 'en' ? 'All expenses' : language === 'zh-CN' ? '全部支出' : '全部支出';
};

const getPeriodDays = (viewMode: ExpensePeriodSummaryProps['viewMode'], selectedDate: string): number => {
  const date = new Date(`${selectedDate}T00:00:00`);
  if (viewMode === 'month') return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (viewMode === 'year') return (new Date(date.getFullYear(), 1, 29).getMonth() === 1) ? 366 : 365;
  return 1;
};

const ExpensePeriodSummary: React.FC<ExpensePeriodSummaryProps> = ({
  expenses,
  categories,
  viewMode,
  selectedDate,
  displayCurrency,
}) => {
  const { t, language } = useLanguage();

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
  const averageDaily = total / getPeriodDays(viewMode, selectedDate);

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
    if (viewMode !== 'year') return [];
    const year = selectedDate.slice(0, 4);
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
  }, [expenses, getConvertedAmount, language, selectedDate, viewMode]);

  return (
    <section style={styles.container} aria-label={t('totalExpenses')}>
      <div style={styles.titleRow}>
        <div>
          <h3 style={styles.title}>{getPeriodLabel(viewMode, selectedDate, language)}</h3>
          <span style={styles.subtitle}>{t('totalExpenses')}</span>
        </div>
        <strong style={styles.total}>{formatMoney(total, targetCurrency)}</strong>
      </div>

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

      {viewMode === 'year' && (
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
  total: { color: 'var(--error-text, #dc3545)', fontSize: '24px' },
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
