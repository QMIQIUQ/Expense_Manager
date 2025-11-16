import React, { useState, useMemo } from 'react';
import { Expense, Category, Card, EWallet, Repayment } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../ConfirmModal';
import RepaymentManager from '../repayment/RepaymentManager';
import { EditIcon, DeleteIcon, CheckIcon, CloseIcon, RepaymentIcon } from '../icons';

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
    paymentMethod?: Expense['paymentMethod'];
    cardId?: string;
    paymentMethodName?: string;
  }>({});
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedRepaymentId, setExpandedRepaymentId] = useState<string | null>(null);

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

    if (Object.keys(updates).length > 0) {
      onInlineUpdate(expense.id!, updates);
    }
    cancelInlineEdit();
  };

  const summary = calculateSummary();

  const groupedExpenses = groupExpensesByDate();

  return (
    <div style={styles.container}>
      {/* Filter Section with integrated summary */}
      <div style={styles.filterSection}>
        {/* Summary row at the top of filter section */}
        <div style={styles.summaryRow}>
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
            <label htmlFor="allDatesToggle" style={{ fontSize: '14px', color: '#444' }}>{t('allDates')}</label>
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
              <div style={styles.dateGroupHeader}>
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
                  <div style={styles.categoryRow}>
                    {(expense as Expense & { time?: string }).time && (
                      <span style={styles.timeDisplay}>{(expense as Expense & { time?: string }).time}</span>
                    )}
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
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
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
                      <select
                        value={draft.cardId || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, cardId: e.target.value }))}
                        style={{ ...styles.select, minWidth: '200px', flex: 1 }}
                      >
                        <option value="">{t('selectCard')}</option>
                        {cards.length === 0 && <option value="" disabled>No cards available</option>}
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>
                            💳 {card.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {draft.paymentMethod === 'e_wallet' && (
                      <input
                        type="text"
                        value={draft.paymentMethodName || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, paymentMethodName: e.target.value }))}
                        placeholder={t('eWalletNameLabel') || 'E-wallet name'}
                        style={{ ...styles.input, minWidth: '220px', flex: 1 }}
                        list={walletDatalistId}
                      />
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
                <div style={styles.mainRow}>
                  <div style={styles.leftCol}>
                    <h3 style={styles.description}>{expense.description}</h3>
                    {expense.notes && <p style={styles.notes}>{expense.notes}</p>}
                    
                    {/* Repayment Info Annotation */}
                    {(() => {
                      const repaid = repaymentTotals[expense.id!] || 0;
                      if (repaid > 0) {
                        return (
                          <div style={styles.repaymentAnnotation}>
                            <span style={styles.annotationItem}>
                              {t('original')}: ${expense.amount.toFixed(2)}
                            </span>
                            <span style={styles.annotationDivider}>|</span>
                            <span style={styles.annotationItem}>
                              {t('repaid')}: ${repaid.toFixed(2)}
                            </span>
                            {expense.repaymentTrackingCompleted && (
                              <span style={styles.completedBadge}>
                                ✓ {t('completed')}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Payment Method Display */}
                    {expense.paymentMethod && (
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {expense.paymentMethod === 'cash' && `💵 ${t('cash')}`}
                        {expense.paymentMethod === 'credit_card' && `💳 ${t('creditCard')}`}
                        {expense.paymentMethod === 'e_wallet' && `📱 ${expense.paymentMethodName || t('eWallet')}`}
                      </p>
                    )}
                  </div>
                  <div style={styles.rightCol}>
                    <div style={styles.amountSection}>
                      {(() => {
                        const repaid = repaymentTotals[expense.id!] || 0;
                        const netAmount = expense.amount - repaid;
                        const hasExcess = netAmount < 0;
                        
                        if (repaid > 0) {
                          return (
                            <div style={{
                              ...styles.amount,
                              color: hasExcess ? '#2196F3' : '#ff9800'
                            }}>
                              ${Math.abs(netAmount).toFixed(2)}
                              {hasExcess && <span style={styles.excessBadgeSmall}>({t('excess')})</span>}
                            </div>
                          );
                        }
                        return <div style={styles.amount}>${expense.amount.toFixed(2)}</div>;
                      })()}
                    </div>
                    <div style={styles.actions}>
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
                          ...(expandedRepaymentId === expense.id ? { backgroundColor: '#4CAF50', color: 'white' } : {})
                        }} 
                        aria-label={t('repayments')}
                        title={t('repayments')}
                      >
                        <RepaymentIcon size={18} />
                      </button>
                      
                      {/* Show repayment completion toggle when expense has repayments */}
                      {repaymentTotals[expense.id!] > 0 && (
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
                          {expense.repaymentTrackingCompleted ? '✓' : '○'}
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
                  </div>
                </div>
              )}
              
              {/* Inline Repayment Manager */}
              {expandedRepaymentId === expense.id && (
                <div style={styles.inlineRepaymentSection}>
                  <RepaymentManager
                    expense={expense}
                    onClose={() => setExpandedRepaymentId(null)}
                    inline={true}
                    onRepaymentChange={onReloadRepayments}
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
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  summaryRow: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
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
    backgroundColor: 'white',
  },
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
    color: '#555',
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
    paddingBottom: '100px',
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
  categoryRow: { display: 'flex', alignItems: 'center', fontSize: '12px', gap: '8px', minWidth: 0, flexWrap: 'wrap' as const },
  timeDisplay: { fontSize: '12px', color: '#888', fontWeight: '500' as const },
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
    color: '#999',
    textDecoration: 'line-through',
  },
  repaidAmount: {
    fontSize: '14px',
    color: '#4CAF50',
    fontWeight: '500' as const,
  },
  netAmount: {
    fontSize: '18px',
    fontWeight: '700' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  excessBadge: {
    fontSize: '11px',
    fontWeight: '500' as const,
    color: '#2196F3',
  },
  excessBadgeSmall: {
    fontSize: '10px',
    fontWeight: '500' as const,
    color: '#2196F3',
    marginLeft: '4px',
  },
  repaymentAnnotation: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
    fontSize: '11px',
    color: '#666',
  },
  annotationItem: {
    display: 'flex',
    alignItems: 'center',
  },
  annotationDivider: {
    color: '#ddd',
  },
  completedBadge: {
    fontSize: '10px',
    fontWeight: '600' as const,
    color: '#16a34a',
    backgroundColor: 'rgba(34,197,94,0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '4px',
  },
  actions: { display: 'flex', gap: '8px' },
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
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#4f46e5',
  },
  dangerChip: {
    backgroundColor: 'rgba(244,63,94,0.12)',
    color: '#b91c1c',
  },
  successChip: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    color: '#16a34a',
  },
  neutralChip: {
    backgroundColor: 'rgba(148,163,184,0.2)',
    color: '#374151',
  },
  completedChip: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    color: '#16a34a',
    fontWeight: '700' as const,
  },
  warningChip: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    color: '#d97706',
    fontWeight: '600' as const,
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
  dateGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '20px',
  },
  dateGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#e8f4f8',
    borderRadius: '8px',
    borderLeft: '4px solid #1976d2',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    userSelect: 'none' as const,
  },
  dateGroupDate: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#333',
  },
  expenseCount: {
    fontSize: '12px',
    fontWeight: '400' as const,
    color: '#666',
  },
  collapseIcon: {
    fontSize: '10px',
    color: '#1976d2',
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
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
  },
};

export default ExpenseList;
