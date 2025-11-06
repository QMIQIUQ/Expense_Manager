import React, { useState } from 'react';
import { Expense, Category } from '../../types';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
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
      return matchesSearch && matchesCategory;
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

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => e.target.select()}
            style={styles.searchInput}
          />
        </div>

        
      </div>

      {/* Selects row moved below search to match layout */}
      <div style={styles.selectRow}>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={styles.select}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categoryNames.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.select} aria-label="Sort expenses">
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>
      </div>

      {/* Action buttons row - positioned at top-right of list */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => { setMultiSelectEnabled((s) => { if (s) setSelectedIds(new Set()); return !s; }); }}
          style={{ ...styles.selectToggleButton, padding: '8px 12px' }}
          aria-pressed={multiSelectEnabled}
          aria-label="Toggle multi-select"
        >
          {multiSelectEnabled ? 'Cancel Select' : 'Select'}
        </button>
        {multiSelectEnabled && (
          <button
            onClick={() => {
              const ids = Array.from(selectedIds);
              if (ids.length === 0) return;
              if (!window.confirm(`Delete ${ids.length} selected expenses?`)) return;
              onBulkDelete && onBulkDelete(ids);
              setSelectedIds(new Set());
              setMultiSelectEnabled(false);
            }}
            style={{ ...styles.deleteSelectedButton }}
            aria-label="Delete selected"
          >
            🗑 Delete Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
        )}
      </div>

      {filteredAndSortedExpenses().length === 0 ? (
        <div style={styles.noData}>
          <p>No expenses found. Add your first expense! 📝</p>
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
                    <button onClick={() => saveInlineEdit(expense)} style={{ ...styles.iconButton, backgroundColor: 'rgba(33,150,83,0.08)' }} aria-label="Save">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.2l-3.5-3.5L4 14.2 9 19l12-12-1.4-1.4L9 16.2z" fill="#219653"/>
                      </svg>
                    </button>
                    <button onClick={cancelInlineEdit} style={{ ...styles.iconButton, backgroundColor: 'rgba(158,158,158,0.12)' }} aria-label="Cancel">
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
                      <button onClick={() => startInlineEdit(expense)} style={styles.iconButton} aria-label="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#1976d2"/>
                          <path d="M20.71 7.04a1.004 1.004 0 0 0 0-1.41l-2.34-2.34a1.004 1.004 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#1976d2"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, expenseId: expense.id! })}
                        style={{ ...styles.iconButton, backgroundColor: 'rgba(244,67,54,0.08)' }}
                        aria-label="Delete"
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
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
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
  },
  dateRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888', gap: '8px' },
  mainRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' },
  leftCol: { flex: 1, minWidth: 0 },
  rightCol: { display: 'flex', alignItems: 'center', gap: '10px' },
  expenseInfo: {
    flex: 1,
  },
  description: {
    margin: '0 0 5px 0',
    fontSize: '16px',
    fontWeight: '500' as const,
    color: '#333',
  },
  category: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
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
