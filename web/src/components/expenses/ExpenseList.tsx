import React, { useState, useMemo, useEffect } from 'react';
import { Expense, Category, Card, EWallet, Repayment, Bank, Transfer } from '../../types';
import { QuickExpensePreset, QuickExpensePresetInput } from '../../types/quickExpense';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getTodayLocal, formatDateLocal, formatDateWithUserFormat } from '../../utils/dateUtils';
import { quickExpenseService } from '../../services/quickExpenseService';
import { repaymentService } from '../../services/repaymentService';
import ConfirmModal from '../ConfirmModal';
import RepaymentForm from '../repayment/RepaymentForm';
import ExpenseForm from './ExpenseForm';
import { EditIcon, DeleteIcon, RepaymentIcon, CircleIcon, CheckIcon, PlusIcon } from '../icons';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';
import DatePicker from '../common/DatePicker';
import AutocompleteDropdown, { AutocompleteOption } from '../common/AutocompleteDropdown';
import PopupModal from '../common/PopupModal';

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
  banks?: Bank[];
  repayments?: Repayment[];
  transfers?: Transfer[];
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<Expense>) => void;
  onEdit?: (exp: Expense | null) => void;
  onBulkDelete?: (ids: string[]) => void;
  onReloadRepayments?: () => void; // Callback to reload repayments
  onCreateCard?: () => void;
  onCreateEWallet?: () => void;
  onAddTransfer?: (transfer: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, silent?: boolean) => Promise<void>;
  focusExpenseId?: string; // when set, scroll and highlight
  // Quick expense related
  quickExpensePresets?: QuickExpensePreset[];
  onQuickExpenseAdd?: (preset: QuickExpensePreset) => Promise<void>;
  onQuickExpensePresetsChange?: () => void;
  onManageQuickExpenses?: () => void;
  // DateNavigator integration - when not 'all', date filters are already applied by parent
  viewMode?: 'all' | 'day' | 'month' | 'year';
  selectedDate?: string;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  categories,
  cards = [],
  ewallets = [],
  banks = [],
  repayments = [],
  transfers = [],
  onDelete,
  onInlineUpdate,
  onBulkDelete,
  onReloadRepayments,
  onCreateCard,
  onCreateEWallet,
  onAddTransfer,
  focusExpenseId,
  quickExpensePresets = [],
  onQuickExpenseAdd,
  onQuickExpensePresetsChange,
  onManageQuickExpenses,
  viewMode = 'all',
  selectedDate,
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const { currentUser } = useAuth();
  const { showNotification, updateNotification } = useNotification();
  const today = getTodayLocal();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = formatDateLocal(oneMonthAgo);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(oneMonthAgoStr);
  const [dateTo, setDateTo] = useState(today);
  const [allDates, setAllDates] = useState(false);
  const [sortBy] = useState('date-desc'); // Currently only date-desc is used
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; expenseId: string | null }>({
    isOpen: false,
    expenseId: null,
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showQuickExpenseForm, setShowQuickExpenseForm] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [quickExpenseFormData, setQuickExpenseFormData] = useState<{
    name: string;
    amount: number; // stored in cents
    categoryId: string;
    description: string;
    paymentMethod: 'cash' | 'credit_card' | 'e_wallet' | 'bank';
    icon: string;
    cardId?: string;
    ewalletId?: string;
    bankId?: string;
  }>({
    name: '',
    amount: 0, // stored in cents
    categoryId: '',
    description: '',
    paymentMethod: 'cash',
    icon: '💰',
  });

  const {
    isSelectionMode: multiSelectEnabled,
    selectedIds,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectedIds,
    setIsSelectionMode: setMultiSelectEnabled
  } = useMultiSelect<Expense>();

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [quickExpenseLoading, setQuickExpenseLoading] = useState<string | null>(null);
  
  // Repayment editing states
  const [editingRepayment, setEditingRepayment] = useState<Repayment | null>(null);
  const [showRepaymentFormForExpenseId, setShowRepaymentFormForExpenseId] = useState<string | null>(null);
  const [deleteRepaymentConfirm, setDeleteRepaymentConfirm] = useState<{ isOpen: boolean; repaymentId: string | null }>({
    isOpen: false,
    repaymentId: null,
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest('.mobile-actions')) {
        setOpenMenuId(null);
      }
      // Removed click outside handling for quick expense form - PopupModal handles this
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

  // Find related transfer for an expense (by matching date, amount, and payment method)
  // Transfer.fromPaymentMethod should match expense.paymentMethod (money comes from expense's payment method)
  const findRelatedTransfer = (expense: Expense): Transfer | undefined => {
    return transfers.find(t => {
      // Match by date and amount
      const dateMatch = t.date === expense.date;
      const amountMatch = Math.abs(t.amount - expense.amount) < 0.01;
      
      // Match payment method as the source (fromPaymentMethod = expense's payment method)
      let paymentMethodMatch = false;
      if (expense.paymentMethod === 'credit_card') {
        paymentMethodMatch = t.fromPaymentMethod === 'credit_card' && t.fromCardId === expense.cardId;
      } else if (expense.paymentMethod === 'e_wallet') {
        paymentMethodMatch = t.fromPaymentMethod === 'e_wallet' && t.fromPaymentMethodName === expense.paymentMethodName;
      } else if (expense.paymentMethod === 'bank') {
        paymentMethodMatch = t.fromPaymentMethod === 'bank' && t.fromBankId === expense.bankId;
      } else if (expense.paymentMethod === 'cash') {
        paymentMethodMatch = t.fromPaymentMethod === 'cash';
      }
      
      return dateMatch && amountMatch && paymentMethodMatch;
    });
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

  // Handle adding a repayment
  const handleAddRepayment = async (expenseId: string, repaymentData: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>) => {
    if (!currentUser) return;
    
    const notificationId = showNotification('pending', t('saving'), { duration: 0 });
    
    try {
      await repaymentService.create({
        ...repaymentData,
        userId: currentUser.uid,
        expenseId: expenseId,
      });
      
      updateNotification(notificationId, { type: 'success', message: t('repaymentAdded'), duration: 3000 });
      setShowRepaymentFormForExpenseId(null);
      
      if (onReloadRepayments) {
        onReloadRepayments();
      }
    } catch (error) {
      console.error('Failed to add repayment:', error);
      updateNotification(notificationId, { type: 'error', message: t('failedToAddRepayment'), duration: 3000 });
    }
  };

  // Handle updating a repayment
  const handleUpdateRepayment = async (repaymentId: string, updates: Partial<Repayment>) => {
    if (!currentUser) return;
    
    const notificationId = showNotification('pending', t('saving'), { duration: 0 });
    
    try {
      await repaymentService.update(repaymentId, updates);
      
      updateNotification(notificationId, { type: 'success', message: t('repaymentUpdated'), duration: 3000 });
      setEditingRepayment(null);
      
      if (onReloadRepayments) {
        onReloadRepayments();
      }
    } catch (error) {
      console.error('Failed to update repayment:', error);
      updateNotification(notificationId, { type: 'error', message: t('failedToUpdateRepayment'), duration: 3000 });
    }
  };

  // Handle deleting a repayment
  const handleDeleteRepayment = async (repaymentId: string) => {
    if (!currentUser) return;
    
    const notificationId = showNotification('pending', t('deleting'), { duration: 0 });
    
    try {
      await repaymentService.delete(repaymentId);
      
      updateNotification(notificationId, { type: 'success', message: t('repaymentDeleted'), duration: 3000 });
      setDeleteRepaymentConfirm({ isOpen: false, repaymentId: null });
      
      if (onReloadRepayments) {
        onReloadRepayments();
      }
    } catch (error) {
      console.error('Failed to delete repayment:', error);
      updateNotification(notificationId, { type: 'error', message: t('failedToDeleteRepayment'), duration: 3000 });
    }
  };

  const filteredAndSortedExpenses = () => {
    const filtered = expenses.filter((expense) => {
      const matchesSearch = expense.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;
      
      // Skip date filtering if parent already filtered by viewMode (day/month/year)
      if (viewMode !== 'all') {
        return matchesSearch && matchesCategory;
      }
      
      // Month filter logic (only when viewMode is 'all')
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
    const formatted = formatDateWithUserFormat(dateString, dateFormat);
    return time ? `${formatted} ${time}` : formatted;
  };

  // Helper to format date based on current viewMode
  const formatDateByViewMode = (mode: 'all' | 'day' | 'month' | 'year', date: string): string => {
    switch (mode) {
      case 'day': return date;
      case 'month': return date.slice(0, 7);
      case 'year': return date.slice(0, 4);
      default: return date;
    }
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

  const startEdit = (expense: Expense) => {
    setEditingExpense(expense);
  };





  const groupedExpenses = groupExpensesByDate();

  // Handle quick expense click
  const handleQuickExpenseClick = async (preset: QuickExpensePreset) => {
    if (!onQuickExpenseAdd || quickExpenseLoading) return;
    
    setQuickExpenseLoading(preset.id);
    try {
      await onQuickExpenseAdd(preset);
    } finally {
      setQuickExpenseLoading(null);
    }
  };

  // Reset quick expense form
  const resetQuickExpenseForm = () => {
    setQuickExpenseFormData({
      name: '',
      amount: 0, // stored in cents
      categoryId: '',
      description: '',
      paymentMethod: 'cash',
      icon: '💰',
    });
    setShowQuickExpenseForm(false);
    setEditingPresetId(null);
  };

  // Save quick expense preset
  const handleSaveQuickExpensePreset = async () => {
    if (!currentUser || !quickExpenseFormData.name || !quickExpenseFormData.categoryId || quickExpenseFormData.amount <= 0) return;

    const cleanedData: QuickExpensePresetInput = {
      name: quickExpenseFormData.name,
      amount: quickExpenseFormData.amount / 100, // convert cents to dollars
      categoryId: quickExpenseFormData.categoryId,
      paymentMethod: quickExpenseFormData.paymentMethod,
      icon: quickExpenseFormData.icon,
    };
    
    if (quickExpenseFormData.description) cleanedData.description = quickExpenseFormData.description;
    if (quickExpenseFormData.cardId) cleanedData.cardId = quickExpenseFormData.cardId;
    if (quickExpenseFormData.ewalletId) cleanedData.ewalletId = quickExpenseFormData.ewalletId;
    if (quickExpenseFormData.bankId) cleanedData.bankId = quickExpenseFormData.bankId;

    const isEditing = !!editingPresetId;
    const notificationId = showNotification('pending', t('saving'), { duration: 0 });

    resetQuickExpenseForm();

    try {
      if (isEditing) {
        await quickExpenseService.update(editingPresetId, cleanedData);
        updateNotification(notificationId, {
          type: 'success',
          message: t('updateSuccess'),
          duration: 3000,
        });
      } else {
        await quickExpenseService.create(currentUser.uid, cleanedData);
        updateNotification(notificationId, {
          type: 'success',
          message: t('createSuccess'),
          duration: 3000,
        });
      }
      onQuickExpensePresetsChange?.();
    } catch (error) {
      console.error('Failed to save preset:', error);
      updateNotification(notificationId, {
        type: 'error',
        message: t('errorSavingData'),
        duration: 5000,
      });
    }
  };

  // Delete quick expense preset
  const handleDeleteQuickExpensePreset = async (presetId: string) => {
    const notificationId = showNotification('pending', t('deleting'), { duration: 0 });

    try {
      await quickExpenseService.delete(presetId);
      updateNotification(notificationId, {
        type: 'success',
        message: t('deleteSuccess'),
        duration: 3000,
      });
      onQuickExpensePresetsChange?.();
      resetQuickExpenseForm();
    } catch (error) {
      console.error('Failed to delete preset:', error);
      updateNotification(notificationId, {
        type: 'error',
        message: t('errorDeletingData'),
        duration: 5000,
      });
    }
  };

  // Edit quick expense preset
  const handleEditQuickExpensePreset = (preset: QuickExpensePreset) => {
    setEditingPresetId(preset.id);
    setQuickExpenseFormData({
      name: preset.name,
      amount: Math.round(preset.amount * 100), // convert dollars to cents
      categoryId: preset.categoryId,
      description: preset.description || '',
      paymentMethod: preset.paymentMethod || 'cash',
      cardId: preset.cardId,
      ewalletId: preset.ewalletId,
      bankId: preset.bankId,
      icon: preset.icon || '💰',
    });
    setShowQuickExpenseForm(true);
  };

  return (
    <>
      <style>{responsiveStyles}</style>
      <div style={styles.container}>
      {/* Filter Section */}
      <div style={styles.filterSection}>
        {/* Simplified filter - always visible */}
        <div style={styles.filterRow}>
          <SearchBar
            placeholder={t('searchExpenses')}
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={styles.toggleFiltersButton}
            aria-label="Toggle advanced filters"
          >
            {showAdvancedFilters ? '▼ ' : '▶ '}{t('filters')}
          </button>
        </div>
        {/* moved quick expense out of filterSection */}
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
              {/* Only show month filter when viewMode is 'all' (date filtering not handled by parent) */}
              {viewMode === 'all' && (
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
              )}
              {/* Show current viewMode date context when not 'all' */}
              {viewMode !== 'all' && selectedDate && (
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--background-secondary)', borderRadius: '6px' }}>
                  📅 {formatDateByViewMode(viewMode, selectedDate)}
                </div>
              )}
            </div>
            {/* Only show date range filters when viewMode is 'all' */}
            {viewMode === 'all' && (
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
                {/* Use shared DatePicker for desktop calendar support */}
                <div style={styles.dateFilterGroup}>
                  <DatePicker
                    label={t('from')}
                    value={dateFrom}
                    onChange={setDateFrom}
                    disabled={allDates || !!monthFilter}
                    dateFormat={dateFormat}
                    style={{ ...styles.dateInput, width: '100%' }}
                  />
                </div>
                <DatePicker
                  label={t('to')}
                  value={dateTo}
                  onChange={setDateTo}
                  disabled={allDates || !!monthFilter}
                  dateFormat={dateFormat}
                  style={{ ...styles.dateInput, width: '100%' }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Expense Scroll Bar: below filter section, above multi-select */}
      {onQuickExpenseAdd && (
        <div className="quick-expense-scroll-container">
          <div className="quick-expense-scroll-bar">
            {quickExpensePresets.map((preset) => {
              // Compact quick expense button: no category chip; derive aria-label with placeholder replacement
              const ariaLabel = (t('quickAddPresetAria') || 'Quick add {name}').replace('{name}', preset.name);
              return (
                <button
                  key={preset.id}
                  className={`quick-expense-scroll-btn ${quickExpenseLoading === preset.id ? 'loading' : ''}`}
                  onClick={() => handleQuickExpenseClick(preset)}
                  disabled={!!quickExpenseLoading}
                  aria-label={ariaLabel}
                >
                  {/* Compact layout: show name + amount inline. Category chip removed per user request */}
                  <span className="quick-expense-scroll-name">{preset.name}</span>
                  <span className="quick-expense-scroll-amount">${preset.amount.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
          {onManageQuickExpenses && (
            <div className="quick-expense-add-container">
              <button
                className="quick-expense-add-btn"
                onClick={() => setShowQuickExpenseForm(true)}
                aria-label={t('addQuickExpense')}
              >
                <span style={{ fontSize: '16px' }}>+</span>
                <span>{t('add')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons row - positioned at top-right of list */}
      <MultiSelectToolbar
        isSelectionMode={multiSelectEnabled}
        selectedCount={selectedIds.size}
        onToggleSelectionMode={toggleSelectionMode}
        onSelectAll={() => selectAll(filteredAndSortedExpenses())}
        onDeleteSelected={() => {
          const ids = Array.from(selectedIds);
          if (ids.length === 0) return;
          setBulkDeleteConfirm(true);
        }}
      />

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

                return (
                <div
                  key={expense.id}
                  id={`expense-${expense.id}`}
                  className="expense-card"
                  style={{
                    ...(openMenuId === expense.id ? { zIndex: 9999 } : {}),
                    ...(multiSelectEnabled && selectedIds.has(expense.id!) ? styles.selectedCard : {}),
                  }}
                >
              {/* View Mode - edit is now done via popup */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* First row: time, category, status on left; amount info on right */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                      {multiSelectEnabled && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(expense.id!)}
                          onChange={() => toggleSelection(expense.id!)}
                          aria-label={`Select expense ${expense.description}`}
                        />
                      )}
                      <span style={styles.timeDisplay}>{expense.time}</span>
                      <span style={{
                        ...styles.category,
                        backgroundColor: getCategoryColor(expense.category).background,
                        color: getCategoryColor(expense.category).color
                      }}>
                        {getCategoryDisplay(expense.category)}
                      </span>
                      {expense.needsRepaymentTracking && (
                        expense.repaymentTrackingCompleted ? (
                          <span style={styles.completedBadge}>
                            ✓ {t('completed')}
                          </span>
                        ) : (
                          <span style={styles.pendingBadge}>
                            ⏳ {t('pending')}
                          </span>
                        )
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                      {/* Amount Display */}
                      {(() => {
                        const repaid = repaymentTotals[expense.id!] || 0;
                        const netAmount = expense.amount - repaid;
                        const hasExcess = netAmount < 0;
                        const isRepaid = repaid > 0;
                        const color = isRepaid ? (hasExcess ? '#2196F3' : '#ff9800') : '#f44336';
                        return (
                          <div style={{
                            fontWeight: '700',
                            color,
                            fontSize: '16px',
                            textAlign: 'right',
                            lineHeight: 1,
                          }}>
                            ${Math.abs(isRepaid ? netAmount : expense.amount).toFixed(2)}
                            {isRepaid && hasExcess && (
                              <span style={styles.excessBadgeSmall}>({t('excess')})</span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Amount meta (original/repaid) */}
                      {(() => {
                        const repaid = repaymentTotals[expense.id!] || 0;
                        if (repaid > 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px', color: 'var(--text-secondary)', gap: '1px' }}>
                              <div>{t('original')}: <span style={{ color: 'var(--error-text)' }}>${expense.amount.toFixed(2)}</span></div>
                              <div>{t('repaid')}: <span style={{ color: 'var(--success-text)' }}>${repaid.toFixed(2)}</span></div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Second row: description */}
                  <h3 style={styles.description}>{expense.description}</h3>

                  {/* Third row: notes + payment method on left; buttons on right */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                      {expense.notes && <p style={styles.notes}>{expense.notes}</p>}
                      
                      {/* Payment Method Display */}
                      {expense.paymentMethod && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {expense.paymentMethod === 'cash' && `💵 ${t('cash')}`}
                          {expense.paymentMethod === 'credit_card' && `💳 ${t('creditCard')}`}
                          {expense.paymentMethod === 'e_wallet' && `📱 ${expense.paymentMethodName || t('eWallet')}`}
                          {expense.paymentMethod === 'bank' && `🏦 ${t('bankTransfer')}`}
                          {expense.paymentMethod === 'credit_card' && expense.cardId && (
                            <span>
                              {cards.find(c => c.id === expense.cardId)?.name && `(${cards.find(c => c.id === expense.cardId)?.name})`}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Transfer Info Display - Show the source (where the money came FROM) */}
                      {(() => {
                        const relatedTransfer = findRelatedTransfer(expense);
                        
                        if (relatedTransfer) {
                          // Show the destination (where the money goes TO)
                          const getToLabel = () => {
                            if (relatedTransfer.toPaymentMethod === 'cash') return `💵 ${t('cash')}`;
                            if (relatedTransfer.toPaymentMethod === 'credit_card') {
                              const card = cards.find(c => c.id === relatedTransfer.toCardId);
                              return `💳 ${card?.name || t('creditCard')}`;
                            }
                            if (relatedTransfer.toPaymentMethod === 'e_wallet') return `📱 ${relatedTransfer.toPaymentMethodName || t('eWallet')}`;
                            if (relatedTransfer.toPaymentMethod === 'bank') {
                              const bank = banks.find(b => b.id === relatedTransfer.toBankId);
                              return `🏦 ${bank?.name || t('bank')}`;
                            }
                            return '';
                          };
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-primary)', marginTop: '2px' }}>
                              <span>➡️ {t('to') || '到'}: {getToLabel()}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                      {/* Desktop: Show all buttons */}
                      <div className="desktop-actions" style={styles.actions}>
                        <button 
                          onClick={() => setShowRepaymentFormForExpenseId(expense.id!)}
                          className="btn-icon btn-icon-success"
                          aria-label={t('addRepayment')}
                          title={t('addRepayment')}
                        >
                          <PlusIcon size={18} />
                        </button>
                        
                        {expense.needsRepaymentTracking && (
                          <button
                            onClick={() => {
                              onInlineUpdate(expense.id!, {
                                repaymentTrackingCompleted: !expense.repaymentTrackingCompleted
                              });
                            }}
                            className={`btn-icon ${expense.repaymentTrackingCompleted ? 'btn-icon-success' : 'btn-icon-warning'}`}
                            aria-label={expense.repaymentTrackingCompleted ? t('markAsIncomplete') : t('markRepaymentComplete')}
                            title={expense.repaymentTrackingCompleted ? t('markAsIncomplete') : t('markRepaymentComplete')}
                          >
                            {expense.repaymentTrackingCompleted ? <CheckIcon size={18} /> : <CircleIcon size={18} />}
                          </button>
                        )}
                        
                        <button onClick={() => startEdit(expense)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, expenseId: expense.id! })}
                          className="btn-icon btn-icon-danger"
                          aria-label={t('delete')}
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </div>

                      {/* Mobile: Show hamburger menu */}
                      <div className="mobile-actions" style={styles.mobileActions}>
                        <div style={styles.menuContainer}>
                          <button
                            className="menu-trigger-button"
                            onClick={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id!)}
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
                                  startEdit(expense);
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
                                  setShowRepaymentFormForExpenseId(expense.id!);
                                }}
                              >
                                <span style={styles.menuIcon}><RepaymentIcon size={16} /></span>
                                {t('repayments')}
                              </button>
                              {expense.needsRepaymentTracking && (
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
                </div>

                {/* More Details Button - Only show if there are details to show */}
                {(expense.amountItems?.length || expense.notes || findRelatedTransfer(expense) || expense.needsRepaymentTracking) && (
                  <div style={styles.moreDetailsRow}>
                    <button
                      onClick={() => setExpandedDetailsId(expandedDetailsId === expense.id ? null : expense.id!)}
                      style={styles.moreDetailsBtn}
                    >
                      <span style={{ flex: 1, textAlign: 'center' }}>
                        ────── {t('showMore')} {expandedDetailsId === expense.id ? '▲' : '▼'} ──────
                      </span>
                    </button>
                  </div>
                )}

                {/* Expanded Details Section */}
                {expandedDetailsId === expense.id && (
                  <div style={styles.detailsSection}>
                    {/* Amount Items (if any) */}
                    {expense.amountItems && expense.amountItems.length > 0 && (
                      <div style={styles.detailsSubsection}>
                        <div style={styles.detailsLabel}>💰 {t('amountDetails')}</div>
                        <div style={styles.amountItemsDetail}>
                          {expense.amountItems.map((item, index) => (
                            <div key={index} style={styles.amountItemDetail}>
                              <span>${item.amount.toFixed(2)}</span>
                              {item.description && <span style={styles.amountItemDesc}>: {item.description}</span>}
                            </div>
                          ))}
                          {expense.taxRate && expense.taxAmount && (
                            <div style={styles.taxDetailRow}>
                              <span>{t('tax')} ({expense.taxRate}%): ${expense.taxAmount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes (if any and not already shown above) */}
                    {expense.notes && (
                      <div style={styles.detailsSubsection}>
                        <div style={styles.detailsLabel}>📝 {t('notes')}</div>
                        <div style={styles.detailsValue}>{expense.notes}</div>
                      </div>
                    )}

                    {/* Transfer Info (if any) */}
                    {(() => {
                      const relatedTransfer = findRelatedTransfer(expense);
                      if (relatedTransfer) {
                        const getToLabel = () => {
                          if (relatedTransfer.toPaymentMethod === 'cash') return `💵 ${t('cash')}`;
                          if (relatedTransfer.toPaymentMethod === 'credit_card') {
                            const card = cards.find(c => c.id === relatedTransfer.toCardId);
                            return `💳 ${card?.name || t('creditCard')}`;
                          }
                          if (relatedTransfer.toPaymentMethod === 'e_wallet') return `📱 ${relatedTransfer.toPaymentMethodName || t('eWallet')}`;
                          if (relatedTransfer.toPaymentMethod === 'bank') {
                            const bank = banks.find(b => b.id === relatedTransfer.toBankId);
                            return `🏦 ${bank?.name || t('bank')}`;
                          }
                          return '';
                        };
                        return (
                          <div style={styles.detailsSubsection}>
                            <div style={styles.detailsLabel}>➡️ {t('transfer')}</div>
                            <div style={styles.detailsValue}>{t('to')}: {getToLabel()}</div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Repayment Progress (if tracking) */}
                    {expense.needsRepaymentTracking && (
                      <div style={styles.detailsSubsection}>
                        <div style={styles.detailsLabel}>💳 {t('repaymentStatus')}</div>
                        {(() => {
                          const repaid = repaymentTotals[expense.id!] || 0;
                          const percentage = expense.amount > 0 ? Math.min(100, (repaid / expense.amount) * 100) : 0;
                          return (
                            <div style={styles.repaymentProgress}>
                              <div style={styles.progressBar}>
                                <div 
                                  style={{
                                    ...styles.progressFill,
                                    width: `${percentage}%`,
                                    backgroundColor: percentage >= 100 ? 'var(--success-text)' : 'var(--accent-primary)',
                                  }}
                                />
                              </div>
                              <div style={styles.progressText}>
                                {percentage.toFixed(0)}% {t('repaid')} (${repaid.toFixed(2)} / ${expense.amount.toFixed(2)})
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Repayment Records List (if any) with edit/delete - only for expenses with repayment tracking */}
                    {expense.needsRepaymentTracking && (() => {
                      const expenseRepayments = repayments.filter(r => r.expenseId === expense.id);
                      return (
                        <div style={styles.detailsSubsection}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={styles.detailsLabel}>📋 {t('repaymentRecords')}</div>
                            <button
                              onClick={() => setShowRepaymentFormForExpenseId(expense.id!)}
                              className="btn-icon btn-icon-success"
                              aria-label={t('addRepayment')}
                              title={t('addRepayment')}
                            >
                              <PlusIcon size={16} />
                            </button>
                          </div>
                          
                          {expenseRepayments.length > 0 ? (
                            <div style={styles.repaymentRecordsList}>
                              {expenseRepayments.map((rep) => {
                                const getPaymentLabel = () => {
                                  if (rep.paymentMethod === 'cash') return `💵 ${t('cash')}`;
                                  if (rep.paymentMethod === 'credit_card') {
                                    const card = cards.find(c => c.id === rep.cardId);
                                    return `💳 ${card?.name || t('creditCard')}`;
                                  }
                                  if (rep.paymentMethod === 'e_wallet') {
                                    return `📱 ${rep.paymentMethodName || t('eWallet')}`;
                                  }
                                  if (rep.paymentMethod === 'bank') {
                                    const bank = banks.find(b => b.id === rep.bankId);
                                    return `🏦 ${bank?.name || t('bank')}`;
                                  }
                                  return '';
                                };
                                return (
                                  <div key={rep.id} style={{ ...styles.repaymentRecordItem, flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                                    {/* First row: date, amount, payment method, action buttons */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                        <span style={styles.repaymentRecordDate}>{formatDateWithUserFormat(rep.date, dateFormat)}</span>
                                        <span style={styles.repaymentRecordAmount}>${rep.amount.toFixed(2)}</span>
                                        <span style={styles.repaymentRecordMethod}>{getPaymentLabel()}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                          onClick={() => setEditingRepayment(rep)}
                                          className="btn-icon btn-icon-primary"
                                          style={{ width: '28px', height: '28px' }}
                                          aria-label={t('edit')}
                                          title={t('edit')}
                                        >
                                          <EditIcon size={14} />
                                        </button>
                                        <button
                                          onClick={() => setDeleteRepaymentConfirm({ isOpen: true, repaymentId: rep.id! })}
                                          className="btn-icon btn-icon-danger"
                                          style={{ width: '28px', height: '28px' }}
                                          aria-label={t('delete')}
                                          title={t('delete')}
                                        >
                                          <DeleteIcon size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    {/* Second row: payerName and note (if any) */}
                                    {(rep.payerName || rep.note) && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        {rep.payerName && (
                                          <span>👤 {rep.payerName}</span>
                                        )}
                                        {rep.note && (
                                          <span>📝 {rep.note}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontStyle: 'italic' }}>
                              {t('noRepaymentRecords')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
            </div>
              );
              })}
            </div>
          );
          })}
        </div>
      )}

      {/* Edit Expense Popup Modal */}
      <PopupModal
        isOpen={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
        title={t('editExpense')}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="700px"
      >
        {editingExpense && (
          <ExpenseForm
            initialData={editingExpense}
            initialTransfer={findRelatedTransfer(editingExpense)}
            categories={categories}
            cards={cards}
            ewallets={ewallets}
            banks={banks}
            onSubmit={(data) => {
              onInlineUpdate(editingExpense.id!, data);
              setEditingExpense(null);
            }}
            onCancel={() => setEditingExpense(null)}
            onCreateCard={onCreateCard}
            onCreateEWallet={onCreateEWallet}
            onAddTransfer={onAddTransfer}
            title={t('editExpense')}
            dateFormat={dateFormat}
          />
        )}
      </PopupModal>
      
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

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        title={t('deleteSelected')}
        message={t('confirmBulkDelete').replace('{count}', selectedIds.size.toString())}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        onConfirm={() => {
          const ids = Array.from(selectedIds);
          onBulkDelete && onBulkDelete(ids);
          clearSelection();
          setMultiSelectEnabled(false);
          setBulkDeleteConfirm(false);
        }}
        onCancel={() => setBulkDeleteConfirm(false)}
        danger={true}
      />

      {/* Add Repayment Modal */}
      <PopupModal
        isOpen={showRepaymentFormForExpenseId !== null}
        onClose={() => setShowRepaymentFormForExpenseId(null)}
        title={t('addRepayment')}
        hideFooter={true}
        hideHeader={true}
        chromeless={true}
        maxWidth="500px"
      >
        {showRepaymentFormForExpenseId && (
          <RepaymentForm
            expenseId={showRepaymentFormForExpenseId}
            maxAmount={
              (() => {
                const exp = expenses.find(e => e.id === showRepaymentFormForExpenseId);
                if (!exp) return 0;
                const repaid = repaymentTotals[exp.id!] || 0;
                return Math.max(0, exp.amount - repaid);
              })()
            }
            onSubmit={(data) => handleAddRepayment(showRepaymentFormForExpenseId, data)}
            onCancel={() => setShowRepaymentFormForExpenseId(null)}
            cards={cards}
            ewallets={ewallets}
            banks={banks}
          />
        )}
      </PopupModal>

      {/* Edit Repayment Modal */}
      <PopupModal
        isOpen={editingRepayment !== null}
        onClose={() => setEditingRepayment(null)}
        title={t('editRepayment')}
        hideFooter={true}
        hideHeader={true}
        chromeless={true}
        maxWidth="500px"
      >
        {editingRepayment && (
          <RepaymentForm
            expenseId={editingRepayment.expenseId}
            initialData={editingRepayment}
            maxAmount={
              (() => {
                const exp = expenses.find(e => e.id === editingRepayment.expenseId);
                if (!exp) return 0;
                const repaid = repaymentTotals[exp.id!] || 0;
                // Add back the current repayment amount since we're editing it
                return Math.max(0, exp.amount - repaid + editingRepayment.amount);
              })()
            }
            onSubmit={(data) => handleUpdateRepayment(editingRepayment.id!, data)}
            onCancel={() => setEditingRepayment(null)}
            cards={cards}
            ewallets={ewallets}
            banks={banks}
          />
        )}
      </PopupModal>

      {/* Delete Repayment Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteRepaymentConfirm.isOpen}
        title={t('deleteRepayment')}
        message={t('confirmDeleteRepayment')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteRepaymentConfirm.repaymentId) {
            handleDeleteRepayment(deleteRepaymentConfirm.repaymentId);
          }
        }}
        onCancel={() => setDeleteRepaymentConfirm({ isOpen: false, repaymentId: null })}
      />

      {/* Quick Expense Preset Form Modal */}
      <PopupModal
        isOpen={showQuickExpenseForm}
        onClose={resetQuickExpenseForm}
        title={editingPresetId ? t('editQuickExpense') : t('addQuickExpense')}
        hideFooter={true}
        maxWidth="500px"
      >
        <div className="quick-expense-form-modal">
          {/* Quick Expense Preset Form */}
          <div className="quick-expense-form-section">
            <div className="quick-expense-form-field">
              <label>{t('presetName')}</label>
              <input
                type="text"
                value={quickExpenseFormData.name}
                onChange={(e) => setQuickExpenseFormData({ ...quickExpenseFormData, name: e.target.value })}
                placeholder={t('quickExpenseNamePlaceholder')}
              />
            </div>

            <div className="quick-expense-form-field">
              <label>{t('amount')}</label>
              <input
                type="text"
                inputMode="numeric"
                value={(quickExpenseFormData.amount / 100).toFixed(2)}
                onChange={(e) => {
                  const value = e.target.value;
                  const digitsOnly = value.replace(/\D/g, '');
                  const amountInCents = parseInt(digitsOnly) || 0;
                  setQuickExpenseFormData({ ...quickExpenseFormData, amount: amountInCents });
                }}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
              />
            </div>

            <div className="quick-expense-form-field">
              <AutocompleteDropdown
                options={categories.map((cat): AutocompleteOption => ({
                  id: cat.id || '',
                  label: cat.name,
                  icon: cat.icon,
                  color: cat.color,
                }))}
                value={quickExpenseFormData.categoryId}
                onChange={(categoryId: string) => {
                  const cat = categories.find(c => c.id === (categoryId || ''));
                  setQuickExpenseFormData({ 
                    ...quickExpenseFormData, 
                    categoryId: categoryId || '', 
                    icon: cat?.icon || quickExpenseFormData.icon || '💰'
                  });
                }}
                label={t('category')}
                placeholder={t('selectCategory')}
                allowClear={false}
              />
            </div>

            <div className="quick-expense-form-field">
              <label>{t('paymentMethod')}</label>
              <select
                value={quickExpenseFormData.paymentMethod}
                onChange={(e) => setQuickExpenseFormData({ 
                  ...quickExpenseFormData, 
                  paymentMethod: e.target.value as 'cash' | 'credit_card' | 'e_wallet' | 'bank',
                  cardId: undefined,
                  ewalletId: undefined,
                  bankId: undefined,
                })}
              >
                <option value="cash">{t('cash')}</option>
                <option value="credit_card">{t('creditCard')}</option>
                <option value="e_wallet">{t('eWallet')}</option>
                <option value="bank">{t('bankAccount')}</option>
              </select>
            </div>

            {quickExpenseFormData.paymentMethod === 'credit_card' && cards.length > 0 && (
              <div className="quick-expense-form-field">
                <label>{t('selectCard')}</label>
                <select
                  value={quickExpenseFormData.cardId || ''}
                  onChange={(e) => setQuickExpenseFormData({ ...quickExpenseFormData, cardId: e.target.value || undefined })}
                >
                  <option value="">{t('selectCard')}</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
              </div>
            )}

            {quickExpenseFormData.paymentMethod === 'e_wallet' && ewallets.length > 0 && (
              <div className="quick-expense-form-field">
                <label>{t('selectEWallet')}</label>
                <select
                  value={quickExpenseFormData.ewalletId || ''}
                  onChange={(e) => setQuickExpenseFormData({ ...quickExpenseFormData, ewalletId: e.target.value || undefined })}
                >
                  <option value="">{t('selectEWallet')}</option>
                  {ewallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                  ))}
                </select>
              </div>
            )}

            {quickExpenseFormData.paymentMethod === 'bank' && banks.length > 0 && (
              <div className="quick-expense-form-field">
                <label>{t('selectBank')}</label>
                <select
                  value={quickExpenseFormData.bankId || ''}
                  onChange={(e) => setQuickExpenseFormData({ ...quickExpenseFormData, bankId: e.target.value || undefined })}
                >
                  <option value="">{t('selectBank')}</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="quick-expense-form-actions">
              <button 
                onClick={handleSaveQuickExpensePreset} 
                className="btn-save"
                disabled={!quickExpenseFormData.name || !quickExpenseFormData.categoryId || quickExpenseFormData.amount <= 0}
              >
                {editingPresetId ? t('update') : t('save')}
              </button>
              <button 
                onClick={resetQuickExpenseForm} 
                className="btn-cancel"
              >
                {t('cancel')}
              </button>
            </div>
          </div>

          {/* Existing Presets List */}
          {quickExpensePresets.length > 0 && (
            <>
              <div className="quick-expense-form-divider"></div>
              <div className="quick-expense-presets-list">
                <h4>{t('quickExpenses')}</h4>
                {quickExpensePresets.map((preset) => {
                  const category = categories.find((c) => c.id === preset.categoryId);
                  return (
                    <div key={preset.id} className="quick-expense-preset-item">
                      <div className="preset-info">
                        <span className="preset-name">{preset.name}</span>
                        <span className="preset-details">
                          <span className="preset-category">{category?.icon} {category?.name}</span>
                          <span className="preset-amount">${preset.amount.toFixed(2)}</span>
                        </span>
                      </div>
                      <div className="preset-actions">
                        <button 
                          onClick={() => handleEditQuickExpensePreset(preset)}
                          className="btn-icon"
                          aria-label={t('edit')}
                        >
                          <EditIcon size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteQuickExpensePreset(preset.id)}
                          className="btn-icon btn-danger"
                          aria-label={t('delete')}
                        >
                          <DeleteIcon size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </PopupModal>
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
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  toggleFiltersButton: {
    padding: '10px 16px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
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
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  dateInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '120px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    outline: 'none',
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
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: 'var(--text-secondary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    /* Global `body` already has bottom safe-padding to avoid the FAB.
       Remove local padding to prevent double spacing on Expenses page. */
    paddingBottom: 0,
  },
  selectedCard: {
    boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.35)'
  },
  timeDisplay: { fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '500' as const },
  mainRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', minWidth: 0 },
  leftCol: { flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  rightCol: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '8px', flexShrink: 0 },
  expenseInfo: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    margin: '0',
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
  categoryIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  date: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  notes: {
    margin: '0',
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
  },
  pendingBadge: {
    fontSize: '10px',
    fontWeight: '600' as const,
    color: 'var(--warning-text)',
    backgroundColor: 'var(--warning-bg)',
    padding: '2px 6px',
    borderRadius: '4px',
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
  mobileActions: {
    marginTop: '4px',
  },
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
    fontWeight: 600,
  },
  selectAllButton: {
    borderRadius: '8px',
    border: '1px solid var(--success-text)',
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  deleteSelectedButton: {
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600,
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
    // Spacer wrapper only; visual card is handled inside RepaymentManager (inline mode)
    marginTop: '12px',
  },
  // More Details styles
  moreDetailsRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '8px',
  },
  moreDetailsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '4px 12px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    width: '100%',
  },
  detailsSection: {
    marginTop: '12px',
    padding: '12px',
    background: 'var(--bg-secondary)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  detailsSubsection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  detailsLabel: {
    fontSize: '12px',
    fontWeight: '600' as const,
    color: 'var(--text-secondary)',
  },
  detailsValue: {
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  amountItemsDetail: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  amountItemDetail: {
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  amountItemDesc: {
    color: 'var(--text-secondary)',
  },
  taxDetailRow: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic' as const,
    marginTop: '4px',
    paddingTop: '4px',
    borderTop: '1px solid var(--border-color)',
  },
  repaymentProgress: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  progressBar: {
    height: '8px',
    background: 'var(--border-color)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  addRepaymentBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500' as const,
    borderRadius: '6px',
    border: '1px solid var(--success-text)',
    background: 'transparent',
    color: 'var(--success-text)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  repaymentRecordsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  repaymentRecordItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 8px',
    background: 'var(--card-bg)',
    borderRadius: '4px',
    fontSize: '12px',
  },
  repaymentRecordDate: {
    color: 'var(--text-secondary)',
    minWidth: '80px',
  },
  repaymentRecordAmount: {
    fontWeight: '600' as const,
    color: 'var(--success-text)',
    minWidth: '60px',
  },
  repaymentRecordMethod: {
    color: 'var(--text-secondary)',
    flex: 1,
  },
  manageRepaymentsBtn: {
    marginTop: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500' as const,
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
};

export default ExpenseList;
