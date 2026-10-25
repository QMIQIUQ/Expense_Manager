import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { acceptLocalMutation } from '../../services/acceptLocalMutation';
import { prepareRepaymentSettlement } from '../../services/splitSettlementService';
const ReceiptAttachmentPanel = React.lazy(() => import('./ReceiptAttachmentPanel'));
import { ExpenseSplitSummary } from './ExpenseSplitSummary';
import { indexBy } from '../../utils/indexBy';
import { useExpenseTags } from '../../hooks/useExpenseTags';
import { Expense, Category, Card, EWallet, Repayment, Bank, Transfer, CurrencyCode } from '../../types';
import { QuickExpensePreset, QuickExpensePresetInput } from '../../types/quickExpense';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getTodayLocal, formatDateLocal, formatDateWithUserFormat } from '../../utils/dateUtils';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getExpenseBaseCurrency, getExpenseDisplaySource, normalizeCurrencyCode } from '../../utils/currencyUtils';
import { quickExpenseService } from '../../services/quickExpenseService';
import { repaymentService } from '../../services/repaymentService';
import ConfirmModal from '../ConfirmModal';
import RepaymentForm from '../repayment/RepaymentForm';
import StepByStepExpenseForm from './StepByStepExpenseForm';
import { EditIcon, DeleteIcon, RepaymentIcon, CircleIcon, CheckIcon, PlusIcon } from '../icons';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';
import DatePicker from '../common/DatePicker';
import AutocompleteDropdown, { AutocompleteOption } from '../common/AutocompleteDropdown';
import PopupModal from '../common/PopupModal';
import CurrencySelector from '../common/CurrencySelector';
import DisplayCurrencyAmount from '../common/DisplayCurrencyAmount';
import { useCurrencyConversionMap } from '../../hooks/useCurrencyConversionMap';
import { getRepaymentBaseAmount } from '../../utils/currencyUtils';
import { sortCategories } from '../../utils/categoryOrder';
import type { ExpensePeriodMode } from '../../types/expensePeriod';
import CatIllustration from '../CatIllustration';
import { getCurrencyMinorDigits, roundMoney } from '../../domain/money';
import { dataService } from '../../services/dataService';
import { queueFailedWrite, writeLocalFirst } from '../../utils/localFirstMutation';
import { applyPendingOperations } from '../../utils/pendingOperations';
import { reconcileOptimisticCollection } from '../../utils/optimisticCollection';
import { hasReceivablePlan, isOpenReceivable, receivableProgress } from '../../utils/expenseSplitCalculator';

const EMPTY_REPAYMENTS: Repayment[] = [];
const EMPTY_QUICK_EXPENSE_PRESETS: QuickExpensePreset[] = [];

const isRetryableNetworkError = (error: unknown): boolean => {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code).toLowerCase().split('/').pop()
    : '';
  if (['permission-denied', 'invalid-argument', 'failed-precondition'].includes(code || '')) return false;
  return ['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code || '') ||
    (typeof navigator !== 'undefined' && !navigator.onLine);
};

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
  allExpenses?: Expense[];
  categories: Category[];
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[];
  repayments?: Repayment[];
  transfers?: Transfer[];
  displayCurrency?: CurrencyCode;
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, updates: Partial<Expense>, expectedRevision?: number) => Promise<'saved' | 'queued' | 'failed'>;
  onEdit?: (exp: Expense | null) => void;
  onBulkDelete?: (ids: string[]) => void;
  onReloadRepayments?: () => void; // Callback to reload repayments
  onCreateCard?: () => void;
  onCreateEWallet?: () => void;
  onCreateBank?: () => void;
  onAddTransfer?: (transfer: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, silent?: boolean) => Promise<void>;
  onManageTransferHistory?: () => void;
  focusExpenseId?: string; // when set, scroll and highlight
  onFocusHandled?: () => void;
  // Quick expense related
  quickExpensePresets?: QuickExpensePreset[];
  onQuickExpenseAdd?: (preset: QuickExpensePreset) => Promise<void>;
  onQuickExpensePresetsChange?: () => void;
  onManageQuickExpenses?: () => void;
  // DateNavigator integration - when not 'all', date filters are already applied by parent
  viewMode?: ExpensePeriodMode;
  selectedDate?: string;
  /** Parent has already applied period, search, category, payment and sort rules. */
  prefiltered?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  allExpenses = expenses,
  categories,
  cards = [],
  ewallets = [],
  banks = [],
  repayments = EMPTY_REPAYMENTS,
  transfers = [],
  displayCurrency,
  onDelete,
  onInlineUpdate,
  onBulkDelete,
  onCreateCard,
  onCreateEWallet,
  onCreateBank,
  onAddTransfer,
  onManageTransferHistory,
  focusExpenseId,
  onFocusHandled,
  quickExpensePresets = EMPTY_QUICK_EXPENSE_PRESETS,
  onQuickExpenseAdd,
  onQuickExpensePresetsChange,
  onManageQuickExpenses,
  viewMode = 'all',
  selectedDate,
  prefiltered = false,
  hasActiveFilters = false,
  onClearFilters,
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const { currentUser } = useAuth();
  const repaymentOwner = useRef(currentUser?.uid); repaymentOwner.current = currentUser?.uid;
  const focusHandledCallback = useRef(onFocusHandled); focusHandledCallback.current = onFocusHandled;
  const handledFocusExpenseId = useRef<string>();
  const { rows: expenseTags } = useExpenseTags(currentUser?.uid);
  const { showNotification, updateNotification } = useNotification();
  const today = getTodayLocal();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = formatDateLocal(oneMonthAgo);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [localRepayments, setLocalRepayments] = useState(repayments);
  const transfersByDate = useMemo(() => indexBy(transfers, (row) => row.date), [transfers]);
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
  const [localQuickExpensePresets, setLocalQuickExpensePresets] = useState(quickExpensePresets);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [quickExpenseFormData, setQuickExpenseFormData] = useState<{
    name: string;
    amount: number; // stored in cents
    currency: string;
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
    currency: DEFAULT_BASE_CURRENCY,
    categoryId: '',
    description: '',
    paymentMethod: 'cash',
    icon: '💰',
  });
  const quickExpenseCurrencyDigits = getCurrencyMinorDigits(quickExpenseFormData.currency);

  useEffect(() => {
    setLocalQuickExpensePresets(applyPendingOperations('quickExpensePresets', currentUser?.uid || '', quickExpensePresets));
  }, [quickExpensePresets, currentUser?.uid]);

  useEffect(() => {
    setLocalRepayments(applyPendingOperations('repayments', currentUser?.uid || '', repayments));
  }, [repayments, currentUser?.uid]);

  useEffect(() => {
    const handlePresetSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string }>).detail;
      if (detail?.entity === 'quickExpensePreset' && detail.userId === currentUser?.uid) {
        onQuickExpensePresetsChange?.();
      }
    };
    window.addEventListener('offline-operation-synced', handlePresetSynced);
    return () => window.removeEventListener('offline-operation-synced', handlePresetSynced);
  }, [currentUser?.uid, onQuickExpensePresetsChange]);

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
  const [receiptPickerTarget, setReceiptPickerTarget] = useState<{ expenseId: string; request: number } | null>(null);
  const receiptPickerRequestRef = useRef(0);
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
    return { background: 'var(--accent-light)', color: 'var(--accent-primary)' };
  };

  // Find related transfer for an expense (by matching date, amount, and payment method)
  // Transfer.fromPaymentMethod should match expense.paymentMethod (money comes from expense's payment method)
  const findRelatedTransfer = (expense: Expense): Transfer | undefined => {
    const expenseBaseAmount = getExpenseBaseAmount(expense);
    return transfersByDate.get(expense.date)?.find(t => {
      // Match by date and amount
      const dateMatch = t.date === expense.date;
      const amountMatch = Math.abs(t.amount - expenseBaseAmount) < 0.01;
      
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
  useEffect(() => {
    if (!focusExpenseId || !currentUser?.uid) return;
    const focusedExpense = expenses.find((expense) => expense.id === focusExpenseId && expense.userId === currentUser.uid);
    if (!focusedExpense) return;
    setCollapsedGroups((previous) => {
      if (!previous.has(focusedExpense.date)) return previous;
      const next = new Set(previous);
      next.delete(focusedExpense.date);
      return next;
    });
  }, [currentUser?.uid, expenses, focusExpenseId]);

  useEffect(() => {
    if (!focusExpenseId) {
      handledFocusExpenseId.current = undefined;
      return;
    }
    if (handledFocusExpenseId.current === focusExpenseId) return;

    let retryInterval: number | undefined;
    let retryTimeout: number | undefined;
    const focusTarget = () => {
      if (handledFocusExpenseId.current === focusExpenseId) return true;
      const element = document.getElementById(`expense-${focusExpenseId}`);
      if (!element) return false;

      handledFocusExpenseId.current = focusExpenseId;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const original = element.style.boxShadow;
      element.style.boxShadow = '0 0 0 3px var(--accent-secondary)';
      window.setTimeout(() => { element.style.boxShadow = original; }, 2000);
      focusHandledCallback.current?.();
      return true;
    };

    if (!focusTarget()) {
      retryInterval = window.setInterval(() => {
        if (focusTarget() && retryInterval) window.clearInterval(retryInterval);
      }, 100);
      retryTimeout = window.setTimeout(() => {
        if (retryInterval) window.clearInterval(retryInterval);
      }, 5000);
    }

    return () => {
      if (retryInterval) window.clearInterval(retryInterval);
      if (retryTimeout) window.clearTimeout(retryTimeout);
    };
  }, [expenses, focusExpenseId]);

  const expenseById = useMemo(() => {
    return new Map(allExpenses
      .filter((expense) => expense.userId === currentUser?.uid && !!expense.id)
      .map((expense) => [expense.id!, expense]));
  }, [allExpenses, currentUser?.uid]);
  const ownedRepayments = useMemo(() => localRepayments.filter((repayment) =>
    !!currentUser?.uid && repayment.userId === currentUser.uid &&
    expenseById.get(repayment.expenseId || '')?.userId === currentUser.uid), [currentUser?.uid, expenseById, localRepayments]);
  const repaymentsByExpense = useMemo(() => indexBy(ownedRepayments, (row) => row.expenseId), [ownedRepayments]);
  // Calculate repayment totals only for expenses and records owned by the active user.
  const repaymentTotals = useMemo(() => {
    const totals: { [expenseId: string]: number } = {};
    ownedRepayments.forEach((repayment) => {
      if (repayment.expenseId) {
        totals[repayment.expenseId] = (totals[repayment.expenseId] || 0) + getRepaymentBaseAmount(repayment);
      }
    });
    return totals;
  }, [ownedRepayments]);

  const expenseDisplayEntries = useMemo(() => {
    if (!displayCurrency) return [];
    return expenses
      .filter((expense) => !!expense.id)
      .map((expense) => {
        const displaySource = getExpenseDisplaySource(expense, displayCurrency);
        return {
          key: expense.id as string,
          amount: displaySource.amount,
          sourceCurrency: displaySource.sourceCurrency,
          date: expense.date,
        };
      });
  }, [displayCurrency, expenses]);

  const repaymentDisplayEntries = useMemo(() => {
    if (!displayCurrency) return [];
    return ownedRepayments
      .filter((repayment) => !!repayment.id)
      .map((repayment) => {
        const linkedExpense = expenseById.get(repayment.expenseId || '');
        return {
          key: repayment.id as string,
          amount: getRepaymentBaseAmount(repayment),
          sourceCurrency: repayment.baseCurrency || (linkedExpense ? getExpenseBaseCurrency(linkedExpense) : DEFAULT_BASE_CURRENCY),
          date: repayment.date,
        };
      });
  }, [displayCurrency, expenseById, ownedRepayments]);

  const expenseDisplayAmountsById = useCurrencyConversionMap(expenseDisplayEntries, displayCurrency);
  const repaymentDisplayAmountsById = useCurrencyConversionMap(repaymentDisplayEntries, displayCurrency);

  const getDisplayCurrencyForExpense = (expense: Expense): CurrencyCode => {
    if (displayCurrency) return displayCurrency;
    return expense.baseCurrency || expense.currency || DEFAULT_BASE_CURRENCY;
  };

  const getDisplayExpenseAmount = useCallback((expense: Expense): number => {
    if (!displayCurrency) return getExpenseBaseAmount(expense);
    const displaySource = getExpenseDisplaySource(expense, displayCurrency);
    if (displaySource.sourceCurrency === displayCurrency) return displaySource.amount;
    return expenseDisplayAmountsById[expense.id || ''] ?? Number.NaN;
  }, [displayCurrency, expenseDisplayAmountsById]);

  const getDisplayRepaymentAmount = (repayment: Repayment): number => {
    if (!displayCurrency) return getRepaymentBaseAmount(repayment);
    return repaymentDisplayAmountsById[repayment.id || ''] ?? Number.NaN;
  };
  const displayRepaymentTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const repayment of ownedRepayments) {
      if (!repayment.expenseId) continue;
      const amount = displayCurrency ? repaymentDisplayAmountsById[repayment.id || ''] ?? Number.NaN : getRepaymentBaseAmount(repayment);
      totals.set(repayment.expenseId, (totals.get(repayment.expenseId) ?? 0) + amount);
    }
    return totals;
  }, [ownedRepayments, repaymentDisplayAmountsById, displayCurrency]);

  // Repayment forms acknowledge only durable outbox acceptance.
  const handleAddRepayment = async (expenseId: string, repaymentData: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>): Promise<boolean> => {
    const userId = currentUser?.uid; if (!userId) return false;
    const expense = expenses.find((row) => row.id === expenseId); if (!expense) return false;
    const notificationId = showNotification('pending', t('saving'), { duration: 0 });
    let payload: Repayment | undefined;
    try {
      const settlement = await prepareRepaymentSettlement(repaymentData, expense);
      if (repaymentOwner.current !== userId) return false;
      payload = { ...repaymentData, ...settlement, id: repaymentService.createId(), userId, expenseId, createdAt: new Date(), updatedAt: new Date() };
      const optimistic = payload;
      setLocalRepayments((previous) => [...previous, optimistic]);
      dataService.updateCache<Repayment[]>('repayments', userId, (previous) => [...previous, optimistic]);
      await acceptLocalMutation({ entity: 'repayment', type: 'create', payload });
      setShowRepaymentFormForExpenseId(null);
      updateNotification(notificationId, { type: 'info', message: t('ledgerSavedLocally'), duration: 3000 });
      return true;
    } catch (error) {
      if (payload?.id) reconcileOptimisticCollection('repayments', userId, setLocalRepayments,
        { type: 'create', id: payload.id });
      updateNotification(notificationId, { type: 'error', message: t('failedToAddRepayment') + ': ' + String(error), duration: 5000 });
      return false;
    }
  };

  const handleUpdateRepayment = async (repaymentId: string, updates: Partial<Repayment>): Promise<boolean> => {
    const userId = currentUser?.uid; if (!userId) return false;
    const original = localRepayments.find((row) => row.id === repaymentId);
    const expense = expenses.find((row) => row.id === original?.expenseId);
    if (!original || !expense) return false;
    const notificationId = showNotification('pending', t('saving'), { duration: 0 });
    let optimisticPayload: Repayment | undefined;
    try {
      const input = { ...original, ...updates };
      const settlement = await prepareRepaymentSettlement(input, expense, original);
      if (repaymentOwner.current !== userId) return false;
      const payload = { ...input, ...settlement, id: repaymentId, userId, expenseId: expense.id!, updatedAt: new Date() };
      optimisticPayload = payload;
      setLocalRepayments((previous) => previous.map((row) => row.id === repaymentId ? payload : row));
      dataService.updateCache<Repayment[]>('repayments', userId, (previous) => previous.map((row) => row.id === repaymentId ? payload : row));
      await acceptLocalMutation({ entity: 'repayment', type: 'update', payload });
      setEditingRepayment(null);
      updateNotification(notificationId, { type: 'info', message: t('ledgerSavedLocally'), duration: 3000 });
      return true;
    } catch (error) {
      const fields = optimisticPayload
        ? Object.keys(optimisticPayload).filter((key) => !Object.is(optimisticPayload![key as keyof Repayment], original[key as keyof Repayment])) as (keyof Repayment)[]
        : [];
      reconcileOptimisticCollection('repayments', userId, setLocalRepayments,
        { type: 'update', id: repaymentId, original, fields });
      updateNotification(notificationId, { type: 'error', message: t('failedToUpdateRepayment') + ': ' + String(error), duration: 5000 });
      return false;
    }
  };

  const handleDeleteRepayment = async (repaymentId: string) => {
    const userId = currentUser?.uid; if (!userId) return;
    const original = localRepayments.find((row) => row.id === repaymentId); if (!original) return;
    const originalIndex = localRepayments.findIndex((row) => row.id === repaymentId);
    const notificationId = showNotification('pending', t('deleting'), { duration: 0 });
    setLocalRepayments((previous) => previous.filter((row) => row.id !== repaymentId));
    dataService.updateCache<Repayment[]>('repayments', userId, (previous) => previous.filter((row) => row.id !== repaymentId));
    try {
      await acceptLocalMutation({ entity: 'repayment', type: 'delete', payload: { id: repaymentId, userId, expenseId: original.expenseId } });
      setDeleteRepaymentConfirm({ isOpen: false, repaymentId: null });
      updateNotification(notificationId, { type: 'info', message: t('ledgerSavedLocally'), duration: 3000 });
    } catch (error) {
      reconcileOptimisticCollection('repayments', userId, setLocalRepayments,
        { type: 'delete', id: repaymentId, original, index: originalIndex });
      updateNotification(notificationId, { type: 'error', message: t('failedToDeleteRepayment') + ': ' + String(error), duration: 5000 });
    }
  };

  const filteredAndSortedExpenses = useMemo(() => {
    if (prefiltered) return expenses;
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
        sorted.sort((a, b) => getExpenseBaseAmount(b) - getExpenseBaseAmount(a));
        break;
      case 'amount-asc':
        sorted.sort((a, b) => getExpenseBaseAmount(a) - getExpenseBaseAmount(b));
        break;
    }

    return sorted;
  }, [prefiltered, expenses, searchTerm, categoryFilter, viewMode, monthFilter, allDates, dateFrom, dateTo, sortBy]);

  const formatDate = (dateString: string, time?: string) => {
    const formatted = formatDateWithUserFormat(dateString, dateFormat);
    return time ? `${formatted} ${time}` : formatted;
  };

  // Helper to format date based on current viewMode
  const formatDateByViewMode = (mode: ExpensePeriodMode, date: string): string => {
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
  const groupedExpenses = useMemo(() => {
    const sorted = filteredAndSortedExpenses;
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
      const dailyTotal = exps.reduce((sum, exp) => sum + getDisplayExpenseAmount(exp), 0);
      return { date, expenses: exps, dailyTotal };
    }).sort((a, b) => {
      if (focusExpenseId) {
        const aFocused = a.expenses.some((expense) => expense.id === focusExpenseId);
        const bFocused = b.expenses.some((expense) => expense.id === focusExpenseId);
        if (aFocused !== bFocused) return aFocused ? -1 : 1;
      }
      // Sort descending by default (newest first)
      if (sortBy.includes('asc')) {
        return a.date.localeCompare(b.date);
      }
      return b.date.localeCompare(a.date);
    });
  }, [filteredAndSortedExpenses, focusExpenseId, getDisplayExpenseAmount, sortBy]);

  // Use unique category names to avoid duplicate option keys
  const categoryNames = useMemo(() => Array.from(new Set(sortCategories(categories).map((c) => c.name))).filter((n) => n), [categories]);

  // Generate available months from expenses
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(monthKey);
    });
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
  }, [expenses]);

  // Format month for display
  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const startEdit = (expense: Expense) => {
    setEditingExpense(expense);
  };






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
      currency: DEFAULT_BASE_CURRENCY,
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
      currency: normalizeCurrencyCode(quickExpenseFormData.currency),
      categoryId: quickExpenseFormData.categoryId,
      paymentMethod: quickExpenseFormData.paymentMethod,
      icon: quickExpenseFormData.icon,
    };
    
    if (quickExpenseFormData.description) cleanedData.description = quickExpenseFormData.description;
    if (quickExpenseFormData.cardId) cleanedData.cardId = quickExpenseFormData.cardId;
    if (quickExpenseFormData.ewalletId) cleanedData.ewalletId = quickExpenseFormData.ewalletId;
    if (quickExpenseFormData.bankId) cleanedData.bankId = quickExpenseFormData.bankId;

    const isEditing = !!editingPresetId;
    const previousPresets = localQuickExpensePresets;
    const existingPreset = isEditing ? localQuickExpensePresets.find((preset) => preset.id === editingPresetId) : undefined;
    const presetId = isEditing ? editingPresetId! : quickExpenseService.createId();
    const nextOrder = isEditing
      ? existingPreset?.order ?? 0
      : localQuickExpensePresets.reduce((maxOrder, preset) => Math.max(maxOrder, preset.order), -1) + 1;
    const optimisticPreset: QuickExpensePreset = {
      ...(existingPreset || {} as QuickExpensePreset),
      ...cleanedData,
      id: presetId,
      userId: currentUser.uid,
      order: nextOrder,
      createdAt: existingPreset?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    setLocalQuickExpensePresets(isEditing
      ? previousPresets.map((preset) => preset.id === presetId ? optimisticPreset : preset)
      : [...previousPresets, optimisticPreset]);
    const notificationId = showNotification('pending', t('saving'), { duration: 0 });

    resetQuickExpenseForm();

    try {
      if (isEditing) {
        await writeLocalFirst({ type: 'update', entity: 'quickExpensePreset', payload: { ...cleanedData, id: presetId, userId: currentUser.uid } },
          () => quickExpenseService.update(presetId, cleanedData));
        updateNotification(notificationId, {
          type: 'success',
          message: t('updateSuccess'),
          duration: 3000,
        });
      } else {
        await writeLocalFirst({ type: 'create', entity: 'quickExpensePreset', payload: { ...cleanedData, id: presetId, order: nextOrder, userId: currentUser.uid } },
          () => quickExpenseService.create(currentUser.uid, { ...cleanedData, id: presetId, order: nextOrder }));
        updateNotification(notificationId, {
          type: 'success',
          message: t('createSuccess'),
          duration: 3000,
        });
      }
      onQuickExpensePresetsChange?.();
    } catch (error) {
      console.error('Failed to save preset:', error);
      if (isRetryableNetworkError(error)) {
        const queuedId = await queueFailedWrite(error, {
          type: isEditing ? 'update' : 'create',
          entity: 'quickExpensePreset',
          payload: isEditing
            ? { ...cleanedData, id: presetId, userId: currentUser.uid }
            : { ...cleanedData, id: presetId, userId: currentUser.uid, order: nextOrder },
        });
        if (queuedId) {
          updateNotification(notificationId, { type: 'info', message: t('operationSavedOffline'), duration: 5000 });
          return;
        }
      }
      setLocalQuickExpensePresets((previous) => applyPendingOperations('quickExpensePresets', currentUser.uid,
        isEditing && existingPreset
          ? previous.map((preset) => preset.id === presetId ? { ...preset, ...existingPreset } : preset)
          : previous.filter((preset) => preset.id !== presetId)));
      updateNotification(notificationId, {
        type: 'error',
        message: t('errorSavingData'),
        duration: 5000,
      });
    }
  };

  // Delete quick expense preset
  const handleDeleteQuickExpensePreset = async (presetId: string) => {
    if (!currentUser) return;
    const notificationId = showNotification('pending', t('deleting'), { duration: 0 });
    const previousPresets = localQuickExpensePresets;
    const deletedIndex = previousPresets.findIndex((preset) => preset.id === presetId);
    const deletedPreset = previousPresets[deletedIndex];
    setLocalQuickExpensePresets(previousPresets.filter((preset) => preset.id !== presetId));

    try {
      await writeLocalFirst({ type: 'delete', entity: 'quickExpensePreset', payload: { id: presetId, userId: currentUser.uid } },
        () => quickExpenseService.delete(presetId));
      updateNotification(notificationId, {
        type: 'success',
        message: t('deleteSuccess'),
        duration: 3000,
      });
      onQuickExpensePresetsChange?.();
      resetQuickExpenseForm();
    } catch (error) {
      console.error('Failed to delete preset:', error);
      if (isRetryableNetworkError(error)) {
        const queuedId = await queueFailedWrite(error, {
          type: 'delete',
          entity: 'quickExpensePreset',
          payload: { id: presetId, userId: currentUser.uid },
        });
        if (queuedId) {
          updateNotification(notificationId, { type: 'info', message: t('operationSavedOffline'), duration: 5000 });
          return;
        }
      }
      setLocalQuickExpensePresets((previous) => applyPendingOperations('quickExpensePresets', currentUser.uid,
        deletedPreset && !previous.some((preset) => preset.id === presetId)
          ? [...previous.slice(0, Math.min(deletedIndex, previous.length)), deletedPreset, ...previous.slice(Math.min(deletedIndex, previous.length))]
          : previous));
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
      currency: preset.currency || DEFAULT_BASE_CURRENCY,
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
      {!prefiltered && <div style={styles.filterSection}>
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
                className="ui-control--compact"
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
                  className="ui-control--compact"
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
                <div style={{ fontSize: 'var(--ui-font-14px)', color: 'var(--text-secondary)', padding: 'var(--ui-space-8px) var(--ui-space-12px)', background: 'var(--background-secondary)', borderRadius: 'var(--ui-radius-6px)' }}>
                  📅 {formatDateByViewMode(viewMode, selectedDate)}
                </div>
              )}
            </div>
            {/* Only show date range filters when viewMode is 'all' */}
            {viewMode === 'all' && (
              <div style={styles.filterRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-space-8px)' }}>
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
                  <label className="ui-form-label" htmlFor="allDatesToggle" style={{ fontSize: 'var(--ui-font-14px)', color: 'var(--text-primary)' }}>{t('allDates')}</label>
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
      </div>}

      {/* Quick Expense Scroll Bar: below filter section, above multi-select */}
      {onQuickExpenseAdd && (
        <div className="quick-expense-scroll-container">
          <div className="quick-expense-scroll-bar">
            {localQuickExpensePresets.map((preset) => {
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
                  <span className="quick-expense-scroll-amount">
                    <DisplayCurrencyAmount
                      amount={preset.amount}
                      currency={preset.currency}
                      targetCurrency={displayCurrency}
                      date={getTodayLocal()}
                    />
                  </span>
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
                <span style={{ fontSize: 'var(--ui-font-16px)' }}>+</span>
                <span>{t('add')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div style={styles.listActionRow}>
        <MultiSelectToolbar
          isSelectionMode={multiSelectEnabled}
          selectedCount={selectedIds.size}
          onToggleSelectionMode={toggleSelectionMode}
          onSelectAll={() => selectAll(filteredAndSortedExpenses)}
          onDeleteSelected={() => {
            const ids = Array.from(selectedIds);
            if (ids.length === 0) return;
            setBulkDeleteConfirm(true);
          }}
        />

      </div>

      {groupedExpenses.length === 0 ? (
        <div style={styles.noData}>
          <CatIllustration variant="sleep" className="cat-empty-illustration" />
          <p>{hasActiveFilters ? t('noFilteredExpenses') : t('noExpenses')}</p>
          {hasActiveFilters && onClearFilters && (
            <button type="button" className="btn btn-secondary" onClick={onClearFilters}>
              {t('clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <div style={styles.list}>
          {groupedExpenses.map(({ date, expenses: dayExpenses, dailyTotal }) => {
            const isCollapsed = collapsedGroups.has(date);
            return (
            <div key={date} style={styles.dateGroup}>
              {/* Date group header with daily subtotal - clickable to expand/collapse */}
              <div className="date-group-header" style={styles.dateGroupHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-space-8px)' }}>
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
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(date)}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-space-8px)', flex: 1, cursor: 'pointer', border: 0, background: 'transparent', padding: 'var(--ui-space-0px)', color: 'inherit', textAlign: 'left' }}
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? t('expandGroup') : t('collapseGroup')} ${formatDate(date)}`}
                  >
                    <span style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
                    <span style={styles.dateGroupDate}>{formatDate(date)}</span>
                    <span style={styles.expenseCount}>({dayExpenses.length})</span>
                  </button>
                </div>
                <span style={styles.dateGroupTotal}>{formatMoney(dailyTotal, displayCurrency || DEFAULT_BASE_CURRENCY)}</span>
              </div>
              
              {/* Expenses for this date - hidden when collapsed */}
              {!isCollapsed && dayExpenses.map((expense) => {
                const expenseDisplayCurrency = getDisplayCurrencyForExpense(expense);
                const expenseDisplayAmount = getDisplayExpenseAmount(expense);
                const repaid = repaymentTotals[expense.id!] || 0;
                const repaidDisplay = displayCurrency
                  ? displayRepaymentTotals.get(expense.id || '') ?? 0
                  : repaid;
                const netAmount = expenseDisplayAmount - repaidDisplay;
                const hasExcess = netAmount < 0;
                const isRepaid = repaid > 0;
                const originalToDisplayRate = expense.amount > 0 ? expenseDisplayAmount / expense.amount : 1;

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-8px)' }}>
                  {/* First row: time, category, status on left; amount info on right */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--ui-space-12px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-space-8px)', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                      {multiSelectEnabled && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(expense.id!)}
                          onChange={() => toggleSelection(expense.id!)}
                          aria-label={`Select expense ${expense.description}`}
                        />
                      )}
                      <span style={styles.timeDisplay}>{expense.time}</span>
                      {(expense.tagIds ?? []).map((id) => {
                        const tag = expenseTags.find((item) => item.id === id);
                        return tag ? <span key={id} style={{ ...styles.category, color: tag.color }}>#{tag.name}</span> : null;
                      })}
                      <span style={{
                        ...styles.category,
                        backgroundColor: getCategoryColor(expense.category).background,
                        color: getCategoryColor(expense.category).color
                      }}>
                        {getCategoryDisplay(expense.category)}
                      </span>
                      {hasReceivablePlan(expense) && (
                        isOpenReceivable(expense, ownedRepayments) ? (
                          <span style={styles.pendingBadge}>⏳ {t('pending')}</span>
                        ) : (
                          <span style={styles.completedBadge}>✓ {t('completed')}</span>
                        )
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--ui-space-2px)', flexShrink: 0 }}>
                      {/* Amount Display */}
                      {(() => {
                        const color = isRepaid ? (hasExcess ? 'var(--info-text)' : 'var(--warning-text)') : 'var(--error-text)';
                        return (
                          <div style={{
                            fontWeight: '700',
                            color,
                            fontSize: 'var(--ui-font-16px)',
                            textAlign: 'right',
                            lineHeight: 1,
                          }}>
                            {formatMoney(Math.abs(isRepaid ? netAmount : expenseDisplayAmount), expenseDisplayCurrency)}
                            {isRepaid && hasExcess && (
                              <span style={styles.excessBadgeSmall}>({t('excess')})</span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Amount meta (original/repaid) */}
                      {(() => {
                        if (repaid > 0) {
                              return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 'var(--ui-font-11px)', color: 'var(--text-secondary)', gap: 'var(--ui-space-1px)' }}>
                              <div>{t('original')}: <span style={{ color: 'var(--error-text)' }}>{formatMoney(expenseDisplayAmount, expenseDisplayCurrency)}</span></div>
                              <div>{t('repaid')}: <span style={{ color: 'var(--success-text)' }}>{formatMoney(repaidDisplay, expenseDisplayCurrency)}</span></div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--ui-space-12px)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4px)', flex: 1, minWidth: 0 }}>
                      {expense.notes && <p style={styles.notes}>{expense.notes}</p>}
                      
                      {/* Payment Method Display */}
                      {expense.paymentMethod && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-space-6px)', fontSize: 'var(--ui-font-12px)', color: 'var(--text-secondary)' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-space-4px)', fontSize: 'var(--ui-font-11px)', color: 'var(--accent-primary)', marginTop: 'var(--ui-space-2px)' }}>
                              <span>➡️ {t('to') || '到'}: {getToLabel()}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-8px)', alignItems: 'flex-end', flexShrink: 0 }}>
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
                        
                        {expense.needsRepaymentTracking && !expense.splitParticipants?.length && (
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
                                  setExpandedDetailsId(expense.id!);
                                  setReceiptPickerTarget({ expenseId: expense.id!, request: ++receiptPickerRequestRef.current });
                                }}
                              >
                                <span style={styles.menuIcon}>📎</span>
                                {t('receiptArchiveUpload')}
                              </button>
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
                              {expense.needsRepaymentTracking && !expense.splitParticipants?.length && (
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

                {/* Every saved expense can receive permanent receipt attachments. */}
                {(expense.id || expense.amountItems?.length || expense.notes || findRelatedTransfer(expense) || hasReceivablePlan(expense)) && (
                  <div style={styles.moreDetailsRow}>
                    <button
                      onClick={() => setExpandedDetailsId(expandedDetailsId === expense.id ? null : expense.id!)}
                      style={styles.moreDetailsBtn}
                    >
                      <span style={{ flex: 1, textAlign: 'center' }}>
                        ────── {t('receiptArchiveTitle')} · {t('showMore')} {expandedDetailsId === expense.id ? '▲' : '▼'} ──────
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
                              <span>{formatMoney(item.amount * originalToDisplayRate, expenseDisplayCurrency)}</span>
                              {item.description && <span style={styles.amountItemDesc}>: {item.description}</span>}
                            </div>
                          ))}
                          {expense.taxRate && expense.taxAmount && (
                            <div style={styles.taxDetailRow}>
                              <span>{t('tax')} ({expense.taxRate}%): {formatMoney(expense.taxAmount * originalToDisplayRate, expenseDisplayCurrency)}</span>
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
                    {hasReceivablePlan(expense) && !expense.splitParticipants?.length && (
                      <div style={styles.detailsSubsection}>
                        <div style={styles.detailsLabel}>💳 {t('repaymentStatus')}</div>
                        {(() => {
                          const progress = receivableProgress(expense, ownedRepayments);
                          const percentage = progress.percent;
                          const expectedDisplay = expenseDisplayAmount * progress.expectedRatio;
                          const settledDisplay = expectedDisplay * (percentage / 100);
                          const excessDisplay = Number.isFinite(repaidDisplay)
                            ? Math.max(0, repaidDisplay - expectedDisplay)
                            : 0;
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
                                {percentage.toFixed(0)}% {t('repaid')} ({formatMoney(settledDisplay, expenseDisplayCurrency)} / {formatMoney(expectedDisplay, expenseDisplayCurrency)})
                              </div>
                              <div style={{ ...styles.progressText, marginTop: 'var(--ui-space-4px)' }}>
                                {t('totalRepaid')}: {formatMoney(repaidDisplay, expenseDisplayCurrency)}
                                {excessDisplay > 0 && <> · {t('excess')}: {formatMoney(excessDisplay, expenseDisplayCurrency)}</>}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {!!expense.splitParticipants?.length && <ExpenseSplitSummary expense={expense} />}
                    {/* Repayment Records List (if any) with edit/delete - only for expenses with repayment tracking */}
                    {hasReceivablePlan(expense) && (() => {
                      const expenseRepayments = repaymentsByExpense.get(expense.id || '') ?? EMPTY_REPAYMENTS;
                      return (
                        <div style={styles.detailsSubsection}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--ui-space-8px)' }}>
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
                                  <div key={rep.id} style={{ ...styles.repaymentRecordItem, flexDirection: 'column', alignItems: 'stretch', gap: 'var(--ui-space-4px)' }}>
                                    {/* First row: date, amount, payment method, action buttons */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', gap: 'var(--ui-space-12px)', alignItems: 'center', flex: 1 }}>
                                        <span style={styles.repaymentRecordDate}>{formatDateWithUserFormat(rep.date, dateFormat)}</span>
                                        <span style={styles.repaymentRecordAmount}>{formatMoney(getDisplayRepaymentAmount(rep), expenseDisplayCurrency)}</span>
                                        <span style={styles.repaymentRecordMethod}>{getPaymentLabel()}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: 'var(--ui-space-4px)' }}>
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
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2px)', paddingLeft: 'var(--ui-space-4px)', fontSize: 'var(--ui-font-12px)', color: 'var(--text-tertiary)' }}>
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
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--ui-font-13px)', fontStyle: 'italic' }}>
                              {t('noRepaymentRecords')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <React.Suspense fallback={null}>
                      <ReceiptAttachmentPanel
                        expense={expense}
                        openPickerRequest={receiptPickerTarget?.expenseId === expense.id ? receiptPickerTarget.request : 0}
                        onPickerOpened={() => setReceiptPickerTarget((current) => current?.expenseId === expense.id ? null : current)}
                      />
                    </React.Suspense>
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
          <StepByStepExpenseForm
            initialData={editingExpense}
            initialTransfer={findRelatedTransfer(editingExpense)}
            categories={categories}
            recentExpenses={allExpenses}
            cards={cards}
            ewallets={ewallets}
            banks={banks}
            onSubmit={async (data) => {
              const result = await onInlineUpdate(editingExpense.id!, data, editingExpense.revision ?? 0);
              if (result === 'saved' || result === 'queued') setEditingExpense(null);
              return result;
            }}
            onCancel={() => setEditingExpense(null)}
            onCreateCard={onCreateCard}
            onCreateEWallet={onCreateEWallet}
            onCreateBank={onCreateBank}
            onAddTransfer={onAddTransfer}
            onManageTransferHistory={onManageTransferHistory}
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
            splitParticipants={expenses.find((row) => row.id === showRepaymentFormForExpenseId)?.splitParticipants}
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
            expenseCurrency={expenses.find((expense) => expense.id === showRepaymentFormForExpenseId)?.currency || DEFAULT_BASE_CURRENCY}
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
            splitParticipants={expenses.find((row) => row.id === editingRepayment.expenseId)?.splitParticipants}
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
            expenseCurrency={expenses.find((expense) => expense.id === editingRepayment.expenseId)?.currency || DEFAULT_BASE_CURRENCY}
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
              <label className="ui-form-label ui-form-label--field">{t('presetName')}</label>
              <input
                type="text"
                className="ui-control--standard ui-control--full-width"
                value={quickExpenseFormData.name}
                onChange={(e) => setQuickExpenseFormData({ ...quickExpenseFormData, name: e.target.value })}
                placeholder={t('quickExpenseNamePlaceholder')}
              />
            </div>

            <div className="quick-expense-form-field">
              <label className="ui-form-label ui-form-label--field">{t('amount')} ({quickExpenseFormData.currency || DEFAULT_BASE_CURRENCY})</label>
              <input
                type="text"
                className="ui-control--prominent ui-control--full-width"
                inputMode="numeric"
                value={(quickExpenseFormData.amount / 100).toFixed(quickExpenseCurrencyDigits)}
                onChange={(e) => {
                  const value = e.target.value;
                  const digitsOnly = value.replace(/\D/g, '');
                  const amountInMinorUnits = parseInt(digitsOnly) || 0;
                  const storageScale = 10 ** (2 - quickExpenseCurrencyDigits);
                  setQuickExpenseFormData({ ...quickExpenseFormData, amount: amountInMinorUnits * storageScale });
                }}
                onFocus={(e) => e.target.select()}
                placeholder={formatMoney(0, quickExpenseFormData.currency)}
              />
            </div>

            <div className="quick-expense-form-field">
              <CurrencySelector
                value={quickExpenseFormData.currency || DEFAULT_BASE_CURRENCY}
                onChange={(currency) => setQuickExpenseFormData((previous) => ({
                  ...previous,
                  currency,
                  amount: Math.round(roundMoney(previous.amount / 100, currency) * 100),
                }))}
                label={t('currency')}
                compact={true}
              />
            </div>

            <div className="quick-expense-form-field">
              <AutocompleteDropdown
                options={sortCategories(categories).map((cat): AutocompleteOption => ({
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
              <label className="ui-form-label ui-form-label--field">{t('paymentMethod')}</label>
              <select
                className="ui-control--standard ui-control--full-width"
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
                <label className="ui-form-label ui-form-label--field">{t('selectCard')}</label>
                <select
                  className="ui-control--standard ui-control--full-width"
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
                <label className="ui-form-label ui-form-label--field">{t('selectEWallet')}</label>
                <select
                  className="ui-control--standard ui-control--full-width"
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
                <label className="ui-form-label ui-form-label--field">{t('selectBank')}</label>
                <select
                  className="ui-control--standard ui-control--full-width"
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
                className="btn-save ui-action--compact"
                disabled={!quickExpenseFormData.name || !quickExpenseFormData.categoryId || quickExpenseFormData.amount <= 0}
              >
                {editingPresetId ? t('update') : t('save')}
              </button>
              <button 
                onClick={resetQuickExpenseForm} 
                className="btn-cancel ui-action--compact"
              >
                {t('cancel')}
              </button>
            </div>
          </div>

          {/* Existing Presets List */}
          {localQuickExpensePresets.length > 0 && (
            <>
              <div className="quick-expense-form-divider"></div>
              <div className="quick-expense-presets-list">
                <h4>{t('quickExpenses')}</h4>
                {localQuickExpensePresets.map((preset) => {
                  const category = categories.find((c) => c.id === preset.categoryId);
                  return (
                    <div key={preset.id} className="quick-expense-preset-item">
                      <div className="preset-info">
                        <span className="preset-name">{preset.name}</span>
                        <span className="preset-details">
                          <span className="preset-category">{category?.icon} {category?.name}</span>
                          <span className="preset-amount">
                            <DisplayCurrencyAmount
                              amount={preset.amount}
                              currency={preset.currency}
                              targetCurrency={displayCurrency}
                              date={getTodayLocal()}
                            />
                          </span>
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
    gap: 'var(--ui-space-20px)',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-12px)',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-8px)',
    padding: 'var(--ui-space-16px)',
  },
  filterRow: {
    display: 'flex',
    gap: 'var(--ui-space-10px)',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  listActionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--ui-space-12px)',
    flexWrap: 'wrap' as const,
  },
  filterInput: {
    flex: 1,
    minWidth: '150px',
    width: '100%',
    padding: 'var(--ui-space-10px)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-6px)',
    fontSize: 'var(--ui-font-14px)',
  },
  filterSelect: {
    flex: 1,
    minWidth: '120px',
  },
  toggleFiltersButton: {
    padding: 'var(--ui-space-10px) var(--ui-space-16px)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-14px)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--ui-space-4px)',
    transition: 'all 0.2s ease',
  },
  dateFilterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
    flex: 1,
    minWidth: '140px',
  },
  dateLabel: {
    fontSize: 'var(--ui-font-14px)',
    fontWeight: '500' as const,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  dateInput: {
    flex: 1,
    padding: 'var(--ui-space-10px)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-14px)',
    minWidth: '120px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  filters: {
    display: 'flex',
    gap: 'var(--ui-space-10px)',
    flexWrap: 'wrap' as const,
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: 'var(--ui-space-10px)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-4px)',
    fontSize: 'var(--ui-font-14px)',
  },
  noData: {
    textAlign: 'center' as const,
    padding: 'var(--ui-space-40px)',
    color: 'var(--text-secondary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-10px)',
    /* Global `body` already has bottom safe-padding to avoid the FAB.
       Remove local padding to prevent double spacing on Expenses page. */
    paddingBottom: 'var(--ui-space-0px)',
  },
  selectedCard: {
    boxShadow: '0 0 0 3px var(--accent-secondary)'
  },
  timeDisplay: { fontSize: 'var(--ui-font-12px)', color: 'var(--text-tertiary)', fontWeight: '500' as const },
  mainRow: { display: 'flex', justifyContent: 'space-between', gap: 'var(--ui-space-12px)', alignItems: 'flex-start', minWidth: 0 },
  leftCol: { flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' as const, gap: 'var(--ui-space-4px)' },
  rightCol: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 'var(--ui-space-8px)', flexShrink: 0 },
  expenseInfo: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    margin: 'var(--ui-space-0px)',
    fontSize: 'var(--ui-font-16px)',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  category: {
    display: 'inline-block',
    padding: 'var(--ui-space-5px) var(--ui-space-10px)',
    background: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-12px)',
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
    borderRadius: 'var(--ui-radius-circle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--ui-font-18px)',
    flexShrink: 0,
  },
  categoryName: {
    fontSize: 'var(--ui-font-14px)',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  date: {
    fontSize: 'var(--ui-font-12px)',
    color: 'var(--text-tertiary)',
  },
  notes: {
    margin: 'var(--ui-space-0px)',
    fontSize: 'var(--ui-font-14px)',
    color: 'var(--text-secondary)',
  },
  amount: {
    fontSize: 'var(--ui-font-18px)',
    fontWeight: '600' as const,
    color: 'var(--error-text)',
    marginBottom: 'var(--ui-space-4px)',
    wordBreak: 'break-all' as const,
    lineHeight: '1.2',
  },
  amountSection: {
    marginBottom: 'var(--ui-space-4px)',
  },
  amountBreakdown: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 'var(--ui-space-2px)',
  },
  originalAmount: {
    fontSize: 'var(--ui-font-14px)',
    color: 'var(--text-tertiary)',
    textDecoration: 'line-through',
  },
  repaidAmount: {
    fontSize: 'var(--ui-font-14px)',
    color: 'var(--success-text)',
    fontWeight: '500' as const,
  },
  netAmount: {
    fontSize: 'var(--ui-font-18px)',
    fontWeight: '700' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-6px)',
  },
  amountBadge: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    backgroundColor: 'transparent',
    padding: 'var(--ui-space-0px)',
    fontSize: 'var(--ui-font-16px)',
    fontWeight: '700' as const,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--ui-space-4px)',
    lineHeight: 1,
    pointerEvents: 'none' as const,
  },
  amountMeta: {
    position: 'absolute' as const,
    top: '34px',
    right: '12px',
    textAlign: 'right' as const,
    fontSize: 'var(--ui-font-11px)',
    color: 'var(--text-secondary)',
    lineHeight: 1.2,
    pointerEvents: 'none' as const,
  },
  excessBadge: {
    fontSize: 'var(--ui-font-11px)',
    fontWeight: '500' as const,
    color: 'var(--info-text)',
  },
  excessBadgeSmall: {
    fontSize: 'var(--ui-font-10px)',
    fontWeight: '500' as const,
    color: 'var(--info-text)',
    marginLeft: 'var(--ui-space-4px)',
  },
  repaymentAnnotation: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
    marginTop: 'var(--ui-space-6px)',
    fontSize: 'var(--ui-font-11px)',
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
    fontSize: 'var(--ui-font-10px)',
    fontWeight: '600' as const,
    color: 'var(--success-text)',
    backgroundColor: 'var(--success-bg)',
    padding: 'var(--ui-space-2px) var(--ui-space-6px)',
    borderRadius: 'var(--ui-radius-4px)',
  },
  pendingBadge: {
    fontSize: 'var(--ui-font-10px)',
    fontWeight: '600' as const,
    color: 'var(--warning-text)',
    backgroundColor: 'var(--warning-bg)',
    padding: 'var(--ui-space-2px) var(--ui-space-6px)',
    borderRadius: 'var(--ui-radius-4px)',
  },
  completedCheck: {
    marginLeft: 'var(--ui-space-6px)',
    color: 'var(--success-text)',
    fontWeight: '700' as const,
    fontSize: 'var(--ui-font-14px)',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
  },
  actions: { gap: 'var(--ui-space-8px)' },
  mobileActions: {
    marginTop: 'var(--ui-space-4px)',
  },
  menuContainer: {
    position: 'relative' as const,
  },
  menuButton: {
    padding: 'var(--ui-space-8px) var(--ui-space-12px)',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: 'var(--ui-radius-8px)',
    cursor: 'pointer',
    fontSize: 'var(--ui-font-20px)',
    fontWeight: 'bold' as const,
    lineHeight: '1',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: 'var(--ui-space-4px)',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-8px)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 9999,
    minWidth: '160px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
    width: '100%',
    padding: 'var(--ui-space-12px) var(--ui-space-16px)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 'var(--ui-font-14px)',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
    color: 'inherit',
  },
  iconButton: {
    padding: 'var(--ui-space-8px)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--ui-radius-8px)',
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
    borderRadius: 'var(--ui-radius-8px)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--card-bg)',
    cursor: 'pointer',
    fontWeight: 600,
  },
  selectAllButton: {
    borderRadius: 'var(--ui-radius-8px)',
    border: '1px solid var(--success-text)',
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    padding: 'var(--ui-space-8px) var(--ui-space-12px)',
    cursor: 'pointer',
    fontWeight: 600,
  },
  deleteSelectedButton: {
    borderRadius: 'var(--ui-radius-8px)',
    border: 'none',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: 'var(--ui-space-8px) var(--ui-space-12px)',
    cursor: 'pointer',
    fontWeight: 600,
  },
  selectRow: {
    display: 'flex',
    gap: 'var(--ui-space-10px)',
    marginTop: 'var(--ui-space-10px)',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  dateGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-10px)',
    marginBottom: 'var(--ui-space-12px)',
  },
  dateGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--ui-space-8px) var(--ui-space-12px)',
    backgroundColor: 'var(--info-bg)',
    borderRadius: 'var(--ui-radius-8px)',
    borderLeft: '4px solid var(--info-text)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    userSelect: 'none' as const,
  },
  dateGroupDate: {
    fontSize: 'var(--ui-font-14px)',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  expenseCount: {
    fontSize: 'var(--ui-font-12px)',
    fontWeight: '400' as const,
    color: 'var(--text-secondary)',
  },
  collapseIcon: {
    fontSize: 'var(--ui-font-10px)',
    color: 'var(--accent-primary)',
    display: 'inline-block',
    width: '12px',
    transition: 'transform 0.2s',
  },
  dateGroupTotal: {
    fontSize: 'var(--ui-font-14px)',
    fontWeight: '600' as const,
    color: 'var(--info-text)',
  },
  inlineRepaymentSection: {
    // Spacer wrapper only; visual card is handled inside RepaymentManager (inline mode)
    marginTop: 'var(--ui-space-12px)',
  },
  // More Details styles
  moreDetailsRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'var(--ui-space-8px)',
  },
  moreDetailsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: 'var(--ui-font-12px)',
    cursor: 'pointer',
    padding: 'var(--ui-space-4px) var(--ui-space-12px)',
    borderRadius: 'var(--ui-radius-4px)',
    transition: 'all 0.2s',
    width: '100%',
  },
  detailsSection: {
    marginTop: 'var(--ui-space-12px)',
    padding: 'var(--ui-space-12px)',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--ui-radius-8px)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-12px)',
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  detailsSubsection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-4px)',
  },
  detailsLabel: {
    fontSize: 'var(--ui-font-12px)',
    fontWeight: '600' as const,
    color: 'var(--text-secondary)',
  },
  detailsValue: {
    fontSize: 'var(--ui-font-13px)',
    color: 'var(--text-primary)',
  },
  amountItemsDetail: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-2px)',
  },
  amountItemDetail: {
    fontSize: 'var(--ui-font-13px)',
    color: 'var(--text-primary)',
  },
  amountItemDesc: {
    color: 'var(--text-secondary)',
  },
  taxDetailRow: {
    fontSize: 'var(--ui-font-12px)',
    color: 'var(--text-secondary)',
    fontStyle: 'italic' as const,
    marginTop: 'var(--ui-space-4px)',
    paddingTop: 'var(--ui-space-4px)',
    borderTop: '1px solid var(--border-color)',
  },
  repaymentProgress: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-4px)',
  },
  progressBar: {
    height: '8px',
    background: 'var(--border-color)',
    borderRadius: 'var(--ui-radius-4px)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 'var(--ui-radius-4px)',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: 'var(--ui-font-12px)',
    color: 'var(--text-secondary)',
  },
  addRepaymentBtn: {
    padding: 'var(--ui-space-6px) var(--ui-space-12px)',
    fontSize: 'var(--ui-font-12px)',
    fontWeight: '500' as const,
    borderRadius: 'var(--ui-radius-6px)',
    border: '1px solid var(--success-text)',
    background: 'transparent',
    color: 'var(--success-text)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  repaymentRecordsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-6px)',
  },
  repaymentRecordItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-12px)',
    padding: 'var(--ui-space-6px) var(--ui-space-8px)',
    background: 'var(--card-bg)',
    borderRadius: 'var(--ui-radius-4px)',
    fontSize: 'var(--ui-font-12px)',
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
    marginTop: 'var(--ui-space-8px)',
    padding: 'var(--ui-space-6px) var(--ui-space-12px)',
    fontSize: 'var(--ui-font-12px)',
    fontWeight: '500' as const,
    borderRadius: 'var(--ui-radius-6px)',
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
};

export default ExpenseList;
