import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useHistoryPages } from '../../hooks/useHistoryPages';
import { readExpenseAggregate, summarizeCompleteExpensePeriod, type ExpenseAggregate } from '../../services/expenseAggregateService';
import { readCompleteExpensePeriod, expensePeriodReadKey, invalidateExpensePeriodReads, type CompleteExpensePeriod } from '../../services/expensePeriodReadService';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { applyPendingOperations } from '../../utils/pendingOperations';
import { offlineQueue } from '../../utils/offlineQueue';
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
import { filterAndSortExpenses, filterExpenses, filterExpensesByPeriod, getExpensePeriodBounds } from '../../utils/expensePeriodUtils';

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
  const { mode, anchorDate, startDate, endDate } = period;
  const range = useMemo(() => getExpensePeriodBounds({ mode, anchorDate, startDate, endDate }) ?? undefined,
    [mode, anchorDate, startDate, endDate]);
  const history = useHistoryPages('expenses', userId, range, expenses, onHistoryRows);
  const [aggregateState, setAggregate] = useState<{ key: string; value: ExpenseAggregate }>();
  const [summaryError, setSummaryError] = useState<string>();
  const [completePeriod, setCompletePeriod] = useState<CompleteExpensePeriod>();
  const [revision, setRevision] = useState(0);
  const settledQuery = useDebouncedValue(filters.query);
  const committedQuery = userId ? settledQuery : filters.query;
  const membership = useMemo(() => ({ query: committedQuery, category: filters.category,
    paymentMethod: filters.paymentMethod, sort: 'date-desc' as const }),
  [committedQuery, filters.category, filters.paymentMethod]);
  // Sort order changes presentation, never the membership or total of a period.
  const requiresFullSearch = !!membership.query || !!membership.category || membership.paymentMethod !== 'all' || filters.sort !== 'date-desc';
  let readKey: string;
  try { readKey = userId ? expensePeriodReadKey(userId, range) : ''; }
  catch { readKey = JSON.stringify([userId, range, revision, 'incomplete']); }
  const completeRows = completePeriod?.key === readKey ? completePeriod.rows : undefined;
  // Keep accepted local edits visible while their replacement server snapshot is in flight.
  // Reapplying expense operations is idempotent by document ID; removing an acknowledged
  // operation must not revert this projection to the older confirmed baseline.
  const displayPeriod = useRef<{ scope: string; source?: CompleteExpensePeriod; revision: number; rows: Expense[] }>();
  const displayScope = JSON.stringify([userId, range]);
  if (displayPeriod.current?.scope !== displayScope) displayPeriod.current = undefined;
  const displayed = displayPeriod.current;
  if (userId && (completeRows || displayed) && (!displayed || completeRows && displayed.source !== completePeriod || displayed.revision !== offlineQueue.expenseRevision(userId))) {
    displayPeriod.current = { scope: displayScope, source: completeRows ? completePeriod : displayed?.source,
      revision: offlineQueue.expenseRevision(userId), rows: applyPendingOperations('expenses', userId, completeRows ?? displayed!.rows) };
  }
  const savedPeriodRows = displayPeriod.current?.rows;
  const aggregateKey = JSON.stringify([readKey, displayCurrency, membership.query, membership.category, membership.paymentMethod, !!completeRows, revision]);
  const aggregate = aggregateState?.key === aggregateKey ? aggregateState.value : undefined;
  const resultFilters = useMemo(() => ({ ...membership, sort: filters.sort }), [membership, filters.sort]);
  const historyCallback = useRef(onHistoryRows); historyCallback.current = onHistoryRows;
  const publishingHistory = useRef(false);
  const retrySummary = () => { if (userId) invalidateExpensePeriodReads(userId); setRevision((value) => value + 1); };
  useEffect(() => () => { if (userId) invalidateExpensePeriodReads(userId); }, [userId]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastExpenseRevision = userId ? offlineQueue.expenseRevision(userId) : 0;
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ entities?: string[]; entity?: string; userId?: string }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      if (event.type === 'session-cache-updated' && (publishingHistory.current || detail?.entity !== 'expenses' || detail.userId !== userId)) return;
      if (event.type === 'offline-queue-changed' && detail?.entities && !detail.entities.some((entity) => ['expense', 'scheduledPaymentRecord'].includes(entity))) return;
      if (event.type === 'offline-queue-changed' || event.type === 'offline-operations-synced') {
        const nextRevision = userId ? offlineQueue.expenseRevision(userId) : 0;
        if (nextRevision === lastExpenseRevision) return;
        lastExpenseRevision = nextRevision;
      }
      if (userId) invalidateExpensePeriodReads(userId);
      clearTimeout(timer); timer = setTimeout(() => setRevision((value) => value + 1), 75);
    };
    window.addEventListener('offline-queue-changed', changed);
    window.addEventListener('offline-operations-synced', changed);
    window.addEventListener('online', changed);
    window.addEventListener('session-cache-updated', changed);
    return () => { clearTimeout(timer); window.removeEventListener('offline-queue-changed', changed); window.removeEventListener('offline-operations-synced', changed); window.removeEventListener('online', changed); window.removeEventListener('session-cache-updated', changed); };
  }, [userId]);
  useEffect(() => {
    if (!userId || !requiresFullSearch || completeRows) return;
    let current = true;
    void readCompleteExpensePeriod(userId, range).then((snapshot) => {
      if (!current) return;
      setCompletePeriod(snapshot);
      if (networkStatus.isOnline) {
        publishingHistory.current = true;
        try { historyCallback.current?.(snapshot.rows); } finally { publishingHistory.current = false; }
      }
    }).catch((error) => { if (current) setSummaryError(String(error)); });
    return () => { current = false; };
  }, [userId, range, readKey, requiresFullSearch, completeRows, revision]);
  useEffect(() => {
    if (!userId) return;
    let current = true;
    setSummaryError(undefined);
    if (requiresFullSearch && !completeRows) return;
    const select = (rows: Expense[]) => filterExpenses(rows, membership, { cards, ewallets, banks });
    const isCurrent = () => {
      if (!current) return false;
      try { return expensePeriodReadKey(userId, range) === readKey; } catch { return false; }
    };
    const summary = completeRows
      ? summarizeCompleteExpensePeriod(userId, completeRows, displayCurrency, range, select, isCurrent)
      : readExpenseAggregate(userId, displayCurrency, range, select, isCurrent);
    void summary.then((value) => { if (isCurrent()) setAggregate({ key: aggregateKey, value }); })
      .catch((error) => { if (current) setSummaryError(error instanceof Error ? error.message : String(error)); });
    return () => { current = false; };
  // Sorting is deliberately absent: it cannot change the financial total.
  }, [userId, range, readKey, aggregateKey, membership, requiresFullSearch, cards, ewallets, banks, displayCurrency, completeRows]);
  useEffect(() => { setVisibleCount(100); }, [period, filters]);

  const sourceRows = userId ? savedPeriodRows ?? history.rows : expenses;
  const periodExpenses = useMemo(() => filterExpensesByPeriod(sourceRows, period), [sourceRows, period]);
  const visibleExpenses = useMemo(
    () => filterAndSortExpenses(periodExpenses, resultFilters, { cards, ewallets, banks }),
    [banks, cards, ewallets, resultFilters, periodExpenses],
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
      {userId && !aggregate && <p role="status">{summaryError || t('loading')} {summaryError && <button type="button" onClick={retrySummary}>{t('retry')}</button>}</p>}

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
      {userId && filters.query !== membership.query && <p role="status">{t('loading')}</p>}

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
