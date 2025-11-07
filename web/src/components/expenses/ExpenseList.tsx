import React, { useState } from 'react';
import { Expense, Category } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../ConfirmModal';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<Expense>) => void;
  onEdit?: (exp: Expense | null) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, categories, onDelete, onInlineUpdate, onBulkDelete }) => {
  const { t } = useLanguage();
  const today = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [sortBy, setSortBy] = useState('date-desc');
  const [showSummary, setShowSummary] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; expenseId: string | null }>({
    isOpen: false,
    expenseId: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    description?: string;
    amount?: string;
    category?: string;
    date?: string;
    time?: string;
    notes?: string;
  }>({});
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredAndSortedExpenses = () => {
    const filtered = expenses.filter((expense) => {
      const matchesSearch = expense.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;
      const matchesDateFrom = !dateFrom || expense.date >= dateFrom;
      const matchesDateTo = !dateTo || expense.date <= dateTo;
      return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => {
          const dateA = new Date(`${a.date} ${(a as Expense & { time?: string }).time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date} ${(b as Expense & { time?: string }).time || '00:00'}`).getTime();
          return dateB - dateA;
        });
        break;
      case 'date-asc':
        sorted.sort((a, b) => {
          const dateA = new Date(`${a.date} ${(a as Expense & { time?: string }).time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date} ${(b as Expense & { time?: string }).time || '00:00'}`).getTime();
          return dateA - dateB;
        });
        break;
      case 'amount-desc':
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount-asc':
        sorted.sort((a, b) => a.amount - b.amount);
        break;
    }

    return sorted;
  };

  const formatDate = (dateString: string, time?: string) => {
    const date = new Date(dateString);
    const base = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return time ? `${base} ${time}` : base;
  };

  const calculateSummary = () => {
    const filtered = filteredAndSortedExpenses();
    const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
    const byCategory: { [key: string]: number } = {};
    filtered.forEach((exp) => {
      if (!byCategory[exp.category]) byCategory[exp.category] = 0;
      byCategory[exp.category] += exp.amount;
    });
    const categoryBreakdown = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => ({ category, amount }));
    return { total, count: filtered.length, categoryBreakdown };
  };

  // Use unique category names to avoid duplicate option keys
  const categoryNames = Array.from(new Set(categories.map((c) => c.name))).filter((n) => n);

  const startInlineEdit = (expense: Expense) => {
    setEditingId(expense.id!);
    setDraft({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      time: (expense as Expense & { time?: string }).time || '',
      notes: expense.notes || '',
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveInlineEdit = (expense: Expense) => {
    const updates: Partial<Expense> = {};
    const parsedAmount = parseFloat(draft.amount || '0');
    if (expense.description !== draft.description && draft.description) updates.description = draft.description;
    if (!isNaN(parsedAmount) && expense.amount !== parsedAmount) updates.amount = parsedAmount;
    if (expense.category !== draft.category && draft.category) updates.category = draft.category;
    if (expense.date !== draft.date && draft.date) updates.date = draft.date;
    const currentTime = (expense as Expense & { time?: string }).time || '';
    if (currentTime !== (draft.time || '')) updates.time = draft.time || undefined;
    if ((expense.notes || '') !== (draft.notes || '')) updates.notes = draft.notes || undefined;

    if (Object.keys(updates).length > 0) {
      onInlineUpdate(expense.id!, updates);
    }
    cancelInlineEdit();
  };

  const summary = calculateSummary();

  return (
    <div style={styles.container}>
      {/* Summary Section */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryHeader} onClick={() => setShowSummary(!showSummary)}>
          <div style={styles.summaryMain}>
            <span style={styles.summaryLabel}>{t('total')} </span>
            <span style={styles.summaryTotal}>${summary.total.toFixed(2)}</span>
            <span style={styles.summaryCount}>({summary.count} {t('items')})</span>
          </div>
          <button style={styles.expandButton} aria-label="Toggle summary">
            {showSummary ? '▼' : '▶'}
          </button>
        </div>
        {showSummary && (
          <div style={styles.summaryDetails}>
            <h4 style={styles.summaryDetailsTitle}>{t('categoryBreakdown')}</h4>
            {summary.categoryBreakdown.map(({ category, amount }) => (
              <div key={category} style={styles.summaryDetailRow}>
                <span style={styles.summaryDetailCategory}>{category}</span>
                <span style={styles.summaryDetailAmount}>${amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Section */}
      <div style={styles.filterSection}>
        <div style={styles.filterRow}>
          <input
            type="text"
            placeholder={t('searchExpenses')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => e.target.select()}
            style={styles.filterInput}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={styles.filterSelect}
            aria-label="Filter by category"
          >
            <option value="">{t('allCategories')}</option>
            {categoryNames.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.filterRow}>
          <div style={styles.dateFilterGroup}>
            <label style={styles.dateLabel}>{t('from')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <div style={styles.dateFilterGroup}>
            <label style={styles.dateLabel}>{t('to')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.filterSelect} aria-label="Sort expenses">
            <option value="date-desc">{t('sortByDateDesc')}</option>
            <option value="date-asc">{t('sortByDateAsc')}</option>
            <option value="amount-desc">{t('sortByAmountDesc')}</option>
            <option value="amount-asc">{t('sortByAmountAsc')}</option>
          </select>
        </div>
      </div>

      {/* Action buttons row - positioned at top-right of list */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setMultiSelectEnabled((s) => { if (s) setSelectedIds(new Set()); return !s; }); }}
          style={{ ...styles.selectToggleButton, padding: '8px 12px' }}
          aria-pressed={multiSelectEnabled}
          aria-label="Toggle multi-select"
        >
          {multiSelectEnabled ? t('cancel') : t('multiSelect')}
        </button>
        {multiSelectEnabled && (
          <>
            <button
              onClick={() => {
                const filtered = filteredAndSortedExpenses();
                const allIds = new Set(filtered.map(exp => exp.id!));
                setSelectedIds(allIds);
              }}
              style={{ ...styles.selectAllButton }}
              aria-label="Select all"
            >
              ✓ {t('selectAll') || 'Select All'}
            </button>
            <button
              onClick={() => {
                const ids = Array.from(selectedIds);
                if (ids.length === 0) return;
                if (!window.confirm(t('confirmBulkDelete').replace('{count}', ids.length.toString()))) return;
                onBulkDelete && onBulkDelete(ids);
                setSelectedIds(new Set());
                setMultiSelectEnabled(false);
              }}
              style={{ ...styles.deleteSelectedButton }}
              aria-label="Delete selected"
            >
              🗑 {t('deleteSelected')} {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </button>
          </>
        )}
      </div>

      {filteredAndSortedExpenses().length === 0 ? (
        <div style={styles.noData}>
          <p>{t('noExpenses')}</p>
        </div>
      ) : (
        <div style={styles.list}>
          {filteredAndSortedExpenses().map((expense) => (
            <div key={expense.id} className="expense-card" style={styles.expenseCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {multiSelectEnabled && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(expense.id!)}
                      onChange={() => setSelectedIds((prev) => {
                        const copy = new Set(prev);
                        if (copy.has(expense.id!)) copy.delete(expense.id!);
                        else copy.add(expense.id!);
                        return copy;
                      })}
                      aria-label={`Select expense ${expense.description}`}
                    />
                  )}
                  <div style={styles.dateRow}>
                    <span>{formatDate(expense.date, (expense as Expense & { time?: string }).time)}</span>
                    <span style={styles.category}>{expense.category}</span>
                  </div>
                </div>
              </div>

              {editingId === expense.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <input
                      type="text"
                      value={draft.description || ''}
                      placeholder="Description"
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      style={{ ...styles.input, flex: 2, minWidth: '180px' }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={draft.amount || ''}
                      placeholder="Amount"
                      onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                      style={{ ...styles.input, width: '140px' }}
                    />
                    <select
                      value={draft.category || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                      style={{ ...styles.select, minWidth: '160px' }}
                    >
                      {categoryNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <input
                      type="date"
                      value={draft.date || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                      style={{ ...styles.input, width: '160px' }}
                    />
                    <input
                      type="time"
                      value={draft.time || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
                      style={{ ...styles.input, width: '140px' }}
                    />
                    <input
                      type="text"
                      value={draft.notes || ''}
                      placeholder="Notes (optional)"
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                      style={{ ...styles.input, flex: 1, minWidth: '200px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => saveInlineEdit(expense)} style={{ ...styles.iconButton, backgroundColor: 'rgba(33,150,83,0.08)' }} aria-label={t('save')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.2l-3.5-3.5L4 14.2 9 19l12-12-1.4-1.4L9 16.2z" fill="#219653"/>
                      </svg>
                    </button>
                    <button onClick={cancelInlineEdit} style={{ ...styles.iconButton, backgroundColor: 'rgba(158,158,158,0.12)' }} aria-label={t('cancel')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="#555"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.mainRow}>
                  <div style={styles.leftCol}>
                    <h3 style={styles.description}>{expense.description}</h3>
                    {expense.notes && <p style={styles.notes}>{expense.notes}</p>}
                  </div>
                  <div style={styles.rightCol}>
                    <div style={styles.amount}>${expense.amount.toFixed(2)}</div>
                    <div style={styles.actions}>
                      <button onClick={() => startInlineEdit(expense)} style={styles.iconButton} aria-label={t('edit')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#1976d2"/>
                          <path d="M20.71 7.04a1.004 1.004 0 0 0 0-1.41l-2.34-2.34a1.004 1.004 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#1976d2"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, expenseId: expense.id! })}
                        style={{ ...styles.iconButton, backgroundColor: 'rgba(244,67,54,0.08)' }}
                        aria-label={t('delete')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 7h12l-1 14H7L6 7z" fill="#f44336"/>
                          <path d="M8 7V5h8v2h3v2H5V7h3z" fill="#f44336"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('delete') + ' ' + t('expenses')}
        message={t('confirmDelete')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.expenseId) {
            onDelete(deleteConfirm.expenseId);
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, expenseId: null })}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '10px',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  summaryMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  summaryLabel: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#666',
  },
  summaryTotal: {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: '#f44336',
  },
  summaryCount: {
    fontSize: '14px',
    color: '#888',
  },
  expandButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#666',
  },
  summaryDetails: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #ddd',
  },
  summaryDetailsTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#333',
  },
  summaryDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  summaryDetailCategory: {
    fontSize: '14px',
    color: '#555',
  },
  summaryDetailAmount: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#f44336',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  filterInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  filterSelect: {
    minWidth: '150px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  dateFilterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateLabel: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#555',
    whiteSpace: 'nowrap' as const,
  },
  dateInput: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
  },
  filters: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  select: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  expenseCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '12px 12px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    minWidth: 0,
    overflow: 'hidden',
  },
  dateRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888', gap: '8px', minWidth: 0, flexWrap: 'wrap' as const },
  mainRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', minWidth: 0 },
  leftCol: { flex: 1, minWidth: 0, overflow: 'hidden' },
  rightCol: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  expenseInfo: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    margin: '0 0 5px 0',
    fontSize: '16px',
    fontWeight: '500' as const,
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  category: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  notes: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#666',
  },
  amount: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#f44336',
    marginBottom: '4px',
    wordBreak: 'break-all' as const,
    lineHeight: '1.2',
  },
  actions: { display: 'flex', gap: '6px' },
  iconButton: {
    width: '34px',
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    border: '1px solid rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(25,118,210,0.08)',
    cursor: 'pointer',
  },
  selectToggleButton: {
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontWeight: 600 as const,
  },
  selectAllButton: {
    borderRadius: '8px',
    border: '1px solid rgba(33,150,83,0.2)',
    backgroundColor: 'rgba(33,150,83,0.08)',
    color: '#219653',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600 as const,
  },
  deleteSelectedButton: {
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'rgba(244,67,54,0.08)',
    color: '#b71c1c',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600 as const,
  },
  selectRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
};

export default ExpenseList;
