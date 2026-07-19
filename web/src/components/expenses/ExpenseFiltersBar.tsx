import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Category } from '../../types';
import type { ExpenseFilterState, ExpensePaymentFilter, ExpenseSort } from '../../types/expensePeriod';
import { DEFAULT_EXPENSE_FILTERS } from '../../types/expensePeriod';
import { SearchBar } from '../common/SearchBar';

interface ExpenseFiltersBarProps {
  value: ExpenseFilterState;
  onChange: (value: ExpenseFilterState) => void;
  categories: Category[];
  resultCount: number;
}

const PAYMENT_METHODS: ExpensePaymentFilter[] = ['all', 'cash', 'credit_card', 'e_wallet', 'bank'];
const SORT_OPTIONS: ExpenseSort[] = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];

const ExpenseFiltersBar: React.FC<ExpenseFiltersBarProps> = ({ value, onChange, categories, resultCount }) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const categoryNames = useMemo(
    () => Array.from(new Set(categories.map((category) => category.name))).sort((a, b) => a.localeCompare(b)),
    [categories],
  );
  const hasActiveFilters = !!value.query || !!value.category || value.paymentMethod !== 'all' || value.sort !== 'date-desc';

  const update = <K extends keyof ExpenseFilterState>(key: K, nextValue: ExpenseFilterState[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  const paymentLabel = (method: ExpensePaymentFilter): string => {
    if (method === 'all') return t('allPaymentMethods');
    if (method === 'credit_card') return t('creditCard');
    if (method === 'e_wallet') return t('eWallet');
    if (method === 'bank') return t('bankAccount');
    return t('cash');
  };

  const sortLabel = (sort: ExpenseSort): string => {
    if (sort === 'date-asc') return t('sortByDateAsc');
    if (sort === 'amount-desc') return t('sortByAmountDesc');
    if (sort === 'amount-asc') return t('sortByAmountAsc');
    return t('sortByDateDesc');
  };

  return (
    <section className="expense-filter-bar" aria-label={t('filters')}>
      <div className="expense-filter-primary-row">
        <SearchBar
          placeholder={t('searchExpenses')}
          value={value.query}
          onChange={(query) => update('query', query)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="expense-filter-toggle"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {t('filters')} · {resultCount}
        </button>
      </div>

      {expanded && (
        <div className="expense-filter-controls">
          <select value={value.category} onChange={(event) => update('category', event.target.value)} aria-label={t('allCategories')}>
            <option value="">{t('allCategories')}</option>
            {categoryNames.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select
            value={value.paymentMethod}
            onChange={(event) => update('paymentMethod', event.target.value as ExpensePaymentFilter)}
            aria-label={t('paymentMethod')}
          >
            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{paymentLabel(method)}</option>)}
          </select>
          <select value={value.sort} onChange={(event) => update('sort', event.target.value as ExpenseSort)} aria-label={t('sortBy')}>
            {SORT_OPTIONS.map((sort) => <option key={sort} value={sort}>{sortLabel(sort)}</option>)}
          </select>
        </div>
      )}

      {hasActiveFilters && (
        <div className="expense-filter-chips" aria-label={t('filters')}>
          {value.query && <button type="button" onClick={() => update('query', '')}>“{value.query}” ×</button>}
          {value.category && <button type="button" onClick={() => update('category', '')}>{value.category} ×</button>}
          {value.paymentMethod !== 'all' && <button type="button" onClick={() => update('paymentMethod', 'all')}>{paymentLabel(value.paymentMethod)} ×</button>}
          {value.sort !== 'date-desc' && <button type="button" onClick={() => update('sort', 'date-desc')}>{sortLabel(value.sort)} ×</button>}
          <button type="button" className="expense-filter-clear" onClick={() => onChange(DEFAULT_EXPENSE_FILTERS)}>{t('clearFilters')}</button>
        </div>
      )}
    </section>
  );
};

export default ExpenseFiltersBar;
