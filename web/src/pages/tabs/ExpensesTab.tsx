import React, { useMemo, useState } from 'react';
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
import { filterAndSortExpenses, filterExpensesByPeriod } from '../../utils/expensePeriodUtils';

interface ExpensesTabProps {
  expenses: Expense[];
  categories: Category[];
  cards: Card[];
  ewallets: EWallet[];
  banks: Bank[];
  repayments: Repayment[];
  transfers: Transfer[];
  period: ExpensePeriodSelection;
  onPeriodChange: (period: ExpensePeriodSelection) => void;
  displayCurrency: CurrencyCode;
  onDisplayCurrencyChange: (currency: CurrencyCode) => void;
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<Expense>) => void;
  onBulkDelete: (ids: string[]) => void;
  onReloadRepayments: () => void;
  onCreateCard: () => void;
  onCreateEWallet: () => void;
  onAddTransfer: (transfer: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, silent?: boolean) => Promise<void>;
  focusExpenseId?: string;
  quickExpensePresets: QuickExpensePreset[];
  onQuickExpenseAdd: (preset: QuickExpensePreset) => Promise<void>;
  onQuickExpensePresetsChange: () => void;
  onManageQuickExpenses: () => void;
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenses,
  categories,
  cards,
  ewallets,
  banks,
  repayments,
  transfers,
  period,
  onPeriodChange,
  displayCurrency,
  onDisplayCurrencyChange,
  onDelete,
  onInlineUpdate,
  onBulkDelete,
  onReloadRepayments,
  onCreateCard,
  onCreateEWallet,
  onAddTransfer,
  focusExpenseId,
  quickExpensePresets,
  onQuickExpenseAdd,
  onQuickExpensePresetsChange,
  onManageQuickExpenses,
}) => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<ExpenseFilterState>(DEFAULT_EXPENSE_FILTERS);

  const periodExpenses = useMemo(
    () => filterExpensesByPeriod(expenses, period),
    [expenses, period],
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
      <ExpensePeriodSummary
        expenses={visibleExpenses}
        categories={categories}
        period={period}
        displayCurrency={displayCurrency}
      />

      <div className="expense-page-heading">
        <h2>{t('expenseHistory')}</h2>
      </div>

      <ExpenseFiltersBar
        value={filters}
        onChange={setFilters}
        categories={categories}
        resultCount={visibleExpenses.length}
      />

      <ExpenseList
        expenses={visibleExpenses}
        categories={categories}
        cards={cards}
        ewallets={ewallets}
        banks={banks}
        repayments={repayments}
        transfers={transfers}
        displayCurrency={displayCurrency}
        onDisplayCurrencyChange={onDisplayCurrencyChange}
        onDelete={onDelete}
        onInlineUpdate={onInlineUpdate}
        onBulkDelete={onBulkDelete}
        onReloadRepayments={onReloadRepayments}
        onCreateCard={onCreateCard}
        onCreateEWallet={onCreateEWallet}
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
    </div>
  );
};

export default ExpensesTab;
