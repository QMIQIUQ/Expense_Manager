import React, { useMemo, useState, useEffect } from 'react';
import { useHistoryPages } from '../../hooks/useHistoryPages';
import { readExpenseAggregate, type ExpenseAggregate } from '../../services/expenseAggregateService';
import { readHistoryRange } from '../../services/historyService';
import { applyPendingOperations } from '../../utils/pendingOperations';
import { networkStatus } from '../../utils/networkStatus';
import DateNavigator from '../../components/expenses/DateNavigator';
import ExpenseFiltersBar from '../../components/expenses/ExpenseFiltersBar';
import ExpenseList from '../../components/expenses/ExpenseList';
import ExpensePeriodSummary from '../../components/expenses/ExpensePeriodSummary';
import { useLanguage } from '../../contexts/LanguageContext';
import type {
  Bank,
  Card,
  Category,
  CurrencyCode,
  EWallet,
  Expense,
  Repayment,
  Transfer,
} from '../../types';
import type { QuickExpensePreset } from '../../types/quickExpense';
import { DEFAULT_EXPENSE_FILTERS, type ExpenseFilterState, type ExpensePeriodSelection } from '../../types/expensePeriod';
import { filterAndSortExpenses, filterExpensesByPeriod, getExpensePeriodBounds } from '../../utils/expensePeriodUtils';

interface ExpensesTabProps {
  userId?: string;
  onHistoryRows?: (rows: Expense[]) => void;
  totalsComplete?: boolean;
  expenses: Expense[];
  categories: Category[];
  cards: Card[];
  ewallets: EWallet[];
  banks: Bank[];
  repayments: Repayment[];
  transfers: Transfer[];
  period: ExpensePeriodSelection;
  onPeriodChange: (period: ExpensePeriodSelection) => void;
  initialCategory?: string;
  displayCurrency: CurrencyCode;
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<Expense>) => void;
  onBulkDelete: (ids: string[]) => void;
  onReloadRepayments: () => void;
  onCreateCard: () => void;
  onCreateEWallet: () => void;
  onCreateBank?: () => void;
  onAddTransfer: (transfer: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, silent?: boolean) => Promise<void>;
  focusExpenseId?: string;
  quickExpensePresets: QuickExpensePreset[];
  onQuickExpenseAdd: (preset: QuickExpensePreset) => Promise<void>;
  onQuickExpensePresetsChange: () => void;
  onManageQuickExpenses: () => void;
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({
  userId,
  onHistoryRows,
  totalsComplete = true,
  expenses,
  categories,
  cards,
  ewallets,
  banks,
  repayments,
  transfers,
  period,
  onPeriodChange,
  initialCategory = '',
  displayCurrency,
  onDelete,
  onInlineUpdate,
  onBulkDelete,
  onReloadRepayments,
  onCreateCard,
  onCreateEWallet,
  onCreateBank,
  onAddTransfer,
  focusExpenseId,
  quickExpensePresets,
  onQuickExpenseAdd,
  onQuickExpensePresetsChange,
  onManageQuickExpenses,
}) => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<ExpenseFilterState>(() => ({
    ...DEFAULT_EXPENSE_FILTERS,
    category: initialCategory,
  }));
  const [visibleCount, setVisibleCount] = useState(100);
  const range = getExpensePeriodBounds(period) ?? undefined;
  const history = useHistoryPages('expenses', userId, range, expenses, onHistoryRows);
  const [aggregate, setAggregate] = useState<ExpenseAggregate>();
  const [summaryError, setSummaryError] = useState<string>();
  const [completeRows, setCompleteRows] = useState<Expense[]>();
  const [revision, setRevision] = useState(0);
  const requiresFullSearch = !!filters.query || !!filters.category || filters.paymentMethod !== 'all' || filters.sort !== 'date-desc';
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ entities?: string[]; entity?: string; userId?: string }>).detail;
      if (event.type === 'session-cache-updated' && (networkStatus.isOnline || detail?.entity !== 'expenses' || detail.userId !== userId)) return;
      if (event.type === 'offline-queue-changed' && detail?.entities && !detail.entities.some((entity) => ['expense', 'scheduledPaymentRecord'].includes(entity))) return;
      clearTimeout(timer); timer = setTimeout(() => setRevision((value) => value + 1), 75);
    };
    window.addEventListener('offline-queue-changed', changed);
    window.addEventListener('offline-operations-synced', changed);
    window.addEventListener('online', changed);
    window.addEventListener('session-cache-updated', changed);
    return () => { clearTimeout(timer); window.removeEventListener('offline-queue-changed', changed); window.removeEventListener('offline-operations-synced', changed); window.removeEventListener('online', changed); window.removeEventListener('session-cache-updated', changed); };
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let current = true;
    setAggregate(undefined); setSummaryError(undefined); setCompleteRows(undefined);
    const selectedRange = getExpensePeriodBounds(period) ?? undefined;
    void readExpenseAggregate(userId, displayCurrency, selectedRange,
      (rows) => filterAndSortExpenses(rows, filters, { cards, ewallets, banks }), () => current)
      .then((value) => { if (current) setAggregate(value); })
      .catch((error) => { if (current) setSummaryError(error instanceof Error ? error.message : String(error)); });
    // Global text search and alternative sorting explicitly request the full selected period.
    if (requiresFullSearch) void readHistoryRange<Expense>('expenses', userId, selectedRange).then((rows) => {
      if (!current) return;
      setCompleteRows(rows); onHistoryRows?.(rows);
    }).catch((error) => { if (current) setSummaryError(String(error)); });
    return () => { current = false; };
  }, [userId, period, filters, cards, ewallets, banks, displayCurrency, requiresFullSearch, revision, onHistoryRows]);
  useEffect(() => { setVisibleCount(100); }, [period, filters]);

  const periodExpenses = useMemo(
    () => filterExpensesByPeriod(userId ? completeRows ? applyPendingOperations('expenses', userId, completeRows) : history.rows : expenses, period),
    [completeRows, expenses, history.rows, period, userId],
  );
  const visibleExpenses = useMemo(
    () => filterAndSortExpenses(periodExpenses, filters, { cards, ewallets, banks }),
    [banks, cards, ewallets, filters, periodExpenses],
  );
  const hasActiveFilters = !!filters.query
    || !!filters.category
    || filters.paymentMethod !== 'all';

  return (
    <div className="expense-page-workspace">
      <DateNavigator value={period} onChange={onPeriodChange} />
      {(userId ? !!aggregate : totalsComplete) && <ExpensePeriodSummary
        aggregate={aggregate}
        expenses={userId ? [] : visibleExpenses}
        categories={categories}
        period={period}
        displayCurrency={displayCurrency}
      />}
      {userId && !aggregate && <p role="status">{summaryError || t('loading')} {summaryError && <button type="button" onClick={() => setRevision((value) => value + 1)}>{t('retry')}</button>}</p>}

      <div className="expense-page-heading">
        <h2>{t('expenseHistory')}</h2>
      </div>
      {history.incomplete && <p role="status">{t('cachedHistoryIncomplete')}</p>}

      <ExpenseFiltersBar
        value={filters}
        onChange={setFilters}
        categories={categories}
        resultCount={aggregate?.count ?? visibleExpenses.length}
      />

      <ExpenseList
        expenses={visibleExpenses.slice(0, visibleCount)}
        allExpenses={expenses}
        categories={categories}
        cards={cards}
        ewallets={ewallets}
        banks={banks}
        repayments={repayments}
        transfers={transfers}
        displayCurrency={displayCurrency}
        onDelete={onDelete}
        onInlineUpdate={onInlineUpdate}
        onBulkDelete={onBulkDelete}
        onReloadRepayments={onReloadRepayments}
        onCreateCard={onCreateCard}
        onCreateEWallet={onCreateEWallet}
        onCreateBank={onCreateBank}
        onAddTransfer={onAddTransfer}
        focusExpenseId={focusExpenseId}
        quickExpensePresets={quickExpensePresets}
        onQuickExpenseAdd={onQuickExpenseAdd}
        onQuickExpensePresetsChange={onQuickExpensePresetsChange}
        onManageQuickExpenses={onManageQuickExpenses}
        viewMode={period.mode}
        selectedDate={period.anchorDate}
        prefiltered
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => setFilters(DEFAULT_EXPENSE_FILTERS)}
      />
      {history.error && <p role="alert">{history.error} <button onClick={history.retry}>{t('retry')}</button></p>}
      {(visibleCount < visibleExpenses.length || (!requiresFullSearch && history.hasMore)) && <button type="button" disabled={history.loading} className="btn btn-secondary" onClick={() => { setVisibleCount((count) => count + 100); if (!requiresFullSearch && visibleCount >= visibleExpenses.length) void history.loadMore(); }}>
        {t('showMore')} ({Math.min(visibleCount, visibleExpenses.length)} / {aggregate?.count ?? (history.hasMore ? '…' : visibleExpenses.length)})
      </button>}
    </div>
  );
};

export default ExpensesTab;
