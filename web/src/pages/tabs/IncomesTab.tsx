import React, { useState, useMemo } from 'react';
import IncomeForm from '../../components/income/IncomeForm';
import IncomeList from '../../components/income/IncomeList';
import { SearchBar } from '../../components/common/SearchBar';
import { Income, Expense, Card, EWallet, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon } from '../../components/icons';
import PopupModal from '../../components/common/PopupModal';

interface Props {
  incomes: Income[];
  expenses: Expense[];
  cards: Card[];
  ewallets: EWallet[];
  banks: Bank[];
  onAddIncome: (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onInlineUpdate: (id: string, updates: Partial<Income>) => void;
  onDeleteIncome: (id: string) => void;
  onOpenExpenseById?: (id: string) => void;
}

const IncomesTab: React.FC<Props> = ({
  incomes,
  expenses,
  cards,
  ewallets,
  banks,
  onAddIncome,
  onInlineUpdate,
  onDeleteIncome,
  onOpenExpenseById,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onAddIncome(data);
    setIsAdding(false);
  };
  
  const filteredIncomes = useMemo(() => {
    if (!searchTerm.trim()) return incomes;
    const q = searchTerm.toLowerCase();
    return incomes.filter((inc) => {
      const title = (inc.title || '').toLowerCase();
      const payer = (inc.payerName || '').toLowerCase();
      return title.includes(q) || payer.includes(q);
    });
  }, [incomes, searchTerm]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t('incomeHistory')}</h3>
        <button onClick={() => setIsAdding(true)} className="btn btn-accent-light">
          <PlusIcon size={18} />
          <span>{t('addNewIncome')}</span>
        </button>
      </div>

      {/* Search by name */}
      <SearchBar
        placeholder={t('searchByName')}
        value={searchTerm}
        onChange={setSearchTerm}
        style={{ marginBottom: 8 }}
      />

      {/* Add Income Form - PopupModal */}
      <PopupModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title={t('addNewIncome')}
        hideFooter={true}
        maxWidth="600px"
      >
        <IncomeForm
          onSubmit={handleSubmit}
          onCancel={() => setIsAdding(false)}
          expenses={expenses}
          cards={cards}
          ewallets={ewallets}
          banks={banks}
        />
      </PopupModal>

      <IncomeList
        incomes={filteredIncomes}
        expenses={expenses}
        cards={cards}
        ewallets={ewallets}
        banks={banks}
        onDelete={onDeleteIncome}
        onInlineUpdate={onInlineUpdate}
        onOpenExpenseById={onOpenExpenseById}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s',
  },
};

export default IncomesTab;
