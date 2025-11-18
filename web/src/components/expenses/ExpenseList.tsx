import React, { useState, useMemo, useEffect } from 'react';
import { Expense, Category, Card, EWallet, Repayment } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../ConfirmModal';
import RepaymentManager from '../repayment/RepaymentManager';
import { EditIcon, DeleteIcon, CheckIcon, CloseIcon, RepaymentIcon, CircleIcon } from '../icons';

// Add responsive styles for action buttons
const responsiveStyles = `
  .desktop-actions {
    display: none;
    gap: 8px;
  }
  .mobile-actions {
    display: block;
  }
  @media (min-width: 640px) {
    .desktop-actions {
      display: flex;
    }
    .mobile-actions {
      display: none;
    }
  }
`;

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  cards?: Card[];
  ewallets?: EWallet[];
  repayments?: Repayment[];
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<Expense>) => void;
  onEdit?: (exp: Expense | null) => void;
  onBulkDelete?: (ids: string[]) => void;
  onReloadRepayments?: () => void; // Callback to reload repayments
  focusExpenseId?: string; // when set, scroll and highlight
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  categories,
  cards = [],
  ewallets = [],
  repayments = [],
  onDelete,
  onInlineUpdate,
  onBulkDelete,
  onReloadRepayments,
  focusExpenseId,
}) => {
  const { t } = useLanguage();
  const today = new Date().toISOString().split('T')[0];
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(oneMonthAgoStr);
  const [dateTo, setDateTo] = useState(today);
  const [allDates, setAllDates] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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
    paymentMethod?: Expense['paymentMethod'];
    cardId?: string;
    paymentMethodName?: string;
    needsRepaymentTracking?: boolean;
  }>({});
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedRepaymentId, setExpandedRepaymentId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest('.mobile-actions')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  // Helper function to get category with icon
  const getCategoryDisplay = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category) {
      return `${category.icon} ${category.name}`;
    }
    return categoryName;
  };

  // Get category color from user's category settings
  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category && category.color) {
      // Convert hex color to lighter background and keep text as original color
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 99, g: 102, b: 241 };
      };
      
      const rgb = hexToRgb(category.color);
      // Create a lighter background (add 80% white)
      const bg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
      const text = category.color;
      
      return { background: bg, color: text };
    }
    // Fallback color
    return { background: '#e0e7ff', color: '#4338ca' };
  };

  // Scroll to and highlight an expense when focusExpenseId changes
  React.useEffect(() => {
    if (!focusExpenseId) return;
    const el = document.getElementById(`expense-${focusExpenseId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const original = (el as HTMLElement).style.boxShadow;
      (el as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.35)';
      setTimeout(() => {
        (el as HTMLElement).style.boxShadow = original;
      }, 2000);
    }
  }, [focusExpenseId]);

  // Calculate repayment totals per expense
  const repaymentTotals = useMemo(() => {
    const totals: { [expenseId: string]: number } = {};
    repayments.forEach((repayment) => {
      if (repayment.expenseId) {
        totals[repayment.expenseId] = (totals[repayment.expenseId] || 0) + repayment.amount;
      }
    });
    return totals;
  }, [repayments]);

  const filteredAndSortedExpenses = () => {
    const filtered = expenses.filter((expense) => {
      const matchesSearch = expense.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;
      
      // Month filter logic
      let matchesMonth = true;
      if (monthFilter) {
        const expenseDate = new Date(expense.date);
        const [filterYear, filterMonth] = monthFilter.split('-').map(Number);
        matchesMonth = expenseDate.getFullYear() === filterYear && expenseDate.getMonth() + 1 === filterMonth;
      }
      
      const matchesDateFrom = allDates || monthFilter ? true : (!dateFrom || expense.date >= dateFrom);
      const matchesDateTo = allDates || monthFilter ? true : (!dateTo || expense.date <= dateTo);
      return matchesSearch && matchesCategory && matchesMonth && matchesDateFrom && matchesDateTo;
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

  const toggleGroupCollapse = (date: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const toggleGroupSelection = (dayExpenses: Expense[]) => {
    const dayExpenseIds = dayExpenses.map(exp => exp.id!).filter(Boolean);
    const allSelected = dayExpenseIds.every(id => selectedIds.has(id));
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // 如果全選了，則取消全選
        dayExpenseIds.forEach(id => newSet.delete(id));
      } else {
        // 否則全選此 group
        dayExpenseIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const getGroupCheckboxState = (dayExpenses: Expense[]): 'checked' | 'indeterminate' | 'unchecked' => {
    const dayExpenseIds = dayExpenses.map(exp => exp.id!).filter(Boolean);
    if (dayExpenseIds.length === 0) return 'unchecked';
    
    const selectedCount = dayExpenseIds.filter(id => selectedIds.has(id)).length;
    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === dayExpenseIds.length) return 'checked';
    return 'indeterminate';
  };

  // Group expenses by date for display
  const groupExpensesByDate = () => {
    const sorted = filteredAndSortedExpenses();
    const grouped: { [date: string]: Expense[] } = {};
    
    sorted.forEach((expense) => {
      const dateKey = expense.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(expense);
    });

    // Convert to array and sort by date
    return Object.entries(grouped).map(([date, exps]) => {
      const dailyTotal = exps.reduce((sum, exp) => sum + exp.amount, 0);
      return { date, expenses: exps, dailyTotal };
    }).sort((a, b) => {
      // Sort descending by default (newest first)
      if (sortBy.includes('asc')) {
        return a.date.localeCompare(b.date);
      }
      return b.date.localeCompare(a.date);
    });
  };

  // Use unique category names to avoid duplicate option keys
  const categoryNames = Array.from(new Set(categories.map((c) => c.name))).filter((n) => n);

  // Generate available months from expenses
  const getAvailableMonths = () => {
    const monthSet = new Set<string>();
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(monthKey);
    });
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
  };

  const availableMonths = getAvailableMonths();

  // Format month for display
  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const startInlineEdit = (expense: Expense) => {
    setEditingId(expense.id!);
    setDraft({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      time: (expense as Expense & { time?: string }).time || '',
      notes: expense.notes || '',
      paymentMethod: expense.paymentMethod || 'cash',
      cardId: expense.cardId || '',
      paymentMethodName: expense.paymentMethodName || '',
      needsRepaymentTracking: !!expense.needsRepaymentTracking,
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

    const selectedPaymentMethod = (draft.paymentMethod || 'cash') as Expense['paymentMethod'];
    if ((expense.paymentMethod || 'cash') !== selectedPaymentMethod) {
      updates.paymentMethod = selectedPaymentMethod;
    }

    if (selectedPaymentMethod === 'cash') {
      if (expense.cardId) updates.cardId = undefined;
      if (expense.paymentMethodName) updates.paymentMethodName = undefined;
    } else if (selectedPaymentMethod === 'credit_card') {
      if ((expense.cardId || '') !== (draft.cardId || '')) {
        updates.cardId = draft.cardId || undefined;
      }
      if (expense.paymentMethodName) {
        updates.paymentMethodName = undefined;
      }
    } else if (selectedPaymentMethod === 'e_wallet') {
      if ((expense.paymentMethodName || '') !== (draft.paymentMethodName || '')) {
        updates.paymentMethodName = draft.paymentMethodName || undefined;
      }
      if (expense.cardId) {
        updates.cardId = undefined;
      }
    }

    // Repayment tracking toggle
    const currentTrack = !!expense.needsRepaymentTracking;
    const newTrack = !!draft.needsRepaymentTracking;
    if (currentTrack !== newTrack) {
      updates.needsRepaymentTracking = newTrack;
    }

    if (Object.keys(updates).length > 0) {
      onInlineUpdate(expense.id!, updates);
    }
    cancelInlineEdit();
  };

  const groupedExpenses = groupExpensesByDate();

  return (
    <>
      <style>{responsiveStyles}</style>
      <div style={styles.container}>
      {/* Filter Section */}
      <div style={styles.filterSection}>
        {/* Simplified filter - always visible */}
        <div style={styles.filterRow}>
          <input
            type="text"
            placeholder={t('searchExpenses')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => e.target.select()}
            style={{ ...styles.filterInput, flex: 1 }}
          />
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={styles.toggleFiltersButton}
            aria-label="Toggle advanced filters"
          >
            {showAdvancedFilters ? '▼ ' : '▶ '}{t('filters')}
          </button>
        </div>
        {/* Advanced filters - collapsible */}
        {showAdvancedFilters && (
          <>
            <div style={styles.filterRow}>
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
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  if (e.target.value) {
                    setAllDates(false);
                  }
                }}
                style={styles.filterSelect}
                aria-label="Filter by month"
              >
                <option value="">{t('allMonths')}</option>
                {availableMonths.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {formatMonthDisplay(monthKey)}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.filterRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="allDatesToggle"
                  type="checkbox"
                  checked={allDates}
                  onChange={(e) => {
                    setAllDates(e.target.checked);
                    if (e.target.checked) {
                      setMonthFilter('');
                    }
                  }}
                  aria-label={t('allDates')}
                />
                <label htmlFor="allDatesToggle" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{t('allDates')}</label>
              </div>
              <div style={styles.dateFilterGroup}>
                <label style={styles.dateLabel}>{t('from')}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={styles.dateInput}
                  disabled={allDates || !!monthFilter}
                />
              </div>
              <div style={styles.dateFilterGroup}>
                <label style={styles.dateLabel}>{t('to')}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={styles.dateInput}
                  disabled={allDates || !!monthFilter}
                />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.filterSelect} aria-label="Sort expenses">
                <option value="date-desc">{t('sortByDateDesc')}</option>
                <option value="date-asc">{t('sortByDateAsc')}</option>
                <option value="amount-desc">{t('sortByAmountDesc')}</option>
                <option value="amount-asc">{t('sortByAmountAsc')}</option>
              </select>
            </div>
          </>
        )}
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

      {groupedExpenses.length === 0 ? (
        <div style={styles.noData}>
          <p>{t('noExpenses')}</p>
        </div>
      ) : (
        <div style={styles.list}>
          {groupedExpenses.map(({ date, expenses: dayExpenses, dailyTotal }) => {
            const isCollapsed = collapsedGroups.has(date);
            return (
            <div key={date} style={styles.dateGroup}>
              {/* Date group header with daily subtotal - clickable to expand/collapse */}
              <div className="date-group-header" style={styles.dateGroupHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {multiSelectEnabled && (
                    <input
                      type="checkbox"
                      checked={getGroupCheckboxState(dayExpenses) === 'checked'}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = getGroupCheckboxState(dayExpenses) === 'indeterminate';
                        }
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleGroupSelection(dayExpenses);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select all expenses for ${formatDate(date)}`}
                    />
                  )}
                  <div 
                    onClick={() => toggleGroupCollapse(date)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}
                  >
                    <span style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
                    <span style={styles.dateGroupDate}>{formatDate(date)}</span>
                    <span style={styles.expenseCount}>({dayExpenses.length})</span>
                  </div>
                </div>
                <span style={styles.dateGroupTotal}>${dailyTotal.toFixed(2)}</span>
              </div>
              
              {/* Expenses for this date - hidden when collapsed */}
              {!isCollapsed && dayExpenses.map((expense) => {
                const walletDatalistId = `ewallet-inline-options-${expense.id || 'draft'}`;
                return (
                <div key={expense.id} id={`expense-${expense.id}`} className="expense-card" style={styles.expenseCard}>
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
                  <div style={styles.categoryRow}>
                    {(expense as Expense & { time?: string }).time && (
                      <span style={styles.timeDisplay}>{(expense as Expense & { time?: string }).time}</span>
                    )}
                    <span 
                      className="category-chip"
                      style={{
                        ...styles.category,
                        ...getCategoryColor(expense.category)
                      }}
                    >
                      {getCategoryDisplay(expense.category)}
                    </span>
                    {repaymentTotals[expense.id!] > 0 && expense.needsRepaymentTracking && (
                      <span 
                        style={{
                          ...styles.completedCheck,
                          color: expense.repaymentTrackingCompleted ? '#16a34a' : '#f59e0b'
                        }} 
                        title={expense.repaymentTrackingCompleted ? t('completed') : t('markRepaymentComplete')}
                      >
                        {expense.repaymentTrackingCompleted ? <CheckIcon size={16} /> : <CircleIcon size={16} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {editingId === expense.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <div style={{ flex: 2, minWidth: '180px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('description')}</label>
                      <input
                        type="text"
                        value={draft.description || ''}
                        placeholder={t('description')}
                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                        style={{ ...styles.input, width: '100%' }}
                      />
                    </div>
                    <div style={{ width: '140px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('amount')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={draft.amount || ''}
                        placeholder={t('amount')}
                        onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                        style={{ ...styles.input, width: '100%' }}
                      />
                    </div>
                    <div style={{ minWidth: '160px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('category')}</label>
                      <select
                        value={draft.category || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                        style={{ ...styles.select, width: '100%' }}
                      >
                        {categoryNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <div style={{ width: '160px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('date')}</label>
                      <input
                        type="date"
                        value={draft.date || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                        style={{ ...styles.input, width: '100%' }}
                      />
                    </div>
                    <div style={{ width: '140px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('time')}</label>
                      <input
                        type="time"
                        value={draft.time || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
                        style={{ ...styles.input, width: '100%' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('notes')}</label>
                      <input
                        type="text"
                        value={draft.notes || ''}
                        placeholder={t('notesOptional')}
                        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                        style={{ ...styles.input, width: '100%' }}
                      />
                    </div>
                  </div>
                  {/* Repayment tracking toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                    <input
                      type="checkbox"
                      id={`needsRepaymentTracking-${expense.id}`}
                      checked={!!draft.needsRepaymentTracking}
                      onChange={(e) => setDraft((d) => ({ ...d, needsRepaymentTracking: e.target.checked }))}
                    />
                    <label htmlFor={`needsRepaymentTracking-${expense.id}`} style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      {t('trackRepaymentInDashboard')}
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('paymentMethod')}</label>
                      <select
                        value={draft.paymentMethod || 'cash'}
                        onChange={(e) => {
                          const method = e.target.value as Expense['paymentMethod'];
                          setDraft((d) => ({
                            ...d,
                            paymentMethod: method,
                            cardId: method === 'credit_card' ? d.cardId : '',
                            paymentMethodName: method === 'e_wallet' ? d.paymentMethodName : '',
                          }));
                        }}
                        style={{ ...styles.select, width: '100%' }}
                      >
                        <option value="cash">💵 {t('cash')}</option>
                        <option value="credit_card">💳 {t('creditCard')}</option>
                        <option value="e_wallet">📱 {t('eWallet')}</option>
                      </select>
                    </div>

                    {draft.paymentMethod === 'credit_card' && (
                      <div style={{ minWidth: '200px', flex: 1 }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('selectCard')}</label>
                        <select
                          value={draft.cardId || ''}
                          onChange={(e) => setDraft((d) => ({ ...d, cardId: e.target.value }))}
                          style={{ ...styles.select, width: '100%' }}
                        >
                          <option value="">{t('selectCard')}</option>
                          {cards.length === 0 && <option value="" disabled>No cards available</option>}
                          {cards.map((card) => (
                            <option key={card.id} value={card.id}>
                              💳 {card.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {draft.paymentMethod === 'e_wallet' && (
                      <div style={{ minWidth: '200px', flex: 1 }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('eWalletNameLabel')}</label>
                        <input
                          type="text"
                          value={draft.paymentMethodName || ''}
                          onChange={(e) => setDraft((d) => ({ ...d, paymentMethodName: e.target.value }))}
                          placeholder={t('eWalletNameLabel') || 'E-wallet name'}
                          style={{ ...styles.input, width: '100%' }}
                          list={walletDatalistId}
                        />
                      </div>
                    )}
                  </div>
                  {draft.paymentMethod === 'e_wallet' && ewallets.length > 0 && (
                    <datalist id={walletDatalistId}>
                      {ewallets.map((wallet) => (
                        <option key={wallet.id || wallet.name} value={wallet.name} />
                      ))}
                    </datalist>
                  )}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => saveInlineEdit(expense)} style={{ ...styles.iconButton, ...styles.successChip }} aria-label={t('save')}>
                      <CheckIcon size={18} />
                    </button>
                    <button onClick={cancelInlineEdit} style={{ ...styles.iconButton, ...styles.neutralChip }} aria-label={t('cancel')}>
                      <CloseIcon size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                {/* Amount badge shown at top-right for better mobile visibility */}
                {(() => {
                  const repaid = repaymentTotals[expense.id!] || 0;
                  const netAmount = expense.amount - repaid;
                  const hasExcess = netAmount < 0;
                  const isRepaid = repaid > 0;
                  const color = isRepaid ? (hasExcess ? '#2196F3' : '#ff9800') : '#f44336';
                  return (
                    <div style={{
                      ...styles.amountBadge,
                      color,
                    }}>
                      ${Math.abs(isRepaid ? netAmount : expense.amount).toFixed(2)}
                      {isRepaid && hasExcess && (
                        <span style={styles.excessBadgeSmall}>({t('excess')})</span>
                      )}
                    </div>
                  );
                })()}

                {/* Amount meta (original/repaid) under amount badge */}
                {(() => {
                  const repaid = repaymentTotals[expense.id!] || 0;
                  if (repaid > 0) {
                    return (
                      <div style={styles.amountMeta}>
                        <div>{t('original')}: <span style={{ color: 'var(--error-text)' }}>${expense.amount.toFixed(2)}</span></div>
                        <div>{t('repaid')}: <span style={{ color: 'var(--success-text)' }}>${repaid.toFixed(2)}</span></div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div style={styles.mainRow}>
                  <div style={styles.leftCol}>
                    <h3 style={styles.description}>{expense.description}</h3>
                    {expense.notes && <p style={styles.notes}>{expense.notes}</p>}
                    
                    {/* Completed check moved to header category row */}
                    
                    {/* Payment Method Display */}
                    {expense.paymentMethod && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {expense.paymentMethod === 'cash' && `💵 ${t('cash')}`}
                        {expense.paymentMethod === 'credit_card' && `💳 ${t('creditCard')}`}
                        {expense.paymentMethod === 'e_wallet' && `📱 ${expense.paymentMethodName || t('eWallet')}`}
                      </p>
                    )}
                  </div>
                  <div style={{
                    ...styles.rightCol,
                    marginTop: (repaymentTotals[expense.id!] || 0) > 0 ? 34 : 0,
                  }}>
                    {/* Desktop: Show all buttons */}
                    <div className="desktop-actions" style={styles.actions}>
                      <button 
                        onClick={() => {
                          if (expandedRepaymentId === expense.id) {
                            setExpandedRepaymentId(null);
                          } else {
                            setExpandedRepaymentId(expense.id!);
                          }
                        }} 
                        style={{ 
                          ...styles.iconButton, 
                          ...styles.successChip,
                          ...(expandedRepaymentId === expense.id ? { backgroundColor: 'var(--success-text)', color: 'var(--bg-primary)' } : {})
                        }} 
                        aria-label={t('repayments')}
                        title={t('repayments')}
                      >
                        <RepaymentIcon size={18} />
                      </button>
                      
                      {repaymentTotals[expense.id!] > 0 && expense.needsRepaymentTracking && (
                        <button
                          onClick={() => {
                            onInlineUpdate(expense.id!, {
                              repaymentTrackingCompleted: !expense.repaymentTrackingCompleted
                            });
                          }}
                          style={{
                            ...styles.iconButton,
                            ...(expense.repaymentTrackingCompleted ? styles.completedChip : styles.warningChip),
                          }}
                          aria-label={expense.repaymentTrackingCompleted ? t('markAsIncomplete') : t('markRepaymentComplete')}
                          title={expense.repaymentTrackingCompleted ? t('markAsIncomplete') : t('markRepaymentComplete')}
                        >
                          {expense.repaymentTrackingCompleted ? <CheckIcon size={18} /> : <CircleIcon size={18} />}
                        </button>
                      )}
                      
                      <button onClick={() => startInlineEdit(expense)} style={{ ...styles.iconButton, ...styles.primaryChip }} aria-label={t('edit')}>
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, expenseId: expense.id! })}
                        style={{ ...styles.iconButton, ...styles.dangerChip }}
                        aria-label={t('delete')}
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>

                    {/* Mobile: Show hamburger menu */}
                    <div className="mobile-actions">
                      <div style={styles.menuContainer}>
                        <button
                          className="menu-item-hover"
                          onClick={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id!)}
                          style={styles.menuButton}
                          aria-label="More"
                        >
                          ⋮
                        </button>
                        {openMenuId === expense.id && (
                          <div style={styles.menu}>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                startInlineEdit(expense);
                              }}
                            >
                              <span style={styles.menuIcon}><EditIcon size={16} /></span>
                              {t('edit')}
                            </button>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                if (expandedRepaymentId === expense.id) {
                                  setExpandedRepaymentId(null);
                                } else {
                                  setExpandedRepaymentId(expense.id!);
                                }
                              }}
                            >
                              <span style={styles.menuIcon}><RepaymentIcon size={16} /></span>
                              {t('repayments')}
                            </button>
                            {repaymentTotals[expense.id!] > 0 && expense.needsRepaymentTracking && (
                              <button
                                className="menu-item-hover"
                                style={styles.menuItem}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onInlineUpdate(expense.id!, {
                                    repaymentTrackingCompleted: !expense.repaymentTrackingCompleted,
                                  });
                                }}
                              >
                                <span style={styles.menuIcon}>
                                  {expense.repaymentTrackingCompleted ? <CheckIcon size={16} /> : <CircleIcon size={16} />}
                                </span>
                                {expense.repaymentTrackingCompleted ? t('markAsIncomplete') : t('markRepaymentComplete')}
                              </button>
                            )}
                            <button
                              className="menu-item-hover"
                              style={{ ...styles.menuItem, color: 'var(--error-text)' }}
                              onClick={() => {
                                setOpenMenuId(null);
                                setDeleteConfirm({ isOpen: true, expenseId: expense.id! });
                              }}
                            >
                              <span style={styles.menuIcon}><DeleteIcon size={16} /></span>
                              {t('delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </>
              )}
              
              {/* Inline Repayment Manager */}
              {expandedRepaymentId === expense.id && (
                <div style={styles.inlineRepaymentSection}>
                  <RepaymentManager
                    expense={expense}
                    onClose={() => setExpandedRepaymentId(null)}
                    inline={true}
                    onRepaymentChange={onReloadRepayments}
                    cards={cards}
                    ewallets={ewallets}
                  />
                </div>
              )}
            </div>
              )})}
            </div>
          )})}
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
    </>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
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
    minWidth: '150px',
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  filterSelect: {
    flex: 1,
    minWidth: '120px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--card-bg)',
  },
  toggleFiltersButton: {
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--card-bg)',
    cursor: 'pointer',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    }
  } as React.CSSProperties,
  dateFilterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: '140px',
  },
  dateLabel: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  dateInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '120px',
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
    backgroundColor: 'var(--card-bg)',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'var(--card-bg)',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: 'var(--text-secondary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    paddingBottom: '100px',
  },
  expenseCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    minWidth: 0,
    overflow: 'visible',
    position: 'relative' as const,
    boxShadow: '0 3px 10px var(--shadow)',
    transition: 'all 0.2s ease',
  },
  dateRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-tertiary)', gap: '8px', minWidth: 0, flexWrap: 'wrap' as const },
  categoryRow: { display: 'flex', alignItems: 'center', fontSize: '12px', gap: '8px', minWidth: 0, flexWrap: 'wrap' as const },
  timeDisplay: { fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '500' as const },
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
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  category: {
    display: 'inline-block',
    padding: '5px 10px',
    background: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600' as const,
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 1px 3px var(--shadow)',
  },
  notes: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  amount: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: 'var(--error-text)',
    marginBottom: '4px',
    wordBreak: 'break-all' as const,
    lineHeight: '1.2',
  },
  amountSection: {
    marginBottom: '4px',
  },
  amountBreakdown: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '2px',
  },
  originalAmount: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    textDecoration: 'line-through',
  },
  repaidAmount: {
    fontSize: '14px',
    color: 'var(--success-text)',
    fontWeight: '500' as const,
  },
  netAmount: {
    fontSize: '18px',
    fontWeight: '700' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  amountBadge: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    backgroundColor: 'transparent',
    padding: 0,
    fontSize: '16px',
    fontWeight: '700' as const,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    lineHeight: 1,
    pointerEvents: 'none' as const,
  },
  amountMeta: {
    position: 'absolute' as const,
    top: '34px',
    right: '12px',
    textAlign: 'right' as const,
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: 1.2,
    pointerEvents: 'none' as const,
  },
  excessBadge: {
    fontSize: '11px',
    fontWeight: '500' as const,
    color: 'var(--info-text)',
  },
  excessBadgeSmall: {
    fontSize: '10px',
    fontWeight: '500' as const,
    color: 'var(--info-text)',
    marginLeft: '4px',
  },
  repaymentAnnotation: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  annotationItem: {
    display: 'flex',
    alignItems: 'center',
  },
  annotationDivider: {
    color: 'var(--border-color)',
  },
  completedBadge: {
    fontSize: '10px',
    fontWeight: '600' as const,
    color: 'var(--success-text)',
    backgroundColor: 'var(--success-bg)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '4px',
  },
  completedCheck: {
    marginLeft: '6px',
    color: 'var(--success-text)',
    fontWeight: '700' as const,
    fontSize: '14px',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
  },
  actions: { gap: '8px' },
  menuContainer: {
    position: 'relative' as const,
  },
  menuButton: {
    padding: '8px 12px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold' as const,
    lineHeight: '1',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 9999,
    minWidth: '160px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
    color: 'inherit',
  },
  iconButton: {
    padding: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
  primaryChip: {
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
  },
  dangerChip: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
  },
  successChip: {
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
  },
  neutralChip: {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  },
  completedChip: {
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    fontWeight: '700' as const,
  },
  warningChip: {
    backgroundColor: 'var(--warning-bg)',
    color: 'var(--warning-text)',
    fontWeight: '600' as const,
  },
  selectToggleButton: {
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.08)',
    backgroundColor: 'var(--card-bg)',
    cursor: 'pointer',
    fontWeight: 600 as const,
  },
  selectAllButton: {
    borderRadius: '8px',
    border: '1px solid var(--success-text)',
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600 as const,
  },
  deleteSelectedButton: {
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
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
  dateGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '12px',
  },
  dateGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '8px',
    borderLeft: '4px solid #1976d2',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    userSelect: 'none' as const,
  },
  dateGroupDate: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  expenseCount: {
    fontSize: '12px',
    fontWeight: '400' as const,
    color: 'var(--text-secondary)',
  },
  collapseIcon: {
    fontSize: '10px',
    color: 'var(--accent-primary)',
    display: 'inline-block',
    width: '12px',
    transition: 'transform 0.2s',
  },
  dateGroupTotal: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#1976d2',
  },
  inlineRepaymentSection: {
    marginTop: '12px',
    padding: '16px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
};

export default ExpenseList;
