import React, { useState, useMemo } from 'react';
import StepByStepExpenseForm from '../../components/expenses/StepByStepExpenseForm';
import DateNavigator, { ViewMode } from '../../components/expenses/DateNavigator';
import ExpenseList from '../../components/expenses/ExpenseList';
import PopupModal from '../../components/common/PopupModal';
import { Expense, Category, Card, EWallet, Bank, Transfer } from '../../types';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon } from '../../components/icons';
import { getTodayLocal } from '../../utils/dateUtils';

interface Props {
  expenses: Expense[];
  categories: Category[];
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[];
  editingExpense: Expense | null;
  onAddExpense: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onUpdateExpense: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onEdit: (exp: Expense | null) => void;
  onDeleteExpense: (id: string) => void;
  onAddTransfer?: (transfer: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCreateEWallet?: () => void;
  onCreateCard?: () => void;
}

const ExpensesTab: React.FC<Props> = ({
  expenses,
  categories,
  cards = [],
  ewallets = [],
  banks = [],
  editingExpense,
  onAddExpense,
  onUpdateExpense,
  onEdit,
  onDeleteExpense,
  onAddTransfer,
  onCreateEWallet,
  onCreateCard,
}) => {
  const { timeFormat, dateFormat } = useUserSettings();
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  
  // DateNavigator state
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Derive last used payment method from recent expenses
  const lastUsedPaymentMethod = expenses.length > 0 
    ? expenses[0].paymentMethod 
    : undefined;

  // Filter expenses based on viewMode and selectedDate
  const filteredExpenses = useMemo(() => {
    if (viewMode === 'all') {
      return expenses;
    }

    return expenses.filter(expense => {
      const expenseDate = expense.date;
      const selected = selectedDate;

      if (viewMode === 'day') {
        return expenseDate === selected;
      }
      
      if (viewMode === 'month') {
        // Compare year and month
        return expenseDate.slice(0, 7) === selected.slice(0, 7);
      }
      
      if (viewMode === 'year') {
        // Compare year only
        return expenseDate.slice(0, 4) === selected.slice(0, 4);
      }

      return true;
    });
  }, [expenses, viewMode, selectedDate]);

  // Calculate total amount for the selected period (in cents for DateNavigator)
  const totalAmount = useMemo(() => {
    // exp.amount is in dollars, convert to cents for display
    return Math.round(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0) * 100);
  }, [filteredExpenses]);

  const handleAddClick = () => {
    setModalKey(prev => prev + 1); // Force new modal instance
    setIsAdding(true);
  };

  // Helper function to auto-navigate to expense date
  const navigateToExpenseDate = (date: string) => {
    if (date !== selectedDate) {
      setSelectedDate(date);
      // Switch to day view to show the new expense
      if (viewMode !== 'day') {
        setViewMode('day');
      }
    }
  };

  const handleAddSubmit = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onAddExpense(data);
    setIsAdding(false);
    navigateToExpenseDate(data.date);
  };

  const handleAddAndAnother = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onAddExpense(data);
    navigateToExpenseDate(data.date);
    // Don't close modal - form will reset itself
  };

  const handleEditSubmit = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onUpdateExpense(data);
    onEdit(null);
  };

  return (
    <div style={styles.expensesTab}>
      {/* Date Navigator */}
      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalAmount={totalAmount}
      />

      {/* Header with Add Button */}
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>{t('expenseHistory')}</h2>
        <button onClick={handleAddClick} className="btn btn-accent-light">
          <PlusIcon size={18} />
          <span>{t('addNewExpense')}</span>
        </button>
      </div>

      {/* Add Expense PopupModal */}
      <PopupModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title={t('addNewExpense')}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="600px"
        key={modalKey}
      >
        <StepByStepExpenseForm
          onSubmit={handleAddSubmit}
          onSubmitAndAddAnother={handleAddAndAnother}
          onCancel={() => setIsAdding(false)}
          categories={categories}
          cards={cards}
          ewallets={ewallets}
          banks={banks}
          onAddTransfer={onAddTransfer}
          onCreateEWallet={onCreateEWallet}
          onCreateCard={onCreateCard}
          timeFormat={timeFormat}
          dateFormat={dateFormat}
          lastUsedPaymentMethod={lastUsedPaymentMethod}
          initialDate={viewMode === 'day' ? selectedDate : undefined}
        />
      </PopupModal>

      {/* Edit Expense PopupModal */}
      <PopupModal
        isOpen={editingExpense !== null}
        onClose={() => onEdit(null)}
        title={t('editExpense')}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="600px"
      >
        {editingExpense && (
          <StepByStepExpenseForm
            onSubmit={handleEditSubmit}
            onCancel={() => onEdit(null)}
            initialData={editingExpense}
            categories={categories}
            cards={cards}
            ewallets={ewallets}
            banks={banks}
            onAddTransfer={onAddTransfer}
            onCreateEWallet={onCreateEWallet}
            onCreateCard={onCreateCard}
            timeFormat={timeFormat}
            dateFormat={dateFormat}
            lastUsedPaymentMethod={lastUsedPaymentMethod}
          />
        )}
      </PopupModal>

      {/* Expense List */}
      <div style={styles.section}>
        <ExpenseList
          expenses={filteredExpenses}
          categories={categories}
          onEdit={onEdit}
          onDelete={onDeleteExpense}
          onInlineUpdate={() => {}}
          viewMode={viewMode}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
};

const styles = {
  expensesTab: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '30px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
};

export default ExpensesTab;
