import React, { useState, useMemo, useEffect } from 'react';
import { useHistoryPages } from '../../hooks/useHistoryPages';
import { readHistoryRange } from '../../services/historyService';
import { applyPendingOperations } from '../../utils/pendingOperations';
import IncomeForm from '../../components/income/IncomeForm';
import IncomeList from '../../components/income/IncomeList';
import { SearchBar } from '../../components/common/SearchBar';
import { Income, Expense, Card, EWallet, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon } from '../../components/icons';
import PopupModal from '../../components/common/PopupModal';

interface Props {
  userId?: string;
  onHistoryRows?: (rows: Income[]) => void;
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
  userId,
  onHistoryRows,
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
  const [visibleCount, setVisibleCount] = useState(100);
  const history = useHistoryPages('incomes', userId, undefined, incomes, onHistoryRows);
  const [searchRows, setSearchRows] = useState<Income[]>();
  const [searchError, setSearchError] = useState<string>();
  useEffect(() => {
    setSearchRows(undefined); setSearchError(undefined);
    if (!userId || !searchTerm.trim()) return;
    let current = true;
    void readHistoryRange<Income>('incomes', userId).then((rows) => {
      if (current) { setSearchRows(rows); onHistoryRows?.(rows); }
    }).catch((error) => { if (current) setSearchError(String(error)); });
    return () => { current = false; };
  }, [onHistoryRows, searchTerm, userId]);
  useEffect(() => { setVisibleCount(100); }, [searchTerm]);

  const handleSubmit = (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onAddIncome(data);
    setIsAdding(false);
  };
  
  const filteredIncomes = useMemo(() => {
    const rows = userId ? searchRows ? applyPendingOperations('incomes', userId, searchRows) : history.rows : incomes;
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((inc) => {
      const title = (inc.title || '').toLowerCase();
      const payer = (inc.payerName || '').toLowerCase();
      return title.includes(q) || payer.includes(q);
    });
  }, [history.rows, incomes, searchRows, searchTerm, userId]);

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
      {history.incomplete && <p role="status">{t('cachedHistoryIncomplete')}</p>}
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
        hideHeader={true}
        chromeless={true}
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
        incomes={filteredIncomes.slice(0, visibleCount)}
        expenses={expenses}
        cards={cards}
        ewallets={ewallets}
        banks={banks}
        onDelete={onDeleteIncome}
        onInlineUpdate={onInlineUpdate}
        onOpenExpenseById={onOpenExpenseById}
      />
      {(history.error || searchError) && <p role="alert">{history.error || searchError} <button onClick={history.retry}>{t('retry')}</button></p>}
      {(visibleCount < filteredIncomes.length || (!searchTerm.trim() && history.hasMore)) && <button type="button" disabled={history.loading} className="btn btn-secondary" onClick={() => { setVisibleCount((count) => count + 100); if (!searchTerm.trim() && visibleCount >= filteredIncomes.length) void history.loadMore(); }}>
        {t('showMore')} ({Math.min(visibleCount, filteredIncomes.length)} / {!searchTerm.trim() && history.hasMore ? '…' : filteredIncomes.length})
      </button>}
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
