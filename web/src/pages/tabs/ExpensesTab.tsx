import React, { useState } from 'react';
import ExpenseForm from '../../components/expenses/ExpenseForm';
import StepByStepExpenseForm from '../../components/expenses/StepByStepExpenseForm';
import ExpenseList from '../../components/expenses/ExpenseList';
import PopupModal from '../../components/common/PopupModal';
import { Expense, Category, Card, EWallet, Bank, Transfer } from '../../types';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon } from '../../components/icons';

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
  const { timeFormat, dateFormat, useStepByStepForm } = useUserSettings();
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);

  // Debug logging
  console.log('[ExpensesTab] useStepByStepForm value:', useStepByStepForm);
  console.log('[ExpensesTab] Form type will be:', useStepByStepForm ? 'StepByStepExpenseForm' : 'ExpenseForm');

  // Derive last used payment method from recent expenses
  const lastUsedPaymentMethod = expenses.length > 0 
    ? expenses[0].paymentMethod 
    : undefined;

  const handleAddSubmit = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onAddExpense(data);
    setIsAdding(false);
  };

  const handleEditSubmit = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onUpdateExpense(data);
    onEdit(null);
  };

  return (
    <div style={styles.expensesTab}>
      {/* Header with Add Button */}
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>{t('expenseHistory')}</h2>
        <button onClick={() => setIsAdding(true)} className="btn btn-accent-light">
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
      >
        {useStepByStepForm ? (
          <StepByStepExpenseForm
            onSubmit={handleAddSubmit}
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
          />
        ) : (
          <ExpenseForm
            onSubmit={handleAddSubmit}
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
          />
        )}
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
          <ExpenseForm
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
          />
        )}
      </PopupModal>

      {/* Expense List */}
      <div style={styles.section}>
        <ExpenseList
          expenses={expenses}
          categories={categories}
          onEdit={onEdit}
          onDelete={onDeleteExpense}
          onInlineUpdate={() => {}}
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
