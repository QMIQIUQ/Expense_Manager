import React, { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUserSettings } from '../contexts/UserSettingsContext';
import { useOptimisticCRUD } from '../hooks/useOptimisticCRUD';
import { Expense, Category, Budget, BudgetPeriod, OverallBudgetLimits, Income, Card, EWallet, FeatureSettings, FeatureTab, Repayment, Bank, Transfer, ScheduledPayment, ScheduledPaymentRecord, ScheduledPaymentSummary, DEFAULT_FEATURES, DEFAULT_CATEGORIES } from '../types';
import { QuickExpensePreset } from '../types/quickExpense';
import type { ExpensePeriodSelection } from '../types/expensePeriod';
import { expenseService } from '../services/expenseService';
import { categoryService } from '../services/categoryService';
import { sortCategories } from '../utils/categoryOrder';
import { budgetService } from '../services/budgetService';
import { syncService } from '../services/syncService';
import { incomeService } from '../services/incomeService';
import { cardService } from '../services/cardService';
import { bankService } from '../services/bankService';
import { adminService } from '../services/adminService';
import { ewalletService } from '../services/ewalletService';
import { featureSettingsService } from '../services/featureSettingsService';
import { repaymentService } from '../services/repaymentService';
import { userSettingsService } from '../services/userSettingsService';
import { transferService } from '../services/transferService';
import { quickExpenseService } from '../services/quickExpenseService';
import { scheduledPaymentService } from '../services/scheduledPaymentService';
import { resolveAmountCurrencyFields, resolveExpenseCurrencyFields } from '../services/currencyRateService';
import StepByStepExpenseForm from '../components/expenses/StepByStepExpenseForm';
import ExpensesTab from './tabs/ExpensesTab';
import CustomizableDashboard from '../components/dashboard/CustomizableDashboard';
import PopupModal from '../components/common/PopupModal';
import RadialDateMenu from '../components/common/RadialDateMenu';
import CompactNavigation from '../components/navigation/CompactNavigation';
import FloatingExpenseActions from '../components/navigation/FloatingExpenseActions';
import DashboardMenuSection from '../components/navigation/DashboardMenuSection';
import { getNavigationFeatures } from '../components/navigation/navigationConfig';

// Lazy load heavy components
const CategoryManager = lazy(() => import('../components/categories/CategoryManager'));
const BudgetManager = lazy(() => import('../components/budgets/BudgetManager'));
const ScheduledPaymentManager = lazy(() => import('../components/scheduledPayments/ScheduledPaymentManager'));
const IncomesTab = lazy(() => import('./tabs/IncomesTab'));
const AdminTab = lazy(() => import('./tabs/AdminTab'));
const UserProfile = lazy(() => import('./UserProfile'));
const FeatureManager = lazy(() => import('../components/settings/FeatureManager'));
const PaymentMethodsTab = lazy(() => import('../components/payment/PaymentMethodsTab'));
import { downloadExpenseTemplate, exportToExcel } from '../utils/importExportUtils';
import ImportExportModal from '../components/importexport/ImportExportModal';
import HeaderStatusBar from '../components/HeaderStatusBar';
import NotificationBell from '../components/NotificationBell';
import DisplayCurrencyControl from '../components/common/DisplayCurrencyControl';
import ThemeToggle from '../components/ThemeToggle';
import CatIllustration from '../components/CatIllustration';
import { offlineQueue, type QueuedOperation } from '../utils/offlineQueue';
import { dataService } from '../services/dataService';
import { networkStatus } from '../utils/networkStatus';
import NetworkStatusIndicator from '../components/NetworkStatusIndicator';
import { sessionCache, type CacheableEntity } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
import { getQueuedWriteId, writeLocalFirstBatch } from '../utils/localFirstMutation';
import { getTodayLocal, getCurrentTimeLocal } from '../utils/dateUtils';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getRepaymentBaseAmount } from '../utils/currencyUtils';
import { type BudgetAllocationInput, validateBudgetAllocationChange } from '../utils/budgetAllocation';
import { withBudgetMutationLock } from '../utils/budgetMutationLock';
import { clearExpenseCreateFailure, hasExpenseBeenDeleted, hasExpenseCreateFailed, markExpenseCreateFailed, markExpenseDeleted, withExpenseMutationLock } from '../utils/expenseMutationLock';

//#region Helper Functions
type BudgetQueuePayload = Partial<Budget> & { userId?: string; previousBudget?: Budget };
type BudgetOfflineRejection = {
  operationType?: QueuedOperation['type'];
  budgetId?: string;
  previousBudget?: Budget;
};

const applyPendingBudgetOperations = (
  initialBudgets: Budget[],
  operations: QueuedOperation[],
  userId: string,
): Budget[] => {
  let result = [...initialBudgets];
  for (const operation of operations) {
    if (operation.entity !== 'budget') continue;
    const payload = operation.payload as BudgetQueuePayload;
    if (payload.userId !== userId) continue;
    const id = typeof payload.id === 'string' ? payload.id : undefined;

    if (operation.type === 'create' && id) {
      const pendingBudget = {
        ...payload,
        id,
        userId,
        createdAt: payload.createdAt || new Date(operation.timestamp),
        updatedAt: payload.updatedAt || new Date(operation.timestamp),
      } as Budget;
      const existingIndex = result.findIndex((budget) => budget.id === id);
      if (existingIndex >= 0) result[existingIndex] = { ...result[existingIndex], ...pendingBudget };
      else result.push(pendingBudget);
      continue;
    }

    if (!id) continue;
    if (operation.type === 'update') {
      const updates = { ...payload };
      delete updates.previousBudget;
      result = result.map((budget) => budget.id === id ? { ...budget, ...updates, id } as Budget : budget);
    } else if (operation.type === 'delete') {
      result = result.filter((budget) => budget.id !== id);
    }
  }
  return result;
};

type ExpenseQueuePayload = Partial<Expense> & { userId?: string };

const applyPendingExpenseOperations = (
  initialExpenses: Expense[],
  operations: QueuedOperation[],
  userId: string,
): Expense[] => {
  let result = [...initialExpenses];

  for (const operation of operations) {
    if (operation.entity !== 'expense') continue;
    const payload = operation.payload as ExpenseQueuePayload;
    const id = typeof payload.id === 'string' ? payload.id : undefined;
    if (!id || payload.userId !== userId) continue;

    if (operation.type === 'create') {
      // The server copy may already include later edits from another device. Do not replace it.
      if (!result.some((expense) => expense.id === id)) {
        result.push({
          ...payload,
          id,
          userId,
          createdAt: payload.createdAt || new Date(operation.timestamp),
          updatedAt: payload.updatedAt || new Date(operation.timestamp),
        } as Expense);
      }
    } else if (operation.type === 'update') {
      const updates = { ...payload };
      delete updates.id;
      delete updates.userId;
      result = result.map((expense) => expense.id === id ? { ...expense, ...updates, id } as Expense : expense);
    } else if (operation.type === 'delete') {
      result = result.filter((expense) => expense.id !== id);
    }
  }

  return result.sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
};

const applyPendingCategoryOperations = (
  initialCategories: Category[],
  operations: QueuedOperation[],
  userId: string,
): Category[] => {
  let result = [...initialCategories];
  for (const operation of operations) {
    if (operation.entity !== 'category') continue;
    const payload = operation.payload as Partial<Category>;
    if (payload.userId !== userId || typeof payload.id !== 'string') continue;
    const id = payload.id;
    if (operation.type === 'create') {
      const category = { ...payload, id, userId, createdAt: payload.createdAt || new Date(operation.timestamp) } as Category;
      const index = result.findIndex((item) => item.id === id);
      if (index >= 0) result[index] = { ...result[index], ...category };
      else result.push(category);
    } else if (operation.type === 'update') {
      const updates = { ...payload };
      delete updates.id;
      delete updates.userId;
      result = result.map((category) => category.id === id ? { ...category, ...updates, id } : category);
    } else {
      result = result.filter((category) => category.id !== id);
    }
  }
  return sortCategories(result);
};

const rollbackRejectedBudgetOperation = (budgets: Budget[], rejection: BudgetOfflineRejection): Budget[] => {
  if (rejection.operationType === 'create' && rejection.budgetId) {
    return budgets.filter((budget) => budget.id !== rejection.budgetId);
  }
  if (rejection.operationType === 'update' && rejection.previousBudget) {
    const previousBudget = rejection.previousBudget;
    return budgets.map((budget) => budget.id === previousBudget.id ? previousBudget : budget);
  }
  if (rejection.operationType === 'delete' && rejection.previousBudget) {
    const previousBudget = rejection.previousBudget;
    return budgets.some((budget) => budget.id === previousBudget.id)
      ? budgets
      : [...budgets, previousBudget];
  }
  return budgets;
};
//#endregion

const Dashboard: React.FC = () => {
  //#region State and Hooks
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { t, language, setLanguage } = useLanguage();
  const { fontFamily, setFontFamily, fontScale, setFontScale } = useTheme();
  const { dateFormat, timeFormat, dateShortcuts, displayCurrency, displayCurrencyReady, settings, setDisplayCurrency: saveDisplayCurrency, setOverallBudgetLimit: saveOverallBudgetLimit, refreshSettings } = useUserSettings();
  const optimisticCRUD = useOptimisticCRUD();

  const [activeTab, setActiveTab] = useState<FeatureTab>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingCategoryCreationRequest, setPendingCategoryCreationRequest] = useState<{
    id: number;
    initialData: { name: string; icon: string; color: string };
  } | null>(null);
  const categoryCreationRequestIdRef = useRef(0);
  const orderedCategories = React.useMemo(() => sortCategories(categories), [categories]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [scheduledPaymentRecords, setScheduledPaymentRecords] = useState<ScheduledPaymentRecord[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [ewallets, setEWallets] = useState<EWallet[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings | null>(null);
  const [billingCycleDay, setBillingCycleDay] = useState<number>(1);
  const [quickExpensePresets, setQuickExpensePresets] = useState<QuickExpensePreset[]>([]);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [startReceiptEntry, setStartReceiptEntry] = useState(false);
  const [receiptEntryKey, setReceiptEntryKey] = useState(0);
  const [isDashboardCustomizing, setIsDashboardCustomizing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  // Controlled period state is shared with dashboard deep-links and the Expenses tab.
  const [expensePeriod, setExpensePeriod] = useState<ExpensePeriodSelection>({
    mode: 'day',
    anchorDate: getTodayLocal(),
  });
  const [expenseCategory, setExpenseCategory] = useState('');
  // Collapsible sections inside hamburger
  const [openLanguageSection, setOpenLanguageSection] = useState(false);
  const [openAppearanceSection, setOpenAppearanceSection] = useState(false);
  const [openFeaturesSection, setOpenFeaturesSection] = useState(false);
  const [openImportExportSection, setOpenImportExportSection] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showImportExportDropdown, setShowImportExportDropdown] = useState(false);
  const [focusExpenseId, setFocusExpenseId] = useState<string | null>(null);
  const [focusScheduledPaymentId, setFocusScheduledPaymentId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{
    id: string;
    current: number;
    total: number;
    message: string;
    status: 'importing' | 'complete' | 'error';
  } | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<{
    id: string;
    current: number;
    total: number;
    message: string;
    status: 'deleting' | 'complete' | 'error';
  } | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isUploadingQueue, setIsUploadingQueue] = useState<boolean>(false);
  const notifiedOfflineExpenseAttentionRef = React.useRef(new Set<string>());
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const languageRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLDivElement | null>(null);
  const importExportRef = useRef<HTMLDivElement | null>(null);
  // Reactive mobile breakpoint (updates on window resize)
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 768);
  // Radial date menu state for long-press on FAB
  const [showRadialDateMenu, setShowRadialDateMenu] = useState(false);
  const [radialMenuPosition, setRadialMenuPosition] = useState({ x: 0, y: 0 });
  const isEnglish = language === 'en';
  const isSimplifiedChinese = language === 'zh-CN';
  const handleDisplayCurrencyChange = (currency: import('../types').CurrencyCode) => {
    void saveDisplayCurrency(currency).catch(() => showNotification('error', t('errorSavingSettings')));
  };
  const receiptActionLabel = isEnglish ? 'Scan receipt' : isSimplifiedChinese ? '扫描收据' : '掃描收據';
  const addExpenseLabel = t('addNewExpense');
  const { orderedFeatures: navigationFeatures } = getNavigationFeatures(featureSettings);

  useEffect(() => {
    const handleBudgetLimitAutoIncrease = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; amount: number }>).detail;
      if (!detail || detail.userId !== currentUser?.uid) return;
      showNotification(
        'info',
        `${t('overallBudgetAutoIncreased')} ${formatMoney(detail.amount, DEFAULT_BASE_CURRENCY)}`,
      );
      void refreshSettings().catch(() => undefined);
    };
    window.addEventListener('budget-limit-auto-increased', handleBudgetLimitAutoIncrease);
    return () => {
      window.removeEventListener('budget-limit-auto-increased', handleBudgetLimitAutoIncrease);
    };
  }, [currentUser?.uid, refreshSettings, showNotification, t]);

  const navigationLabels: Record<FeatureTab, string> = {
    dashboard: t('dashboard'),
    expenses: t('expenses'),
    incomes: t('incomes'),
    categories: t('categories'),
    budgets: t('budgets'),
    recurring: t('recurring'),
    paymentMethods: t('paymentMethods'),
    settings: t('featureSettings'),
    profile: t('profile'),
    admin: t('admin'),
  };

  const lastUsedCurrency = useMemo(() => {
    const latestExpense = expenses[0];
    return latestExpense?.currency || latestExpense?.baseCurrency || DEFAULT_BASE_CURRENCY;
  }, [expenses]);

  //#endregion

  const openExpenseEntry = (options?: { withReceipt?: boolean }) => {
    setStartReceiptEntry(!!options?.withReceipt);
    setReceiptEntryKey((prev) => prev + 1);
    if (activeTab === 'expenses') {
      setShowAddSheet(true);
    } else {
      setShowAddExpenseForm(true);
    }
  };

  const closeExpenseEntry = () => {
    setStartReceiptEntry(false);
    setShowAddExpenseForm(false);
    setShowAddSheet(false);
  };

  const currentUserId = currentUser?.uid;
  const notifyOfflineExpenseNeedsAttention = React.useCallback((operationId: string) => {
    if (!currentUserId) return;
    const operation = offlineQueue.getAll().find((item) => item.id === operationId);
    if (!operation || operation.entity !== 'expense' || operation.status !== 'needs-attention') return;
    const payload = operation.payload as { userId?: unknown };
    if (payload.userId !== currentUserId) return;

    const notificationKey = `${currentUserId}:${operationId}`;
    if (notifiedOfflineExpenseAttentionRef.current.has(notificationKey)) return;
    notifiedOfflineExpenseAttentionRef.current.add(notificationKey);
    showNotification('error', t('offlineExpenseNeedsAttention'), {
      duration: 0,
      actions: [{
        label: t('retry'),
        onClick: () => {
          const operationPayload = operation.payload as { id?: unknown; userId?: unknown };
          const expenseId = typeof operationPayload.id === 'string' ? operationPayload.id : undefined;
          if (!expenseId || !offlineQueue.retryExpenseOperationsForId(expenseId, currentUserId)) {
            showNotification('error', t('offlineQueueSaveFailed'));
            return;
          }
          notifiedOfflineExpenseAttentionRef.current.delete(notificationKey);
          void syncService.syncOfflineQueue();
        },
      }],
    });
  }, [currentUserId, showNotification, t]);

  //#region Effects
  useEffect(() => {
    if (activeTab !== 'expenses') setExpenseCategory('');
  }, [activeTab]);

  // Track offline queue count
  useEffect(() => {
    if (!currentUserId) return;
    offlineQueue.getAll().forEach((operation) => {
      if (operation.entity === 'expense' && operation.status === 'needs-attention') {
        notifyOfflineExpenseNeedsAttention(operation.id);
      }
    });
  }, [currentUserId, notifyOfflineExpenseNeedsAttention]);

  useEffect(() => {
    const updateQueueCount = () => {
      setQueueCount(offlineQueue.count());
    };

    updateQueueCount();

    // Update queue count every 5 seconds (reduced from 1 second for better performance)
    const interval = setInterval(updateQueueCount, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile((prev) => (prev !== mobile ? mobile : prev));
    };
    // Use passive listener for performance
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  //#endregion

  //#region Data Loading
  const loadData = React.useCallback(async () => {
    if (!currentUser) return;

    try {
      const loadRevision = offlineQueue.revision + dataService.localRevision;
      const currentData = <T,>(entity: CacheableEntity, data: T): T => applyPendingOperations(entity, currentUser.uid,
        loadRevision === offlineQueue.revision + dataService.localRevision ? data : sessionCache.get<T>(entity, currentUser.uid) ?? data);
      const cachedCards = sessionCache.get<Card[]>('cards', currentUser.uid);
      const cachedBanks = sessionCache.get<Bank[]>('banks', currentUser.uid);
      const cachedWallets = sessionCache.get<EWallet[]>('ewallets', currentUser.uid);
      const cachedFeatures = sessionCache.get<FeatureSettings>('featureSettings', currentUser.uid);
      const cachedPresets = sessionCache.get<QuickExpensePreset[]>('quickExpensePresets', currentUser.uid);
      if (cachedCards) setCards(currentData('cards', cachedCards));
      if (cachedBanks) setBanks(currentData('banks', cachedBanks));
      if (cachedWallets) setEWallets(currentData('ewallets', cachedWallets));
      if (cachedFeatures) setFeatureSettings(currentData('featureSettings', cachedFeatures));
      if (cachedPresets) setQuickExpensePresets(currentData('quickExpensePresets', cachedPresets));
      const setExpensesWithPendingOperations = (loadedExpenses: Expense[]) => {
        const reconciled = applyPendingExpenseOperations(loadedExpenses, offlineQueue.getAll(), currentUser.uid);
        sessionCache.set('expenses', currentUser.uid, reconciled);
        setExpenses(reconciled);
      };
      const setBudgetsWithPendingOperations = (loadedBudgets: Budget[]) => {
        const reconciled = applyPendingBudgetOperations(loadedBudgets, offlineQueue.getAll(), currentUser.uid);
        sessionCache.set('budgets', currentUser.uid, reconciled);
        setBudgets(reconciled);
      };
      const setCategoriesWithPendingOperations = (loadedCategories: Category[]) => {
        const reconciled = applyPendingCategoryOperations(loadedCategories, offlineQueue.getAll(), currentUser.uid);
        sessionCache.set('categories', currentUser.uid, reconciled);
        setCategories(reconciled);
      };

      // Phase 1: Load cached data first (instant display)
      const [expensesData, incomesData, categoriesData, budgetsData, repaymentsData, transfersData, scheduledPaymentsData, scheduledPaymentRecordsData] = await Promise.all([
        dataService.getDataWithRevalidate<Expense[]>('expenses', currentUser.uid, () => expenseService.getAll(currentUser.uid), setExpensesWithPendingOperations),
        dataService.getDataWithRevalidate<Income[]>('incomes', currentUser.uid, () => incomeService.getAll(currentUser.uid), setIncomes),
        dataService.getDataWithRevalidate<Category[]>('categories', currentUser.uid, () => categoryService.getAll(currentUser.uid), setCategoriesWithPendingOperations),
        dataService.getDataWithRevalidate<Budget[]>('budgets', currentUser.uid, () => budgetService.getAll(currentUser.uid), setBudgetsWithPendingOperations),
        dataService.getDataWithRevalidate<Repayment[]>('repayments', currentUser.uid, () => repaymentService.getAll(currentUser.uid), setRepayments),
        dataService.getDataWithRevalidate<Transfer[]>('transfers', currentUser.uid, () => transferService.getAll(currentUser.uid), setTransfers),
        dataService.getDataWithRevalidate<ScheduledPayment[]>('scheduledPayments', currentUser.uid, () => scheduledPaymentService.getAll(currentUser.uid), setScheduledPayments),
        dataService.getDataWithRevalidate<ScheduledPaymentRecord[]>('scheduledPaymentRecords', currentUser.uid, () => scheduledPaymentService.getAllPaymentRecords(currentUser.uid), setScheduledPaymentRecords),
      ]);

      // Set initial data (from cache or fresh)
      setExpensesWithPendingOperations(currentData('expenses', expensesData));
      setIncomes(currentData('incomes', incomesData));
      setCategoriesWithPendingOperations(currentData('categories', categoriesData));
      setBudgetsWithPendingOperations(currentData('budgets', budgetsData));
      setRepayments(currentData('repayments', repaymentsData));
      setTransfers(currentData('transfers', transfersData));
      setScheduledPayments(currentData('scheduledPayments', scheduledPaymentsData));
      setScheduledPaymentRecords(currentData('scheduledPaymentRecords', scheduledPaymentRecordsData));

      // Initial UI now rendered; no blocking loader needed

      // Phase 2: Initialize and load additional data in background (only if online)
      if (networkStatus.isOnline) {
        setIsRevalidating(true);

        const userSettingsPromise = userSettingsService.getOrCreate(currentUser.uid).catch(err => {
          console.warn('User settings load failed:', err);
          return { billingCycleDay: 1, defaultCategoryMigrationVersion: 0 };
        });
        const categoryInitializationPromise = userSettingsPromise.then(async (userSettings) => {
          const shouldMigrateSavingsCategory = (userSettings.defaultCategoryMigrationVersion ?? 0) < 1;
          const initializedCategories = await categoryService.initializeDefaults(
            currentUser.uid,
            shouldMigrateSavingsCategory,
          );

          if (shouldMigrateSavingsCategory) {
            await userSettingsService.update(currentUser.uid, { defaultCategoryMigrationVersion: 1 })
              .catch(err => console.warn('Default category migration marker update failed:', err));
          }

          return initializedCategories;
        }).catch(err => {
          console.warn('Background category init failed:', err);
          return null;
        });

        // Batch all background tasks to complete together
        Promise.all([
          categoryInitializationPromise,

          // Check admin status
          adminService.isAdmin(currentUser.uid).catch(err => {
            console.warn('Admin check failed:', err);
            return false;
          }),

          // Load user settings before initializing migrated default categories
          userSettingsPromise,

          // Load cards
          dataService.getDataWithRevalidate('cards', currentUser.uid, () => cardService.getAll(currentUser.uid), (cardsData) => {
            setCards(cardsData);
            const bankNames = [...new Set(cardsData.map(card => card.bankName).filter(Boolean) as string[])];
            if (bankNames.length > 0) {
              localStorage.setItem('cardBankNames', JSON.stringify(bankNames));
            }
          }).catch(err => {
            console.warn('Could not load cards:', err);
            return [];
          }),

          // Initialize and load e-wallets
          ewalletService.initializeDefaults(currentUser.uid)
            .catch(() => null)
            .then(() => dataService.getDataWithRevalidate('ewallets', currentUser.uid, () => ewalletService.getAll(currentUser.uid), setEWallets))
            .catch(err => {
              console.warn('Could not load e-wallets:', err);
              return [];
            }),

          // Load banks
          dataService.getDataWithRevalidate('banks', currentUser.uid, () => bankService.getAll(currentUser.uid), (banksData) => {
            setBanks(banksData);
            const bankNames = [...new Set(banksData.map(b => b.name).filter(Boolean))];
            if (bankNames.length > 0) {
              localStorage.setItem('cardBankNames', JSON.stringify(bankNames));
            }
          }).catch(err => {
            console.warn('Could not load banks:', err);
            return [];
          }),

          // Load feature settings
          featureSettingsService.getOrCreate(currentUser.uid).catch(err => {
            console.warn('Could not load feature settings:', err);
            return null;
          }),

          // Load quick expense presets
          quickExpenseService.getPresets(currentUser.uid, (data) => setQuickExpensePresets(currentData('quickExpensePresets', data))).catch(err => {
            console.warn('Could not load quick expense presets:', err);
            return [];
          }),
        ]).then(([categoriesData, adminStatus, userSettings, cardsData, ewalletsData, banksData, featSettings, quickPresets]) => {
          // Apply all state updates together (single render cycle)
          if (Array.isArray(categoriesData)) setCategoriesWithPendingOperations(currentData('categories', categoriesData));
          if (typeof adminStatus === 'boolean') setIsAdmin(adminStatus);
          if (userSettings) setBillingCycleDay(userSettings.billingCycleDay);
          if (Array.isArray(cardsData)) {
            setCards(currentData('cards', cardsData));
            const bankNames = [...new Set(cardsData.map(card => card.bankName).filter(Boolean) as string[])];
            if (bankNames.length > 0) {
              localStorage.setItem('cardBankNames', JSON.stringify(bankNames));
            }
          }
          if (Array.isArray(ewalletsData)) setEWallets(currentData('ewallets', ewalletsData));
          if (Array.isArray(banksData)) {
            setBanks(currentData('banks', banksData));
            const bankNames = [...new Set(banksData.map(b => b.name).filter(Boolean))];
            if (bankNames.length > 0) {
              localStorage.setItem('cardBankNames', JSON.stringify(bankNames));
            }
          }
          if (featSettings) setFeatureSettings(currentData('featureSettings', featSettings));
          if (Array.isArray(quickPresets)) setQuickExpensePresets(currentData('quickExpensePresets', quickPresets));
        }).finally(() => {
          setIsRevalidating(false);
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('error', t('errorLoadingData'));
    }
  }, [currentUser, showNotification, t]);

  useEffect(() => {
    if (currentUserId) void syncService.syncOfflineQueue();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    const refreshLocal = () => queueMicrotask(() => {
      if (!active) return;
      const apply = <T,>(entity: CacheableEntity, setter: (data: T) => void) => {
        const cached = sessionCache.get<T>(entity, currentUserId);
        if (cached) setter(applyPendingOperations(entity, currentUserId, cached));
      };
      apply('expenses', setExpenses);
      apply('incomes', setIncomes);
      apply('categories', setCategories);
      apply('budgets', setBudgets);
      apply('repayments', setRepayments);
      apply('transfers', setTransfers);
      apply('scheduledPayments', setScheduledPayments);
      apply('scheduledPaymentRecords', setScheduledPaymentRecords);
      apply('cards', setCards);
      apply('banks', setBanks);
      apply('ewallets', setEWallets);
      apply('featureSettings', setFeatureSettings);
      apply('quickExpensePresets', setQuickExpensePresets);
      const cachedSettings = sessionCache.get<import('../types').UserSettings>('userSettings', currentUserId);
      if (cachedSettings) setBillingCycleDay(applyPendingOperations('userSettings', currentUserId, cachedSettings).billingCycleDay);
      setQueueCount(offlineQueue.count());
    });
    window.addEventListener('offline-queue-changed', refreshLocal);
    return () => { active = false; window.removeEventListener('offline-queue-changed', refreshLocal); };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const handleOfflineOperationNeedsAttention = (event: Event) => {
      const detail = (event as CustomEvent<{ operationId?: string; userId?: string }>).detail;
      if (detail?.userId !== currentUserId || !detail.operationId) return;
      const operation = offlineQueue.getAll().find((item) => item.id === detail.operationId);
      if (!operation || operation.entity === 'expense' || operation.entity === 'budget') return;

      void loadData();
      showNotification('error', t('offlineOperationNeedsAttention'), {
        id: `offline-needs-attention-${operation.id}`,
        duration: 0,
        actions: [{
          label: t('retry'),
          onClick: () => {
            if (!offlineQueue.retry(operation.id)) {
              showNotification('error', t('offlineQueueSaveFailed'));
              return;
            }
            void syncService.syncOfflineQueue();
          },
        }],
      });
    };
    window.addEventListener('offline-operation-needs-attention', handleOfflineOperationNeedsAttention);
    offlineQueue.getAll().filter((operation) => operation.status === 'needs-attention').forEach((operation) => {
      const owner = (operation.payload as { userId?: string } | null)?.userId;
      handleOfflineOperationNeedsAttention(new CustomEvent('offline-operation-needs-attention', {
        detail: { operationId: operation.id, userId: owner },
      }));
    });
    return () => window.removeEventListener('offline-operation-needs-attention', handleOfflineOperationNeedsAttention);
  }, [currentUserId, loadData, showNotification, t]);

  useEffect(() => {
    if (!currentUserId) return;
    const handleOfflineOperationSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId === currentUserId) void loadData();
    };
    window.addEventListener('offline-operation-synced', handleOfflineOperationSynced);
    return () => window.removeEventListener('offline-operation-synced', handleOfflineOperationSynced);
  }, [currentUserId, loadData]);
  //#endregion

  //#region Budget Notifications
  // Track if budget check has been done this session to prevent duplicates
  const budgetCheckDoneRef = React.useRef(false);

  // Budget notifications check
  useEffect(() => {
    // Skip if already checked this session or no data
    if (budgetCheckDoneRef.current || !budgets.length || !expenses.length) return;

    // Check budgets once when data is loaded
    const checkBudgets = async () => {
      const { checkBudgetAlerts } = await import('../utils/budgetNotifications');
      const lastChecked = localStorage.getItem('lastBudgetCheck');
      const lastCheckedDate = lastChecked ? new Date(lastChecked) : null;

      const alerts = checkBudgetAlerts(budgets, expenses, lastCheckedDate, billingCycleDay, repayments);

      if (alerts.length > 0) {
        // Show notifications for each alert with unique ID to prevent duplicates
        alerts.forEach(alert => {
          showNotification(alert.type, alert.message, { 
            duration: 0,
            id: `budget-alert-${alert.budget.id}` // Unique ID prevents duplicate notifications
          });
        });

        // Update last check time
        localStorage.setItem('lastBudgetCheck', new Date().toISOString());
      }

      // Mark as done for this session
      budgetCheckDoneRef.current = true;
    };

    // Check after a short delay to avoid overwhelming the user at startup
    const timer = setTimeout(checkBudgets, 2000);
    return () => clearTimeout(timer);
  }, [budgets, expenses, showNotification, billingCycleDay, repayments]);
  //#endregion

  //#region Data Refresh Functions
  // Function to reload only repayments (for performance)
  const reloadRepayments = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const repaymentsData = await dataService.getRepayments(currentUser.uid, true);
      setRepayments(repaymentsData);
    } catch (error) {
      console.error('Failed to reload repayments:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      // 如果已有缓存，先关闭初始加载占位，随后再异步刷新
      const uid = currentUser.uid;
      const hasCached = !!(
        sessionCache.get('expenses', uid) ||
        sessionCache.get('incomes', uid) ||
        sessionCache.get('repayments', uid) ||
        sessionCache.get('categories', uid) ||
        sessionCache.get('budgets', uid) ||
        sessionCache.get('recurring', uid)
      );
      if (hasCached) {
        // Cached data present: UI already renders instantly; no loader toggle needed
      }
      loadData();
    }
  }, [currentUser, loadData]);

  useEffect(() => {
    const unsubscribe = syncService.onSyncProgress((progress) => {
      if (progress.currentOperation === 'Sync complete' && progress.completed > 0 && !progress.budgetRejections) {
        void loadData();
      }
    });
    const handleOfflineExpenseNeedsAttention = (event: Event) => {
      const detail = (event as CustomEvent<{ operationId: string; userId?: string }>).detail;
      if (!detail?.operationId || (detail.userId && detail.userId !== currentUserId)) return;
      notifyOfflineExpenseNeedsAttention(detail.operationId);
      void loadData();
    };
    const handleOfflineBudgetOperationRejected = (event: Event) => {
      const detail = (event as CustomEvent<BudgetOfflineRejection & { userId?: string }>).detail;
      if (detail?.userId && detail.userId !== currentUser?.uid) return;
      showNotification('error', t('offlineBudgetMutationRejected'));
      const userId = detail?.userId || currentUser?.uid;
      if (!userId) return;

      void budgetService.getAll(userId, true).then((serverBudgets) => {
        if (currentUser?.uid !== userId) return;
        const reconciled = applyPendingBudgetOperations(serverBudgets, offlineQueue.getAll(), userId);
        setBudgets(reconciled);
        sessionCache.set('budgets', userId, reconciled);
      }).catch(() => {
        if (currentUser?.uid !== userId) return;
        setBudgets((currentBudgets) => {
          const reconciled = applyPendingBudgetOperations(
            rollbackRejectedBudgetOperation(currentBudgets, detail),
            offlineQueue.getAll(),
            userId,
          );
          sessionCache.set('budgets', userId, reconciled);
          return reconciled;
        });
        showNotification('error', t('errorLoadingData'));
      });
    };
    window.addEventListener('expense-offline-operation-needs-attention', handleOfflineExpenseNeedsAttention);
    window.addEventListener('budget-offline-operation-rejected', handleOfflineBudgetOperationRejected);
    return () => {
      unsubscribe();
      window.removeEventListener('expense-offline-operation-needs-attention', handleOfflineExpenseNeedsAttention);
      window.removeEventListener('budget-offline-operation-rejected', handleOfflineBudgetOperationRejected);
    };
  }, [currentUser?.uid, currentUserId, loadData, notifyOfflineExpenseNeedsAttention, showNotification, t]);

  // Tab switching now instant - no refetch, uses cached data + optimistic updates
  // Background revalidation happens only on initial load via loadData()
  //#endregion

  //#region Click Outside Handlers
  // Click outside to close actions menu
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showActionsMenu) return;
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showActionsMenu]);

  // Click outside to close language menu
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showLanguageMenu) return;
      if (languageRef.current && !languageRef.current.contains(e.target as Node)) {
        setShowLanguageMenu(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showLanguageMenu]);

  // Click outside to close hamburger menu
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showHamburgerMenu) return;
      if (hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)) {
        setShowHamburgerMenu(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showHamburgerMenu]);

  // Click outside to close import/export dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showImportExportDropdown) return;
      if (importExportRef.current && !importExportRef.current.contains(e.target as Node)) {
        setShowImportExportDropdown(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showImportExportDropdown]);

  // Close hamburger menu once the user scrolls the page so it does not cover content
  useEffect(() => {
    if (!showHamburgerMenu) return;

    const handleScroll = () => setShowHamburgerMenu(false);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [showHamburgerMenu]);

  // Reset all hamburger submenu states when hamburger menu closes
  useEffect(() => {
    if (!showHamburgerMenu) {
      setOpenLanguageSection(false);
      setOpenAppearanceSection(false);
      setOpenFeaturesSection(false);
      setOpenImportExportSection(false);
    }
  }, [showHamburgerMenu]);
  //#endregion

  //#region UI State Flags
  // Centralized flag to hide Floating Action Button when any popout/modal/menu is open
  const shouldHideFab =
    showHamburgerMenu ||
    showLanguageMenu ||
    showImportExportDropdown ||
    showImportModal ||
    showAddSheet ||
    showAddExpenseForm ||
    isDashboardCustomizing ||
    showRadialDateMenu;
  //#endregion

  //#region Event Handlers - Auth
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  //#endregion

  //#region Event Handlers - Expenses
  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<{ status: 'saved' | 'queued' | 'failed'; expenseId?: string }> => {
    if (!currentUser) return { status: 'failed' };

    const expenseId = expenseService.createId();
    const expensePayload: Omit<Expense, 'createdAt' | 'updatedAt'> = {
      ...expenseData,
      id: expenseId,
      userId: currentUser.uid,
    };

    // Keep the stable document ID in the optimistic list and offline queue.
    const optimisticExpense: Expense = {
      ...expensePayload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setExpenses((prev) => [optimisticExpense, ...prev]);

    // Update cache optimistically
    dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => [optimisticExpense, ...data]);

    const outcome: 'saved' | 'queued' | 'failed' = await withExpenseMutationLock(currentUser.uid, expenseId, async () => {
      let queuedForRetry = false;
      const result = await optimisticCRUD.run(
        { type: 'create', data: expensePayload },
        () => expenseService.create(expensePayload, { updateAccountBalances: true }),
        {
          entityType: 'expense',
          retryToQueueOnFail: true,
          onQueued: () => { queuedForRetry = true; },
          onSuccess: (result) => {
            // Preserve the stable ID used by the queue and server document.
            const newId = result as string;
            const realExpense: Expense = {
              ...optimisticExpense,
              id: newId,
            };
            setExpenses((prev) => prev.map((e) => (e.id === expenseId ? realExpense : e)));
            // Update cache with real ID
            dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) =>
              data.map((e) => (e.id === expenseId ? realExpense : e))
            );
            // Reload e-wallets and banks to reflect updated balances
            loadData();
          },
          onError: () => {
            // Rollback optimistic update
            setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
            // Rollback cache
            dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => data.filter((e) => e.id !== expenseId));
          },
        }
      );
      const outcome = result !== null ? 'saved' : queuedForRetry ? 'queued' : 'failed';
      if (outcome === 'failed') markExpenseCreateFailed(currentUser.uid, expenseId);
      else clearExpenseCreateFailure(currentUser.uid, expenseId);
      return outcome;
    });
    return outcome === 'failed' ? { status: outcome } : { status: outcome, expenseId };
  };

  // Reload quick expense presets
  const handleReloadQuickExpensePresets = async () => {
    if (!currentUser) return;
    try {
      const presets = await quickExpenseService.getPresets(currentUser.uid);
      setQuickExpensePresets(presets);
    } catch (error) {
      console.error('Failed to reload quick expense presets:', error);
    }
  };

  // Handle quick expense add from preset
  const handleQuickExpenseAdd = async (preset: QuickExpensePreset) => {
    if (!currentUser) return;

    // Use selected date from DateNavigator (if in day view mode), otherwise use today
    const dateToUse = expensePeriod.mode === 'day' ? expensePeriod.anchorDate : getTodayLocal();
    const now = new Date().toTimeString().slice(0, 5);

    // Find category name from categoryId
    const category = categories.find(c => c.id === preset.categoryId);
    const categoryName = category?.name || '';

    // Find e-wallet name if ewalletId is set
    const ewallet = preset.ewalletId ? ewallets.find(w => w.id === preset.ewalletId) : null;
    const currencyFields = await resolveExpenseCurrencyFields({
      amount: preset.amount,
      currency: preset.currency,
      date: dateToUse,
    });

    // Build expense data, excluding undefined fields (Firebase doesn't accept undefined)
    const expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      description: preset.name,
      amount: preset.amount,
      ...currencyFields,
      category: categoryName,
      date: dateToUse,
      time: now,
      paymentMethod: preset.paymentMethod || 'cash',
      notes: preset.description || '',
    };

    // Only add payment-specific fields if they exist
    if (preset.cardId) expenseData.cardId = preset.cardId;
    if (preset.bankId) expenseData.bankId = preset.bankId;
    // For e-wallet, use paymentMethodName (the wallet's name), not ewalletId
    if (ewallet) expenseData.paymentMethodName = ewallet.name;

    await handleAddExpense(expenseData);
    // Note: handleAddExpense via optimisticCRUD already shows notification
  };

  const handleDeleteExpense = async (id: string) => {
    if (!currentUser) return;
    const userId = currentUser.uid;
    const expenseToDelete = expenses.find((e) => e.id === id);
    const alreadyQueuedForDeletion = offlineQueue.hasPendingExpenseDelete(id, userId);
    if (alreadyQueuedForDeletion) return;

    const relatedTransfers = transfers.filter((transfer) => transfer.expenseId === id && !!transfer.id);
    // Older transfers have no explicit expense link, so date/amount matches are never deleted automatically.
    const possibleLegacyTransfers = expenseToDelete ? transfers.filter(t => {
      if (t.expenseId) return false;
      const dateMatch = t.date === expenseToDelete.date;
      const expenseAmount = expenseToDelete.baseAmount ?? expenseToDelete.amount;
      const amountMatch = Math.abs(t.amount - expenseAmount) < 0.01;

      // Match payment method as the source (fromPaymentMethod = expense's payment method)
      let paymentMethodMatch = false;
      if (expenseToDelete.paymentMethod === 'credit_card') {
        paymentMethodMatch = t.fromPaymentMethod === 'credit_card' && t.fromCardId === expenseToDelete.cardId;
      } else if (expenseToDelete.paymentMethod === 'e_wallet') {
        paymentMethodMatch = t.fromPaymentMethod === 'e_wallet' && t.fromPaymentMethodName === expenseToDelete.paymentMethodName;
      } else if (expenseToDelete.paymentMethod === 'bank') {
        paymentMethodMatch = t.fromPaymentMethod === 'bank' && t.fromBankId === expenseToDelete.bankId;
      } else if (expenseToDelete.paymentMethod === 'cash') {
        paymentMethodMatch = t.fromPaymentMethod === 'cash';
      }

      return dateMatch && amountMatch && paymentMethodMatch;
    }) : [];
    const relatedTransferIds = relatedTransfers.map((transfer) => transfer.id!).filter(Boolean);
    if (possibleLegacyTransfers.length > 0) showNotification('info', t('relatedTransferNotLinked'));

    // Optimistic update: remove expense
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    // Optimistic update: remove related transfer if exists
    if (relatedTransferIds.length > 0) setTransfers((prev) => prev.filter((transfer) => !relatedTransferIds.includes(transfer.id || '')));

    // Update cache optimistically
    dataService.updateCache<Expense[]>('expenses', userId, (data) => data.filter((e) => e.id !== id));

    await withExpenseMutationLock(userId, id, async () => {
      if (hasExpenseCreateFailed(userId, id)) {
        setExpenses((prev) => prev.filter((expense) => expense.id !== id));
        dataService.updateCache<Expense[]>('expenses', userId, (data) => data.filter((expense) => expense.id !== id));
        return;
      }
      if (offlineQueue.hasPendingExpenseDelete(id, userId) || hasExpenseBeenDeleted(userId, id)) return;

      const deletePayload = {
        id,
        userId,
        ...(relatedTransferIds.length > 0 ? { relatedTransferIds } : {}),
      };
      if (offlineQueue.hasPendingExpenseOperations(id, userId)) {
        const queuedId = offlineQueue.enqueue({ type: 'delete', entity: 'expense', payload: deletePayload });
        if (queuedId) {
          markExpenseDeleted(userId, id);
          showNotification('info', t('operationSavedOffline'));
          return;
        }

        if (expenseToDelete) {
          setExpenses((prev) => [expenseToDelete, ...prev]);
          dataService.updateCache<Expense[]>('expenses', userId, (data) => [expenseToDelete, ...data]);
        }
        if (relatedTransfers.length > 0) setTransfers((prev) => [...relatedTransfers.filter((transfer) => !prev.some((item) => item.id === transfer.id)), ...prev]);
        showNotification('error', t('offlineQueueSaveFailed'));
        return;
      }

      let queuedForRetry = false;
      await optimisticCRUD.run(
        { type: 'delete', data: deletePayload, originalData: expenseToDelete },
        () => expenseService.deleteWithRelatedTransfers(id, userId, relatedTransferIds),
        {
          entityType: 'expense',
          retryToQueueOnFail: true,
          onQueued: () => {
            queuedForRetry = true;
            markExpenseDeleted(userId, id);
          },
          onSuccess: (result) => {
            markExpenseDeleted(userId, id);
            const deletedTransferIds = new Set((result as Transfer[]).map((transfer) => transfer.id).filter((transferId): transferId is string => !!transferId));
            if (deletedTransferIds.size > 0) {
              setTransfers((prev) => prev.filter((transfer) => !deletedTransferIds.has(transfer.id || '')));
            }
            if (expenseToDelete) {
              loadData();
            }
          },
          onError: () => {
            if (queuedForRetry) return;
            if (expenseToDelete) {
              setExpenses((prev) => [expenseToDelete, ...prev]);
              dataService.updateCache<Expense[]>('expenses', userId, (data) => [expenseToDelete, ...data]);
            }
            if (relatedTransfers.length > 0) setTransfers((prev) => [...relatedTransfers.filter((transfer) => !prev.some((item) => item.id === transfer.id)), ...prev]);
          },
        }
      );
    });
  };

  // Inline update by id (used by ExpenseList inline editing)
  const handleInlineUpdateExpense = async (id: string, updates: Partial<Expense>) => {
    if (!currentUser) return;
    const originalExpense = expenses.find((e) => e.id === id);
    if (!originalExpense) return;
    if (offlineQueue.hasPendingExpenseDelete(id, currentUser.uid)) {
      showNotification('info', t('expensePendingDelete'));
      return;
    }

    const updatePayload = { ...updates, id, userId: currentUser.uid };

    // Optimistic update
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => 
        data.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    }

    await withExpenseMutationLock(currentUser.uid, id, async () => {
      if (hasExpenseCreateFailed(currentUser.uid, id) || hasExpenseBeenDeleted(currentUser.uid, id)) {
        setExpenses((prev) => prev.filter((expense) => expense.id !== id));
        dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => data.filter((expense) => expense.id !== id));
        if (hasExpenseBeenDeleted(currentUser.uid, id)) showNotification('info', t('expensePendingDelete'));
        return;
      }
      if (offlineQueue.hasPendingExpenseDelete(id, currentUser.uid)) {
        showNotification('info', t('expensePendingDelete'));
        return;
      }

      if (offlineQueue.hasPendingExpenseOperations(id, currentUser.uid)) {
        const queuedId = offlineQueue.enqueue({ type: 'update', entity: 'expense', payload: updatePayload });
        if (queuedId) {
          showNotification('info', t('operationSavedOffline'));
          return;
        }
        setExpenses((prev) => prev.map((expense) => expense.id === id ? originalExpense : expense));
        dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) =>
          data.map((expense) => expense.id === id ? originalExpense : expense)
        );
        showNotification('error', t('offlineQueueSaveFailed'));
        return;
      }

      await optimisticCRUD.run(
        { type: 'update', data: updatePayload, originalData: originalExpense },
        () => expenseService.update(id, updates),
        {
          entityType: 'expense',
          retryToQueueOnFail: true,
          onSuccess: () => {
            // Cache already updated optimistically, no need to reload
          },
          onError: () => {
            setExpenses((prev) => prev.map((e) => (e.id === id ? originalExpense : e)));
            dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) =>
              data.map((e) => (e.id === id ? originalExpense : e))
            );
          },
        }
      );
    });
  };

  // Mark tracking as completed
  const handleMarkTrackingCompleted = async (id: string) => {
    await handleInlineUpdateExpense(id, { repaymentTrackingCompleted: true });
  };

  // Bulk delete expenses (from ExpenseList multi-select)
  const handleBulkDeleteExpenses = async (ids: string[]) => {
    if (!currentUser || ids.length === 0) return;

    const originals = expenses.filter((e) => ids.includes(e.id!));
    const linkedTransfers = transfers.filter((transfer) => !!transfer.id && !!transfer.expenseId && ids.includes(transfer.expenseId));

    // Optimistic update: remove selected expenses
    setExpenses((prev) => prev.filter((e) => !ids.includes(e.id!)));
    dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => data.filter((expense) => !ids.includes(expense.id!)));
    setTransfers((prev) => prev.filter((transfer) => !linkedTransfers.some((linked) => linked.id === transfer.id)));

    // 設置刪除進度狀態
    const deleteId = `delete-${Date.now()}`;
    setDeleteProgress({
      id: deleteId,
      current: 0,
      total: ids.length,
      message: `${t('deleteSelected')} (0/${ids.length})`,
      status: 'deleting',
    });

    // 逐個刪除並更新進度
    let successCount = 0;
    let failCount = 0;
    let queuedCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const original = originals.find((o) => o.id === id);
      const relatedTransfers = linkedTransfers.filter((transfer) => transfer.expenseId === id);
      const relatedTransferIds = relatedTransfers.map((transfer) => transfer.id!).filter(Boolean);
      const restoreOptimisticDelete = () => {
        if (original) {
          setExpenses((prev) => [original, ...prev]);
          dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => [original, ...data]);
        }
        if (relatedTransfers.length > 0) {
          setTransfers((prev) => [...relatedTransfers.filter((transfer) => !prev.some((item) => item.id === transfer.id)), ...prev]);
        }
      };
      let mutationResult: 'saved' | 'queued' | 'failed' = 'failed';
      await withExpenseMutationLock(currentUser.uid, id, async () => {
        if (hasExpenseCreateFailed(currentUser.uid, id)) {
          markExpenseDeleted(currentUser.uid, id);
          mutationResult = 'saved';
          return;
        }
        if (hasExpenseBeenDeleted(currentUser.uid, id) || offlineQueue.hasPendingExpenseDelete(id, currentUser.uid)) {
          markExpenseDeleted(currentUser.uid, id);
          mutationResult = 'saved';
          return;
        }

        const deletePayload = {
          id,
          userId: currentUser.uid,
          ...(relatedTransferIds.length > 0 ? { relatedTransferIds } : {}),
        };
        if (offlineQueue.hasPendingExpenseOperations(id, currentUser.uid)) {
          const queuedId = offlineQueue.enqueue({ type: 'delete', entity: 'expense', payload: deletePayload });
          if (queuedId) {
            markExpenseDeleted(currentUser.uid, id);
            mutationResult = 'queued';
          } else {
            mutationResult = 'failed';
            restoreOptimisticDelete();
          }
          return;
        }

        try {
          let queuedForRetry = false;
          const result = await optimisticCRUD.run(
            { type: 'delete', data: deletePayload, originalData: original },
            () => expenseService.deleteWithRelatedTransfers(id, currentUser.uid, relatedTransferIds),
            {
              entityType: 'expense',
              retryToQueueOnFail: true,
              suppressNotification: true,
              onQueued: () => {
                queuedForRetry = true;
                markExpenseDeleted(currentUser.uid, id);
              },
              onSuccess: (result) => {
                markExpenseDeleted(currentUser.uid, id);
                const deletedTransferIds = new Set((result as Transfer[]).map((transfer) => transfer.id).filter((transferId): transferId is string => !!transferId));
                if (deletedTransferIds.size > 0) {
                  setTransfers((prev) => prev.filter((transfer) => !deletedTransferIds.has(transfer.id || '')));
                }
              },
              onError: () => {
                restoreOptimisticDelete();
              },
            }
          );
          mutationResult = result !== null ? 'saved' : queuedForRetry ? 'queued' : 'failed';
        } catch (error) {
          console.error('Failed to delete expense:', error);
          restoreOptimisticDelete();
        }
      });

      if (mutationResult === 'failed') failCount++;
      else {
        successCount++;
        if (mutationResult === 'queued') queuedCount++;
      }

      // 更新進度
      const current = i + 1;
      setDeleteProgress(prev => prev ? {
        ...prev,
        current,
        message: `${t('deleteSelected')} (${current}/${ids.length})`,
      } : null);
    }

    // 完成後更新狀態
    if (failCount > 0) {
      setDeleteProgress(prev => prev ? {
        ...prev,
        status: 'error',
        message: `${t('errorDeletingData')}: ${successCount}/${ids.length} ${t('success')}`,
      } : null);
    } else {
      setDeleteProgress(prev => prev ? {
        ...prev,
        status: 'complete',
        message: `${t('success')}: ${successCount} ${t('items')}`,
      } : null);
    }

    // 3秒後自動關閉
    setTimeout(() => {
      setDeleteProgress(null);
    }, 3000);

    if (queuedCount > 0) showNotification('info', t('operationSavedOffline'));

    // Refresh to ensure server state is in sync
    loadData();
  };
  //#endregion

  //#region Event Handlers - Categories
  const handleNavigateToCreateCategory = (categoryName: string) => {
    const defaultCategory = DEFAULT_CATEGORIES.find(
      (category) => category.name.toLowerCase() === categoryName.toLowerCase(),
    );
    setPendingCategoryCreationRequest({
      id: ++categoryCreationRequestIdRef.current,
      initialData: {
        name: categoryName,
        icon: defaultCategory?.icon || '📦',
        color: defaultCategory?.color || '#95A5A6',
      },
    });
    setActiveTab('categories');
  };

  const handleAddCategory = async (categoryData: Omit<Category, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    const existingOrders = categories.map((category) => category.order).filter((order): order is number => Number.isFinite(order));
    const nextOrder = existingOrders.length > 0 ? Math.max(categories.length - 1, ...existingOrders) + 1 : undefined;
    const newCategoryData = nextOrder === undefined ? categoryData : { ...categoryData, order: nextOrder };

    // Optimistic update
    const categoryId = categoryService.createId();
    const optimisticCategory: Category = {
      ...newCategoryData,
      id: categoryId,
      userId: currentUser.uid,
      createdAt: new Date(),
    };
    const createPayload = { ...newCategoryData, id: categoryId, userId: currentUser.uid };
    setCategories((prev) => sortCategories([...prev, optimisticCategory]));

    // Update cache optimistically
    dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => sortCategories([...data, optimisticCategory]));

    void optimisticCRUD.run(
      { type: 'create', data: createPayload },
      () => categoryService.create(createPayload),
      {
        entityType: 'category',
        retryToQueueOnFail: true,
        onSuccess: (result) => {
          // Replace temp category with real ID
          const newId = result as string;
          const realCategory: Category = {
            ...optimisticCategory,
            id: newId,
          };
          setCategories((prev) => prev.map((c) => (c.id === categoryId ? realCategory : c)));
          // Update cache with real ID
          dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => 
            data.map((c) => (c.id === categoryId ? realCategory : c))
          );
        },
        onError: () => {
          setCategories((prev) => prev.filter((c) => c.id !== categoryId));
          // Rollback cache
          dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => data.filter((c) => c.id !== categoryId));
        },
      }
    );
  };

  const handleReorderCategories = async (orderedIds: string[]): Promise<void> => {
    if (!currentUser || orderedIds.length !== categories.length || new Set(orderedIds).size !== categories.length ||
        categories.some((category) => !category.id || !orderedIds.includes(category.id))) return;

    const previousCategories = categories;
    const byId = new Map(categories.map((category) => [category.id, category]));
    const reordered = orderedIds.map((id, index) => ({ ...byId.get(id)!, order: index }));
    setCategories(reordered);
    dataService.updateCache<Category[]>('categories', currentUser.uid, () => reordered);

    try {
      await writeLocalFirstBatch(orderedIds.map((id, order) => ({
        type: 'update', entity: 'category', payload: { id, userId: currentUser.uid, order },
      })), () => categoryService.updateOrder(orderedIds));
    } catch (error) {
      if (getQueuedWriteId(error)) { showNotification('info', t('operationSavedOffline')); return; }
      setCategories(previousCategories);
      dataService.updateCache<Category[]>('categories', currentUser.uid, () => previousCategories);
      throw error;
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    const originalCategory = categories.find((c) => c.id === id);

    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => 
        data.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    }

    void optimisticCRUD.run(
      { type: 'update', data: { ...updates, id, userId: originalCategory?.userId || currentUser?.uid }, originalData: originalCategory },
      () => categoryService.update(id, updates),
      {
        entityType: 'category',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (originalCategory) {
            setCategories((prev) =>
              prev.map((c) => (c.id === id ? originalCategory : c))
            );
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => 
                data.map((c) => (c.id === id ? originalCategory : c))
              );
            }
          }
        },
      }
    );
  };

  const handleDeleteCategory = async (id: string) => {
    const categoryToDelete = categories.find((c) => c.id === id);

    // Optimistic update
    setCategories((prev) => prev.filter((c) => c.id !== id));

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => data.filter((c) => c.id !== id));
    }

    void optimisticCRUD.run(
      { type: 'delete', data: { id, userId: categoryToDelete?.userId || currentUser?.uid }, originalData: categoryToDelete },
      () => categoryService.delete(id),
      {
        entityType: 'category',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (categoryToDelete) {
            setCategories((prev) => [...prev, categoryToDelete]);
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => [...data, categoryToDelete]);
            }
          }
        },
      }
    );
  };
  //#endregion

  //#region Event Handlers - Budgets
  const loadBudgetsForAllocationCheck = async (): Promise<{ budgets: Budget[]; limits: OverallBudgetLimits | undefined; isOffline: boolean } | null> => {
    if (!currentUser) return null;

    try {
      const [latestSettings, latestBudgets] = await Promise.all([
        userSettingsService.get(currentUser.uid, true, true),
        budgetService.getAll(currentUser.uid, true),
      ]);
      return {
        budgets: latestBudgets,
        limits: latestSettings?.overallBudgetLimits,
        isOffline: false,
      };
    } catch (error) {
      const networkFailure = error instanceof Error && /network|offline|unavailable|failed to fetch|deadline/i.test(error.message);
      if (!navigator.onLine || !networkStatus.isOnline || networkFailure) {
        return { budgets, limits: settings?.overallBudgetLimits, isOffline: true };
      }
      showNotification('error', t('budgetAllocationCannotBeCompared'));
      return null;
    }
  };

  const showAllocationValidationError = (validation: ReturnType<typeof validateBudgetAllocationChange>) => {
    if (validation.valid) return;
    if (validation.reason === 'invalid-allocation') {
      showNotification('error', t('budgetAllocationCannotBeCompared'));
      return;
    }
    if (validation.reason === 'limit-below-allocation' && validation.allocatedMinorUnits !== undefined && validation.limitMinorUnits !== undefined) {
      showNotification(
        'error',
        `${t('budgetAllocationExceedsLimit')} ${formatMoney(validation.allocatedMinorUnits / 100, DEFAULT_BASE_CURRENCY)} / ${formatMoney(validation.limitMinorUnits / 100, DEFAULT_BASE_CURRENCY)}`,
      );
      return;
    }
    showNotification('error', t('budgetAllocationExceedsLimit'));
  };

  const makeRoomForBudgetAllocation = async (
    budgetsForCheck: Budget[],
    proposedBudget: BudgetAllocationInput,
    limits: OverallBudgetLimits | undefined,
    previousBudgetId?: string,
  ): Promise<boolean> => {
    const validation = validateBudgetAllocationChange(
      budgetsForCheck,
      proposedBudget,
      limits,
      previousBudgetId,
    );
    if (validation.valid || validation.reason === 'limit-below-allocation') {
      // The transaction in budgetService raises the limit and writes the allocation atomically.
      return true;
    }
    showAllocationValidationError(validation);
    return false;
  };

  const performAddBudget = async (budgetData: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return false;

    const currency = budgetData.currency || DEFAULT_BASE_CURRENCY;
    const exchangeRate = budgetData.exchangeRate && budgetData.exchangeRate > 0
      ? budgetData.exchangeRate
      : currency === DEFAULT_BASE_CURRENCY ? 1 : undefined;
    if (!exchangeRate) {
      showNotification('error', t('exchangeRateLookupFailed'));
      return false;
    }
    const normalizedBudgetData: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      ...budgetData,
      currency,
      baseCurrency: budgetData.baseCurrency || DEFAULT_BASE_CURRENCY,
      exchangeRate,
      exchangeRateDate: budgetData.exchangeRateDate || getTodayLocal(),
      exchangeRateFetchedAt: budgetData.exchangeRateFetchedAt || new Date(),
      exchangeRateProvider: budgetData.exchangeRateProvider || 'local',
    };

    const budgetId = budgetService.createId();
    const createPayload = { ...normalizedBudgetData, userId: currentUser.uid, id: budgetId };
    const optimisticBudget: Budget = {
      ...normalizedBudgetData,
      id: budgetId,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const rollbackOptimisticBudget = () => {
      setBudgets((prev) => prev.filter((budget) => budget.id !== budgetId));
      dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => data.filter((budget) => budget.id !== budgetId));
    };
    setBudgets((prev) => [...prev, optimisticBudget]);
    dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => [...data, optimisticBudget]);

    const allocationBudgets = await loadBudgetsForAllocationCheck();
    if (!allocationBudgets) {
      rollbackOptimisticBudget();
      return false;
    }
    if (!allocationBudgets.isOffline && !await makeRoomForBudgetAllocation(
      allocationBudgets.budgets,
      normalizedBudgetData,
      allocationBudgets.limits,
    )) {
      rollbackOptimisticBudget();
      return false;
    }

    if (allocationBudgets.isOffline) {
      const queuedId = offlineQueue.enqueue({
        type: 'create',
        entity: 'budget',
        payload: createPayload,
      });
      if (!queuedId) {
        rollbackOptimisticBudget();
        showNotification('error', t('offlineQueueSaveFailed'));
        return false;
      }
      showNotification('info', t('operationSavedOffline'));
      return true;
    }

    let queuedForRetry = false;
    const createdId = await optimisticCRUD.run(
      { type: 'create', data: createPayload },
      () => budgetService.create(createPayload),
      {
        entityType: 'budget',
        retryToQueueOnFail: true,
        onQueued: () => { queuedForRetry = true; },
        onSuccess: (result) => {
          const newId = result as string;
          const realBudget: Budget = {
            ...optimisticBudget,
            id: newId,
          };
          setBudgets((prev) => prev.map((b) => (b.id === budgetId ? realBudget : b)));
          dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => 
            data.map((b) => (b.id === budgetId ? realBudget : b))
          );
        },
        onError: () => {
          if (queuedForRetry) return;
          rollbackOptimisticBudget();
        },
      }
    );
    if (createdId === null) return queuedForRetry;
    return true;
  };

  const handleAddBudget = (budgetData: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    withBudgetMutationLock(() => performAddBudget(budgetData));

  const performUpdateBudget = async (id: string, updates: Partial<Budget>) => {
    const originalBudget = budgets.find((b) => b.id === id);
    if (!originalBudget) return false;
    const hasPendingOperation = currentUser
      ? offlineQueue.hasPendingBudgetOperations(id, originalBudget.userId)
      : false;
    const optimisticBudget = { ...originalBudget, ...updates };
    const rollbackOptimisticBudget = () => {
      setBudgets((prev) => prev.map((budget) => budget.id === id ? originalBudget : budget));
      if (currentUser) {
        dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) =>
          data.map((budget) => budget.id === id ? originalBudget : budget)
        );
      }
    };
    setBudgets((prev) => prev.map((budget) => budget.id === id ? optimisticBudget : budget));
    if (currentUser) {
      dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) =>
        data.map((budget) => budget.id === id ? optimisticBudget : budget)
      );
    }

    const proposedBudget = { ...originalBudget, ...updates, id };
    const allocationBudgets = await loadBudgetsForAllocationCheck();
    if (!allocationBudgets) {
      rollbackOptimisticBudget();
      return false;
    }
    if (!allocationBudgets.isOffline && !await makeRoomForBudgetAllocation(
      allocationBudgets.budgets,
      proposedBudget,
      allocationBudgets.limits,
      id,
    )) {
      rollbackOptimisticBudget();
      return false;
    }

    if (allocationBudgets.isOffline || hasPendingOperation) {
      const queuedId = offlineQueue.enqueue({
        type: 'update',
        entity: 'budget',
        payload: { ...updates, id, userId: originalBudget.userId, previousBudget: originalBudget },
      });
      if (!queuedId) {
        rollbackOptimisticBudget();
        showNotification('error', t('offlineQueueSaveFailed'));
        return false;
      }
      showNotification('info', t('operationSavedOffline'));
      return true;
    }

    let queuedForRetry = false;
    const updateResult = await optimisticCRUD.run(
      { type: 'update', data: { ...updates, id, userId: originalBudget.userId, previousBudget: originalBudget }, originalData: originalBudget },
      () => budgetService.update(id, updates),
      {
        entityType: 'budget',
        retryToQueueOnFail: true,
        onQueued: () => { queuedForRetry = true; },
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (queuedForRetry) return;
          rollbackOptimisticBudget();
        },
      }
    );
    if (updateResult === null) return queuedForRetry;
    return true;
  };

  const handleUpdateBudget = (id: string, updates: Partial<Budget>) =>
    withBudgetMutationLock(() => performUpdateBudget(id, updates));

  const performSaveOverallBudgetLimit = async (period: BudgetPeriod, amount: number): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      await saveOverallBudgetLimit(period, amount);
      showNotification('success', t('saveSuccess'));
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'limit-below-allocation') {
        showNotification('error', t('overallBudgetBelowAllocation'));
        return false;
      }
      if (error instanceof Error && error.message === 'invalid-allocation') {
        showNotification('error', t('budgetAllocationCannotBeCompared'));
        return false;
      }
      showNotification('error', t('budgetLimitSaveFailed'));
      return false;
    }
  };

  const handleSaveOverallBudgetLimit = (period: BudgetPeriod, amount: number): Promise<boolean> =>
    withBudgetMutationLock(() => performSaveOverallBudgetLimit(period, amount));

  const handleDeleteBudget = async (id: string) => {
    return withBudgetMutationLock(async () => {
      const budgetToDelete = budgets.find((b) => b.id === id);

      // Optimistic update
      setBudgets((prev) => prev.filter((b) => b.id !== id));

      // Update cache optimistically
      if (currentUser) {
        dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => data.filter((b) => b.id !== id));
      }

      if (currentUser && offlineQueue.hasPendingBudgetOperations(id, currentUser.uid)) {
        offlineQueue.enqueue({
          type: 'delete',
          entity: 'budget',
          payload: { id, userId: currentUser.uid, previousBudget: budgetToDelete },
        });
        showNotification('info', t('operationSavedOffline'));
        return;
      }

      let queuedForRetry = false;
      await optimisticCRUD.run(
        { type: 'delete', data: { id, userId: currentUser?.uid, previousBudget: budgetToDelete }, originalData: budgetToDelete },
        () => budgetService.delete(id),
        {
          entityType: 'budget',
          retryToQueueOnFail: true,
          onQueued: () => { queuedForRetry = true; },
          onSuccess: () => {
            // Cache already updated optimistically, no need to reload
          },
          onError: () => {
            if (queuedForRetry) return;
            if (budgetToDelete) {
              setBudgets((prev) => [...prev, budgetToDelete]);
              // Rollback cache
              if (currentUser) {
                dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => [...data, budgetToDelete]);
              }
            }
          },
        }
      );
    });
  };
  //#endregion

  //#region Event Handlers - Scheduled Payments
  const handleAddScheduledPayment = async (paymentData: Omit<ScheduledPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;

    const paymentId = scheduledPaymentService.createId();
    const createPayload = { ...paymentData, id: paymentId, userId: currentUser.uid };
    const optimisticPayment: ScheduledPayment = {
      ...createPayload,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setScheduledPayments((prev) => [...prev, optimisticPayment]);

    void optimisticCRUD.run(
      { type: 'create', data: createPayload },
      () => scheduledPaymentService.create(createPayload),
      {
        entityType: 'scheduledPayment',
        retryToQueueOnFail: true,
        onSuccess: (result) => {
          const newId = result as string;
          const realPayment: ScheduledPayment = {
            ...optimisticPayment,
            id: newId,
          };
          setScheduledPayments((prev) => prev.map((p) => (p.id === paymentId ? realPayment : p)));
        },
        onError: () => {
          setScheduledPayments((prev) => prev.filter((p) => p.id !== paymentId));
        },
      }
    );
  };

  const handleUpdateScheduledPayment = async (id: string, updates: Partial<ScheduledPayment>) => {
    const original = scheduledPayments.find((p) => p.id === id);

    setScheduledPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    void optimisticCRUD.run(
      { type: 'update', data: { ...updates, id, userId: original?.userId || currentUser?.uid }, originalData: original },
      () => scheduledPaymentService.update(id, updates),
      {
        entityType: 'scheduledPayment',
        retryToQueueOnFail: true,
        onSuccess: () => {},
        onError: () => {
          if (original) {
            setScheduledPayments((prev) =>
              prev.map((p) => (p.id === id ? original : p))
            );
          }
        },
      }
    );
  };

  const handleDeleteScheduledPayment = async (id: string) => {
    const original = scheduledPayments.find((p) => p.id === id);

    setScheduledPayments((prev) => prev.filter((p) => p.id !== id));

    void optimisticCRUD.run(
      { type: 'delete', data: { id, userId: original?.userId || currentUser?.uid }, originalData: original },
      () => scheduledPaymentService.delete(id),
      {
        entityType: 'scheduledPayment',
        retryToQueueOnFail: true,
        onSuccess: () => {},
        onError: () => {
          if (original) {
            setScheduledPayments((prev) => [...prev, original]);
          }
        },
      }
    );
  };

  const handleToggleScheduledPaymentActive = async (id: string, isActive: boolean) => {
    const original = scheduledPayments.find((p) => p.id === id);

    setScheduledPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive } : p))
    );

    void optimisticCRUD.run(
      { type: 'update', data: { id, userId: original?.userId || currentUser?.uid, isActive }, originalData: original },
      () => scheduledPaymentService.toggleActive(id, isActive),
      {
        entityType: 'scheduledPayment',
        retryToQueueOnFail: true,
        onSuccess: () => {},
        onError: () => {
          if (original) {
            setScheduledPayments((prev) =>
              prev.map((p) => (p.id === id ? original : p))
            );
          }
        },
      }
    );
  };

  const handleConfirmScheduledPayment = async (
    scheduledPaymentId: string,
    recordData: Omit<ScheduledPaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'scheduledPaymentId'>
  ) => {
    if (!currentUser) return;

    // Find the scheduled payment to check if autoGenerateExpense is enabled
    const scheduledPayment = scheduledPayments.find(p => p.id === scheduledPaymentId);
    const paymentCurrency = scheduledPayment?.currency || DEFAULT_BASE_CURRENCY;
    const recordId = scheduledPaymentService.createPaymentRecordId();
    const provisionalRecord: ScheduledPaymentRecord = {
      ...recordData,
      id: recordId,
      userId: currentUser.uid,
      scheduledPaymentId,
      currency: paymentCurrency,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setScheduledPaymentRecords((prev) => [provisionalRecord, ...prev]);
    let actualCurrencyFields: Awaited<ReturnType<typeof resolveAmountCurrencyFields>>;
    let expectedCurrencyFields: Awaited<ReturnType<typeof resolveAmountCurrencyFields>>;
    try {
      actualCurrencyFields = await resolveAmountCurrencyFields({
        amount: recordData.actualAmount,
        currency: paymentCurrency,
        baseCurrency: DEFAULT_BASE_CURRENCY,
        date: recordData.paidDate,
      });
      expectedCurrencyFields = await resolveAmountCurrencyFields({
        amount: recordData.expectedAmount,
        currency: paymentCurrency,
        baseCurrency: DEFAULT_BASE_CURRENCY,
        date: recordData.dueDate,
      });
    } catch (error) {
      console.error('[Scheduled Payment] Unable to resolve currency snapshot:', error);
      setScheduledPaymentRecords((prev) => prev.filter((record) => record.id !== recordId));
      showNotification('error', t('exchangeRateLookupFailed'));
      return;
    }

    const savedRecordData: Omit<ScheduledPaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'scheduledPaymentId'> = {
      ...recordData,
      currency: actualCurrencyFields.currency,
      baseCurrency: actualCurrencyFields.baseCurrency,
      baseAmount: actualCurrencyFields.baseAmount,
      exchangeRate: actualCurrencyFields.exchangeRate,
      exchangeRateDate: actualCurrencyFields.exchangeRateDate,
      exchangeRateFetchedAt: actualCurrencyFields.exchangeRateFetchedAt,
      exchangeRateProvider: actualCurrencyFields.exchangeRateProvider,
      expectedBaseAmount: expectedCurrencyFields.baseAmount,
      expectedExchangeRate: expectedCurrencyFields.exchangeRate,
      expectedExchangeRateDate: expectedCurrencyFields.exchangeRateDate,
      expectedExchangeRateFetchedAt: expectedCurrencyFields.exchangeRateFetchedAt,
      expectedExchangeRateProvider: expectedCurrencyFields.exchangeRateProvider,
    };

    const optimisticRecord: ScheduledPaymentRecord = {
      ...savedRecordData,
      id: recordId,
      userId: currentUser.uid,
      scheduledPaymentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setScheduledPaymentRecords((prev) => prev.map((record) => record.id === recordId ? optimisticRecord : record));

    const generatedExpensePayload: (Omit<Expense, 'createdAt' | 'updatedAt'>) | undefined = scheduledPayment?.autoGenerateExpense
      ? {
          id: expenseService.createId(),
          userId: currentUser.uid,
          description: scheduledPayment.name,
          amount: recordData.actualAmount,
          ...actualCurrencyFields,
          category: scheduledPayment.category,
          date: recordData.paidDate,
          time: getCurrentTimeLocal(),
          notes: recordData.note || `${t('scheduledPayment')}: ${scheduledPayment.name}`,
          paymentMethod: recordData.paymentMethod || scheduledPayment.paymentMethod,
          cardId: recordData.cardId || scheduledPayment.cardId,
          paymentMethodName: recordData.paymentMethodName || scheduledPayment.paymentMethodName,
          bankId: recordData.bankId || scheduledPayment.bankId,
        }
      : undefined;
    if (generatedExpensePayload) {
      const optimisticExpense: Expense = {
        ...generatedExpensePayload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setExpenses((prev) => [optimisticExpense, ...prev]);
      dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => [optimisticExpense, ...data]);
    }

    const queuedRecordPayload = {
      ...savedRecordData,
      id: recordId,
      userId: currentUser.uid,
      scheduledPaymentId,
      generatedExpensePayload,
    };

    void optimisticCRUD.run(
      { type: 'create', data: queuedRecordPayload },
      () => scheduledPaymentService.createPaymentRecord({
        ...savedRecordData,
        userId: currentUser.uid,
        scheduledPaymentId,
        id: recordId,
      }),
      {
        entityType: 'scheduledPaymentRecord',
        retryToQueueOnFail: true,
        onSuccess: async (result) => {
          const newId = result as string;
          const realRecord: ScheduledPaymentRecord = {
            ...optimisticRecord,
            id: newId,
          };
          setScheduledPaymentRecords((prev) => prev.map((r) => (r.id === recordId ? realRecord : r)));

          if (generatedExpensePayload) {
            await optimisticCRUD.run(
              { type: 'create', data: generatedExpensePayload },
              () => expenseService.create(generatedExpensePayload, { updateAccountBalances: true }),
              {
                entityType: 'expense',
                retryToQueueOnFail: true,
                successMessage: t('expenseGenerated') || 'Expense record created',
                onSuccess: () => { loadData(); },
                onError: () => {
                  setExpenses((prev) => prev.filter((expense) => expense.id !== generatedExpensePayload.id));
                  dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => data.filter((expense) => expense.id !== generatedExpensePayload.id));
                },
              }
            );
          }
        },
        onError: () => {
          setScheduledPaymentRecords((prev) => prev.filter((r) => r.id !== recordId));
          if (generatedExpensePayload) {
            setExpenses((prev) => prev.filter((expense) => expense.id !== generatedExpensePayload.id));
            dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => data.filter((expense) => expense.id !== generatedExpensePayload.id));
          }
        },
      }
    );
  };

  const handleDeleteScheduledPaymentRecord = async (id: string) => {
    const original = scheduledPaymentRecords.find((r) => r.id === id);

    setScheduledPaymentRecords((prev) => prev.filter((r) => r.id !== id));

    void optimisticCRUD.run(
      { type: 'delete', data: { id, userId: original?.userId || currentUser?.uid }, originalData: original },
      () => scheduledPaymentService.deletePaymentRecord(id),
      {
        entityType: 'scheduledPaymentRecord',
        retryToQueueOnFail: true,
        onSuccess: () => {},
        onError: () => {
          if (original) {
            setScheduledPaymentRecords((prev) => [...prev, original]);
          }
        },
      }
    );
  };

  const getScheduledPaymentSummary = async (payment: ScheduledPayment): Promise<ScheduledPaymentSummary> => {
    if (!currentUser) {
      return {
        scheduledPaymentId: payment.id!,
        totalPaid: 0,
        totalExpected: 0,
        paymentCount: 0,
      };
    }
    return scheduledPaymentService.getPaymentSummary(currentUser.uid, payment, scheduledPaymentRecords);
  };

  const isScheduledPaymentPeriodPaid = async (paymentId: string, year: number, month: number): Promise<boolean> => {
    if (!currentUser) return false;
    return scheduledPaymentRecords.some((record) => record.userId === currentUser.uid &&
      record.scheduledPaymentId === paymentId && record.periodYear === year && record.periodMonth === month);
  };
  //#endregion

  //#region Event Handlers - Incomes
  const handleAddIncome = async (incomeData: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;
    let currencyFields: Awaited<ReturnType<typeof resolveAmountCurrencyFields>>;
    try {
      currencyFields = await resolveAmountCurrencyFields({
        amount: incomeData.amount,
        currency: incomeData.currency || DEFAULT_BASE_CURRENCY,
        baseCurrency: DEFAULT_BASE_CURRENCY,
        date: incomeData.date,
      });
    } catch (error) {
      console.error('Failed to resolve income currency:', error);
      showNotification('error', t('exchangeRateLookupFailed') || t('errorSavingData'));
      return;
    }
    const normalizedIncomeData = { ...incomeData, ...currencyFields };

    // Optimistic update
    const incomeId = incomeService.createId();
    const createPayload = { ...normalizedIncomeData, id: incomeId, userId: currentUser.uid };
    const optimisticIncome: Income = {
      ...createPayload,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setIncomes((prev) => [optimisticIncome, ...prev]);

    // Update cache optimistically
    dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => [optimisticIncome, ...data]);

    void optimisticCRUD.run(
      { type: 'create', data: createPayload },
      () => incomeService.create(createPayload),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: async (result) => {
          // Replace temp income with real ID
          const newId = result as string;
          const realIncome: Income = {
            ...optimisticIncome,
            id: newId,
          };
          setIncomes((prev) => prev.map((i) => (i.id === incomeId ? realIncome : i)));
          // Update cache with real ID
          dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => 
            data.map((i) => (i.id === incomeId ? realIncome : i))
          );
          // Income and account balances are committed in one service transaction.
          loadData();
        },
        onError: () => {
          setIncomes((prev) => prev.filter((i) => i.id !== incomeId));
          // Rollback cache
          dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => data.filter((i) => i.id !== incomeId));
        },
      }
    );
  };

  const handleInlineUpdateIncome = async (id: string, updates: Partial<Income>) => {
    const originalIncome = incomes.find((i) => i.id === id);
    if (!originalIncome) return;
    const needsRevaluation = updates.amount !== undefined || updates.currency !== undefined || updates.date !== undefined;
    let valuationFields: Partial<Awaited<ReturnType<typeof resolveAmountCurrencyFields>>> = {};
    if (needsRevaluation) {
      try {
        valuationFields = await resolveAmountCurrencyFields({
          amount: updates.amount ?? originalIncome.amount,
          currency: updates.currency ?? originalIncome.currency ?? DEFAULT_BASE_CURRENCY,
          baseCurrency: updates.baseCurrency ?? originalIncome.baseCurrency ?? DEFAULT_BASE_CURRENCY,
          date: updates.date ?? originalIncome.date,
          existing: originalIncome,
        });
      } catch (error) {
        console.error('Failed to resolve income currency:', error);
        showNotification('error', t('exchangeRateLookupFailed') || t('errorSavingData'));
        return;
      }
    }
    const normalizedUpdates = { ...updates, ...valuationFields };

    // Optimistic update
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, ...normalizedUpdates } : i)));

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => 
        data.map((i) => (i.id === id ? { ...i, ...normalizedUpdates } : i))
      );
    }

    void optimisticCRUD.run(
      { type: 'update', data: { ...normalizedUpdates, id, userId: originalIncome.userId }, originalData: originalIncome },
      () => incomeService.update(id, normalizedUpdates),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: () => { loadData(); },
        onError: () => {
          if (originalIncome) {
            setIncomes((prev) => prev.map((i) => (i.id === id ? originalIncome : i)));
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => 
                data.map((i) => (i.id === id ? originalIncome : i))
              );
            }
          }
        },
      }
    );
  };

  const handleDeleteIncome = async (id: string) => {
    const incomeToDelete = incomes.find((i) => i.id === id);

    // Optimistic update
    setIncomes((prev) => prev.filter((i) => i.id !== id));

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => data.filter((i) => i.id !== id));
    }

    void optimisticCRUD.run(
      { type: 'delete', data: { id, userId: incomeToDelete?.userId || currentUser?.uid }, originalData: incomeToDelete },
      () => incomeService.delete(id, currentUser?.uid),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: () => { loadData(); },
        onError: () => {
          if (incomeToDelete) {
            setIncomes((prev) => [...prev, incomeToDelete]);
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => [...data, incomeToDelete]);
            }
          }
        },
      }
    );
  };
  //#endregion

  //#region Event Handlers - Transfers
  const handleAddTransfer = async (transferData: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt' | 'userId'>, silent = false) => {
    if (!currentUser) return;
    const transferId = transferService.createId();
    const optimisticTransfer: Transfer = {
      ...transferData,
      id: transferId,
      userId: currentUser.uid,
      baseCurrency: transferData.baseCurrency || DEFAULT_BASE_CURRENCY,
      baseAmount: transferData.baseAmount ?? transferData.amount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTransfers((prev) => [optimisticTransfer, ...prev]);

    let sourceFields: Awaited<ReturnType<typeof resolveAmountCurrencyFields>>;
    let destinationFields: Awaited<ReturnType<typeof resolveAmountCurrencyFields>>;
    try {
      sourceFields = await resolveAmountCurrencyFields({
        amount: transferData.amount,
        currency: transferData.currency || DEFAULT_BASE_CURRENCY,
        baseCurrency: DEFAULT_BASE_CURRENCY,
        date: transferData.date,
      });
      destinationFields = await resolveAmountCurrencyFields({
        amount: transferData.toAmount ?? transferData.amount,
        currency: transferData.toCurrency || transferData.currency || DEFAULT_BASE_CURRENCY,
        baseCurrency: DEFAULT_BASE_CURRENCY,
        date: transferData.date,
      });
    } catch (error) {
      console.error('Failed to resolve transfer currency:', error);
      setTransfers((prev) => prev.filter((transfer) => transfer.id !== transferId));
      if (!silent) showNotification('error', t('exchangeRateLookupFailed') || t('errorSavingData'));
      return;
    }
    const normalizedTransferData = {
      ...transferData,
      ...sourceFields,
      toCurrency: destinationFields.currency,
      toBaseAmount: destinationFields.baseAmount,
      toExchangeRate: destinationFields.exchangeRate,
      toExchangeRateDate: destinationFields.exchangeRateDate,
      toExchangeRateFetchedAt: destinationFields.exchangeRateFetchedAt,
      toExchangeRateProvider: destinationFields.exchangeRateProvider,
    };

    // Use the final document ID immediately so expense deletion can target the
    // exact linked transfer even while the create request is settling.
    const normalizedOptimisticTransfer: Transfer = {
      ...optimisticTransfer,
      ...normalizedTransferData,
      updatedAt: new Date(),
    };
    const transferPayload = { ...normalizedTransferData, id: transferId, userId: currentUser.uid };
    setTransfers((prev) => prev.map((transfer) => transfer.id === transferId ? normalizedOptimisticTransfer : transfer));

    const saveTransfer = () => optimisticCRUD.run(
      { type: 'create', data: transferPayload },
      () => transferService.create(transferPayload),
      {
        entityType: 'transfer',
        retryToQueueOnFail: true,
        suppressNotification: silent, // Don't show notification if silent mode
        onSuccess: (result) => {
          const savedTransfer = { ...normalizedOptimisticTransfer, id: result as string };
          setTransfers((prev) => prev.map((transfer) => transfer.id === transferId ? savedTransfer : transfer));
          loadData();
        },
        onError: () => {
          setTransfers((prev) => prev.filter((transfer) => transfer.id !== transferId));
        },
      }
    );

    if (normalizedTransferData.expenseId) {
      const expenseId = normalizedTransferData.expenseId;
      const result = await withExpenseMutationLock(currentUser.uid, expenseId, async () => {
        if (hasExpenseCreateFailed(currentUser.uid, expenseId) || hasExpenseBeenDeleted(currentUser.uid, expenseId)) {
          setTransfers((prev) => prev.filter((transfer) => transfer.id !== transferId));
          showNotification('info', t('expensePendingDelete'));
          return null;
        }
        return saveTransfer();
      });
      void result;
    } else {
      void saveTransfer();
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    const transferToDelete = transfers.find((t) => t.id === id);

    // Optimistic update
    setTransfers((prev) => prev.filter((t) => t.id !== id));

    void optimisticCRUD.run(
      { type: 'delete', data: { id, userId: transferToDelete?.userId || currentUser?.uid }, originalData: transferToDelete },
      () => transferService.delete(id, currentUser?.uid),
      {
        entityType: 'transfer',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
          showNotification('success', t('transferDeleted'));
        },
        onError: () => {
          if (transferToDelete) {
            setTransfers((prev) => [...prev, transferToDelete]);
          }
        },
      }
    );
  };
  //#endregion

  //#region Event Handlers - Cards
  const handleAddCard = async (cardData: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;

    // Optimistic update
    const cardId = cardService.createId();
    const createPayload = { ...cardData, id: cardId, userId: currentUser.uid };
    const optimisticCard: Card = {
      ...createPayload,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCards((prev) => [optimisticCard, ...prev]);

    // Update cache optimistically
    dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => [optimisticCard, ...data]);

    void optimisticCRUD.run(
      { type: 'create', data: createPayload },
      () => cardService.create(createPayload),
      {
        entityType: 'card',
        retryToQueueOnFail: true,
        onSuccess: (result) => {
          // Replace temp card with real ID
          const newId = result as string;
          const realCard: Card = {
            ...optimisticCard,
            id: newId,
          };
          setCards((prev) => prev.map((c) => (c.id === cardId ? realCard : c)));
          // Update cache with real ID
          dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => 
            data.map((c) => (c.id === cardId ? realCard : c))
          );
        },
        onError: () => {
          setCards((prev) => prev.filter((c) => c.id !== cardId));
          // Rollback cache
          dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => data.filter((c) => c.id !== cardId));
        },
      }
    );
  };

  // Banks CRUD
  const handleAddBank = async (bankData: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;
    const bankId = bankService.createId();
    const createPayload = { ...bankData, id: bankId, userId: currentUser.uid };
    const optimisticBank: Bank = { ...createPayload, createdAt: new Date(), updatedAt: new Date() };
    setBanks(prev => [...prev, optimisticBank]);

    // Update cache optimistically
    dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => [...data, optimisticBank]);

    void optimisticCRUD.run(
      { type: 'create', data: createPayload },
      () => bankService.create(createPayload),
      {
        entityType: 'bank',
        retryToQueueOnFail: true,
        onSuccess: (result) => {
          // Replace temp bank with real ID
          const newId = result as string;
          const realBank: Bank = {
            ...optimisticBank,
            id: newId,
          };
          setBanks((prev) => prev.map((b) => (b.id === bankId ? realBank : b)));
          // Update cache with real ID
          dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => 
            data.map((b) => (b.id === bankId ? realBank : b))
          );
        },
        onError: () => {
          setBanks(prev => prev.filter(b => b.id !== bankId));
          // Rollback cache
          dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => data.filter((b) => b.id !== bankId));
        },
      }
    );
  };

  const handleUpdateBank = async (id: string, updates: Partial<Bank>) => {
    const original = banks.find(b => b.id === id);
    if (!original) return;
    // Optimistic
    setBanks(prev => prev.map(b => b.id === id ? { ...b, ...updates, updatedAt: new Date() } : b));

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => 
        data.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
    }

    void optimisticCRUD.run(
      { type: 'update', data: { ...updates, id, userId: original.userId }, originalData: original },
      () => bankService.update(id, updates),
      {
        entityType: 'bank',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          setBanks(prev => prev.map(b => b.id === id ? original : b));
          // Rollback cache
          if (currentUser) {
            dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => 
              data.map((b) => (b.id === id ? original : b))
            );
          }
        },
      }
    );
  };

  const handleDeleteBank = async (id: string) => {
    const original = banks.find(b => b.id === id);
    if (!original) return;
    setBanks(prev => prev.filter(b => b.id !== id));

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => data.filter((b) => b.id !== id));
    }

    void optimisticCRUD.run(
      { type: 'delete', data: { id, userId: original.userId }, originalData: original },
      () => bankService.delete(id),
      {
        entityType: 'bank',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          setBanks(prev => [...prev, original]);
          // Rollback cache
          if (currentUser) {
            dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => [...data, original]);
          }
        },
      }
    );
  };

  const handleUpdateCard = async (id: string, updates: Partial<Card>) => {
    const originalCard = cards.find((c) => c.id === id);

    // Optimistic update
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => 
        data.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    }

    void optimisticCRUD.run(
      { type: 'update', data: { ...updates, id, userId: originalCard?.userId || currentUser?.uid }, originalData: originalCard },
      () => cardService.update(id, updates),
      {
        entityType: 'card',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (originalCard) {
            setCards((prev) =>
              prev.map((c) => (c.id === id ? originalCard : c))
            );
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => 
                data.map((c) => (c.id === id ? originalCard : c))
              );
            }
          }
        },
      }
    );
  };

  const handleDeleteCard = async (id: string) => {
    const cardToDelete = cards.find((c) => c.id === id);

    // Optimistic update
    setCards((prev) => prev.filter((c) => c.id !== id));

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => data.filter((c) => c.id !== id));
    }

    void optimisticCRUD.run(
      { type: 'delete', data: { id, userId: cardToDelete?.userId || currentUser?.uid }, originalData: cardToDelete },
      () => cardService.delete(id),
      {
        entityType: 'card',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (cardToDelete) {
            setCards((prev) => [...prev, cardToDelete]);
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => [...data, cardToDelete]);
            }
          }
        },
      }
    );
  };
  //#endregion

  //#region Event Handlers - E-Wallets
  const handleAddEWallet = async (walletData: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;

    const walletId = ewalletService.createId();
    const createPayload = { ...walletData, id: walletId, userId: currentUser.uid };
    const optimisticWallet: EWallet = {
      ...createPayload,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEWallets((prev) => [...prev, optimisticWallet]);

    // Update cache optimistically
    dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => [...data, optimisticWallet]);

    void optimisticCRUD.run(
      { type: 'create', data: createPayload },
      () => ewalletService.create(createPayload),
      {
        entityType: 'ewallet',
        retryToQueueOnFail: true,
        successMessage: t('eWalletAdded'),
        onSuccess: (result) => {
          // Replace temp e-wallet with real ID
          const newId = result as string;
          const realWallet: EWallet = {
            ...optimisticWallet,
            id: newId,
          };
          setEWallets((prev) => prev.map((w) => (w.id === walletId ? realWallet : w)));
          // Update cache with real ID
          dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => 
            data.map((w) => (w.id === walletId ? realWallet : w))
          );
        },
        onError: () => {
          setEWallets((prev) => prev.filter((w) => w.id !== walletId));
          // Rollback cache
          dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => data.filter((w) => w.id !== walletId));
        },
      }
    );
  };

  const handleUpdateEWallet = async (id: string, updates: Partial<EWallet>) => {
    const originalWallet = ewallets.find((w) => w.id === id);

    // Optimistic update
    setEWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w))
    );

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => 
        data.map((w) => (w.id === id ? { ...w, ...updates } : w))
      );
    }

    void optimisticCRUD.run(
      { type: 'update', data: { ...updates, id, userId: originalWallet?.userId || currentUser?.uid }, originalData: originalWallet },
      () => ewalletService.update(id, updates),
      {
        entityType: 'ewallet',
        retryToQueueOnFail: true,
        successMessage: t('eWalletUpdated'),
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (originalWallet) {
            setEWallets((prev) => prev.map((w) => (w.id === id ? originalWallet : w)));
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => 
                data.map((w) => (w.id === id ? originalWallet : w))
              );
            }
          }
        },
      }
    );
  };

  const handleDeleteEWallet = async (id: string) => {
    const walletToDelete = ewallets.find((w) => w.id === id);

    // Optimistic update
    setEWallets((prev) => prev.filter((w) => w.id !== id));

    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => data.filter((w) => w.id !== id));
    }

    void optimisticCRUD.run(
      { type: 'delete', data: { id, userId: walletToDelete?.userId || currentUser?.uid }, originalData: walletToDelete },
      () => ewalletService.delete(id),
      {
        entityType: 'ewallet',
        retryToQueueOnFail: true,
        successMessage: t('eWalletDeleted'),
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (walletToDelete) {
            setEWallets((prev) => [...prev, walletToDelete]);
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => [...data, walletToDelete]);
            }
          }
        },
      }
    );
  };
  //#endregion

  //#region Event Handlers - Feature Settings
  const handleUpdateFeatureSettings = async (
    enabledFeatures: FeatureTab[],
    tabFeatures?: FeatureTab[],
    hamburgerFeatures?: FeatureTab[]
  ) => {
    if (!currentUser) return;

    const originalSettings = featureSettings;

    // Optimistic update
    setFeatureSettings(
      originalSettings
        ? { ...originalSettings, enabledFeatures, tabFeatures, hamburgerFeatures, updatedAt: new Date() }
        : {
            userId: currentUser.uid,
            enabledFeatures,
            tabFeatures,
            hamburgerFeatures,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
    );

    void optimisticCRUD.run(
      { type: 'update', data: { userId: currentUser.uid, enabledFeatures, tabFeatures, hamburgerFeatures }, originalData: originalSettings },
      () => featureSettingsService.update(currentUser.uid, enabledFeatures, tabFeatures, hamburgerFeatures),
      {
        entityType: 'featureSettings',
        retryToQueueOnFail: true,
        successMessage: t('featuresUpdated'),
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalSettings) {
            setFeatureSettings(originalSettings);
          }
        },
      }
    );
  };

  const handleResetFeatureSettings = async () => {
    if (!currentUser) return;

    const originalSettings = featureSettings;
    setFeatureSettings((current) => current ? {
      ...current,
      enabledFeatures: [...DEFAULT_FEATURES],
      tabFeatures: [...DEFAULT_FEATURES],
      hamburgerFeatures: [...DEFAULT_FEATURES],
      updatedAt: new Date(),
    } : current);

    void optimisticCRUD.run(
      { type: 'update', data: { userId: currentUser.uid, reset: true }, originalData: originalSettings },
      () => featureSettingsService.resetToDefaults(currentUser.uid),
      {
        entityType: 'featureSettings',
        retryToQueueOnFail: true,
        successMessage: t('featuresReset'),
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalSettings) setFeatureSettings(originalSettings);
        },
      }
    );
  };

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel(expenses, categories);
  };

  const handleDownloadTemplate = () => {
    downloadExpenseTemplate();
  };

  const handleClearOfflineQueue = () => {
    offlineQueue.clear();
    showNotification('success', 'Offline queue cleared');
  };
  //#endregion

  //#region Import/Export Handlers
  const handleImportComplete = () => {
    // Reload data after import
    loadData();

    // Update import progress to complete using functional update
    setImportProgress(prev => {
      if (!prev) return null;

      const completedProgress = {
        ...prev,
        status: 'complete' as const,
        message: t('importComplete'),
        current: prev.total, // 確保顯示完成
      };

      // 3秒後自動關閉完成通知
      setTimeout(() => {
        setImportProgress(null);
      }, 3000);

      return completedProgress;
    });
  };

  // 開始後台匯入
  const handleStartBackgroundImport = (totalItems: number) => {
    const importId = `import-${Date.now()}`;
    setImportProgress({
      id: importId,
      current: 0,
      total: totalItems,
      message: t('startingImport'),
      status: 'importing',
    });
    // 關閉 modal，讓匯入在後台進行
    setShowImportModal(false);
  };

  // 更新匯入進度
  const handleUpdateImportProgress = (current: number, total: number, message: string) => {
    setImportProgress(prev => prev ? {
      ...prev,
      current,
      total,
      message,
    } : null);
  };

  // 匯入失敗
  const handleImportError = (errorMessage: string) => {
    setImportProgress(prev => {
      if (!prev) return null;

      return {
        ...prev,
        status: 'error' as const,
        message: errorMessage,
      };
    });
  };

  // 關閉匯入進度顯示
  const handleDismissImport = () => {
    setImportProgress(null);
  };

  // 關閉刪除進度顯示
  const handleDismissDelete = () => {
    setDeleteProgress(null);
  };

  // Calculate spending by category (with repayment deduction and billing cycle filtering)
  const getSpentByCategory = () => {
    // Calculate billing cycle period
    const now = new Date();
    const currentDay = now.getDate();
    let cycleStart: Date;
    let cycleEnd: Date;

    if (currentDay >= billingCycleDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
    }

    // Build repayment lookup map
    const repaymentsByExpense: { [expenseId: string]: number } = {};
    for (const rep of repayments) {
      repaymentsByExpense[rep.expenseId] = (repaymentsByExpense[rep.expenseId] || 0) + getRepaymentBaseAmount(rep);
    }

    // Helper to get net amount after repayments
    const getNetAmount = (exp: Expense): number => {
      const repaid = repaymentsByExpense[exp.id || ''] || 0;
      return Math.max(0, getExpenseBaseAmount(exp) - repaid);
    };

    const spent: { [key: string]: number } = {};
    expenses.forEach((exp) => {
      // Only count expenses within current billing cycle
      const expDate = new Date(exp.date);
      if (expDate >= cycleStart && expDate < cycleEnd) {
        if (!spent[exp.category]) {
          spent[exp.category] = 0;
        }
        spent[exp.category] += getNetAmount(exp);
      }
    });
    return spent;
  };
  //#endregion

  //#region Long Press Handlers
  // Handle long press on FAB to show radial date menu
  const handleLongPress = (target: HTMLElement) => {
    // Get the position for the radial menu
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    setRadialMenuPosition({ x, y });
    setShowRadialDateMenu(true);
  };

  // Handle regular click on FAB
  const handleFabClick = () => {
    openExpenseEntry();
  };

  // Handle date selection from radial menu
  const handleRadialDateSelect = (date: string) => {
    setShowRadialDateMenu(false);
    // Set the initial date for the expense form
    setExpensePeriod({ mode: 'day', anchorDate: date });
    // Open the appropriate expense form based on active tab
    if (activeTab === 'expenses') {
      setShowAddSheet(true);
    } else {
      setShowAddExpenseForm(true);
    }
  };

  //#endregion

  //#region Render
  return (
    <>
      <div className="dashboard-page max-w-7xl mx-auto min-h-screen px-2 sm:px-4">
      <div className="dashboard-header-modern">
        <div className="header-brand">
          <span className="header-logo">
            <span className="default-header-logo">💰</span>
            <CatIllustration variant="peek" className="cat-header-illustration" />
          </span>
          <div className="header-text">
            <h1 className="header-title">{t('appTitleShort')}</h1>
          </div>
        </div>

        <CompactNavigation
          features={navigationFeatures}
          activeTab={activeTab}
          labels={navigationLabels}
          navigationLabel={t('mainNavigation')}
          isMobile={isMobile}
          onNavigate={setActiveTab}
        />

        <div className="header-actions">
          <div className="header-currency-control">
            <DisplayCurrencyControl
              value={displayCurrency}
              onChange={handleDisplayCurrencyChange}
              disabled={!displayCurrencyReady}
            />
          </div>
          {/* Notification Bell */}
          <NotificationBell />
          {/* Hamburger Menu */}
          <div ref={hamburgerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              className="header-menu-btn"
              aria-label="Menu"
              aria-expanded={showHamburgerMenu}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {queueCount > 0 && (
                <span 
                  className="header-badge"
                  title={t('pendingUploads') || `${queueCount} pending uploads`}
                >
                  {queueCount}
                </span>
              )}
            </button>
            {showHamburgerMenu && (
              <div
                className="dashboard-menu-panel absolute right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-lg shadow-xl border py-2 z-[9999]"
                style={{
                  top: '100%',
                  minWidth: '240px',
                  maxWidth: 'calc(100vw - 16px)',
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                  {/* Network Status Section */}
                <div className="px-4 py-1 border-b border-gray-200">
                  <NetworkStatusIndicator />
                </div>

                  {/* Language Section */}
                <DashboardMenuSection
                  id="hamburger-language-section"
                  title="🌐 Language / 語言"
                  expanded={openLanguageSection}
                  onToggle={() => setOpenLanguageSection(open => !open)}
                  contentClassName="space-y-1"
                >
                      <button
                        onClick={() => {
                          setLanguage('en');
                          setShowHamburgerMenu(false);
                          setOpenLanguageSection(false);
                        }}
                        className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                          language === 'en' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        English
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('zh');
                          setShowHamburgerMenu(false);
                          setOpenLanguageSection(false);
                        }}
                        className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                          language === 'zh' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        繁體中文
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('zh-CN');
                          setShowHamburgerMenu(false);
                          setOpenLanguageSection(false);
                        }}
                        className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                          language === 'zh-CN' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        简体中文
                      </button>
                </DashboardMenuSection>

                {/* Appearance Section */}
                <DashboardMenuSection
                  id="hamburger-appearance-section"
                  title={`🎨 ${t('appearance')}`}
                  expanded={openAppearanceSection}
                  onToggle={() => setOpenAppearanceSection(open => !open)}
                  contentClassName="space-y-3"
                >
                      <ThemeToggle />
                      {/* Font Family */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1 px-4">{t('fontFamily')}</div>
                        <div className="space-y-1">
                          <button
                            onClick={() => setFontFamily('system')}
                            className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                              fontFamily === 'system' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {t('system')}
                          </button>
                          <button
                            onClick={() => setFontFamily('serif')}
                            className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors font-serif ${
                              fontFamily === 'serif' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {t('serif')}
                          </button>
                          <button
                            onClick={() => setFontFamily('mono')}
                            className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors font-mono ${
                              fontFamily === 'mono' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {t('mono')}
                          </button>
                        </div>
                      </div>

                      {/* Font Size */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1 px-4">{t('fontSize')}</div>
                        <div className="grid grid-cols-3 gap-2 px-4">
                          <button
                            onClick={() => setFontScale('small')}
                            className={`py-2 text-sm rounded border transition-colors flex items-center justify-center ${
                              fontScale === 'small' 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title={t('small')}
                          >
                            A-
                          </button>
                          <button
                            onClick={() => setFontScale('medium')}
                            className={`py-2 text-base rounded border transition-colors flex items-center justify-center ${
                              fontScale === 'medium' 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title={t('medium')}
                          >
                            A
                          </button>
                          <button
                            onClick={() => setFontScale('large')}
                            className={`py-2 text-lg rounded border transition-colors flex items-center justify-center ${
                              fontScale === 'large' 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title={t('large')}
                          >
                            A+
                          </button>
                        </div>
                      </div>
                </DashboardMenuSection>

                {/* Features Section - Collapsible */}
                <DashboardMenuSection
                  id="hamburger-features-section"
                  title={t('features') || 'Features'}
                  expanded={openFeaturesSection}
                  onToggle={() => setOpenFeaturesSection(open => !open)}
                  contentClassName="space-y-1"
                >
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setShowHamburgerMenu(false);
                          setOpenFeaturesSection(false);
                        }}
                        className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                          activeTab === 'settings' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {t('featureSettings')}
                      </button>
                      {(featureSettings?.hamburgerFeatures ?? featureSettings?.enabledFeatures ?? DEFAULT_FEATURES)
                        .map((feature) => {
                          const featureStr = feature as string;
                          return featureStr === 'cards' || featureStr === 'ewallets'
                            ? 'paymentMethods' as FeatureTab
                            : feature;
                        })
                        .filter((feature, index, array) => array.indexOf(feature) === index)
                        .filter((feature) => feature !== 'profile' && feature !== 'admin' && feature !== 'settings')
                        .map((feature) => {
                          const labelMap: Record<FeatureTab, string> = {
                            dashboard: t('dashboard'),
                            expenses: t('expenses'),
                            incomes: t('incomes'),
                            categories: t('categories'),
                            budgets: t('budgets'),
                            recurring: t('recurring'),
                            paymentMethods: t('paymentMethods'),
                            settings: t('featureSettings'),
                            profile: t('profile'),
                            admin: t('admin'),
                          };

                          return (
                            <button
                              key={feature}
                              onClick={() => {
                                setActiveTab(feature);
                                setShowHamburgerMenu(false);
                                setOpenFeaturesSection(false);
                              }}
                              className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                                activeTab === feature ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                              }`}
                              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                              {labelMap[feature]}
                            </button>
                          );
                        })}
                </DashboardMenuSection>

                {/* Import/Export Section */}
                <DashboardMenuSection
                  id="hamburger-importexport-section"
                  title="Import / Export"
                  expanded={openImportExportSection}
                  onToggle={() => setOpenImportExportSection(open => !open)}
                  contentClassName="space-y-1"
                >
                      <button
                        onClick={() => {
                          handleDownloadTemplate();
                          setShowHamburgerMenu(false);
                          setOpenImportExportSection(false);
                        }}
                        className="menu-item-hover w-full px-3 py-2 text-left text-sm text-gray-700 rounded transition-colors flex items-center gap-2"
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >

                        {t('template') || 'Download Template'}
                      </button>
                      <button
                        onClick={() => {
                          handleExportExcel();
                          setShowHamburgerMenu(false);
                          setOpenImportExportSection(false);
                        }}
                        className="menu-item-hover w-full px-3 py-2 text-left text-sm text-gray-700 rounded transition-colors flex items-center gap-2"
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >

                        {t('exportExcel') || 'Export to Excel'}
                      </button>
                      <button
                        onClick={() => {
                          setShowImportModal(true);
                          setShowHamburgerMenu(false);
                          setOpenImportExportSection(false);
                        }}
                        className="menu-item-hover w-full px-3 py-2 text-left text-sm text-gray-700 rounded transition-colors flex items-center gap-2"
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >

                        {t('import') || 'Import Data'}
                      </button>
                </DashboardMenuSection>

                {/* Offline Queue Status Section */}
                {queueCount > 0 && (
                  <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⚠️</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--warning-text)' }}>
                          {queueCount} {t('pendingUploads') || 'Pending Uploads'}
                        </span>
                      </div>
                      <p className="text-xs mb-3" style={{ color: 'var(--warning-text)' }}>
                        {t('pendingUploadsDesc') || 'Some changes are queued for upload. They will sync when connection is restored.'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (isUploadingQueue) return; // 防止重复点击

                            try {
                              // 乐观更新：立即显示处理中状态
                              setIsUploadingQueue(true);
                              showNotification('info', t('processing') || '处理中...', { duration: 0 });

                              const result = await syncService.syncOfflineQueue();
                              const remaining = offlineQueue.count();
                              setQueueCount(remaining);
                              if (remaining === 0) {
                                showNotification('success', t('syncSuccess') || '資料同步完成');
                                setShowHamburgerMenu(false);
                              } else if (result.failed > 0) {
                                showNotification('error', t('syncPartialFail') || '部分資料同步失敗，請檢查待同步項目。');
                              } else {
                                showNotification('info', t('pendingUploadsDesc') || '待同步資料會在網路恢復後繼續同步。');
                              }
                            } catch (error) {
                              console.error('Failed to retry upload:', error);
                              // 失败后恢复队列计数
                              setQueueCount(offlineQueue.count());
                              showNotification('error', t('errorSavingData') || '同步失败，请重试。');
                            } finally {
                              setIsUploadingQueue(false);
                            }
                          }}
                          disabled={isUploadingQueue}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                          style={{
                            backgroundColor: isUploadingQueue ? 'var(--disabled-bg)' : 'var(--accent-primary)',
                            color: isUploadingQueue ? 'var(--text-secondary)' : 'white',
                            border: 'none',
                            cursor: isUploadingQueue ? 'not-allowed' : 'pointer',
                            opacity: isUploadingQueue ? 0.6 : 1
                          }}
                        >
                          {isUploadingQueue ? (
                            <>
                              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{t('processing') || '处理中...'}</span>
                            </>
                          ) : (
                            <span>{t('retryUpload') || '重新上传'}</span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            handleClearOfflineQueue();
                            setShowHamburgerMenu(false);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors"
                          style={{
                            color: 'var(--error-text)',
                            backgroundColor: 'var(--error-bg)',
                            border: '1px solid var(--error-border)'
                          }}
                        >
                          {t('clearQueue') || 'Clear Queue'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile & Admin Section */}
                <div className="dashboard-menu-section-content dashboard-menu-account-section border-b border-gray-200 space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setShowHamburgerMenu(false);
                      }}
                      className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors flex items-center gap-2 ${
                        activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                      }`}
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >

                      {t('profile') || 'Profile'}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setActiveTab('admin');
                          setShowHamburgerMenu(false);
                        }}
                        className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors flex items-center gap-2 ${
                          activeTab === 'admin' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                        }`}
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >

                        {t('admin') || 'Admin'}
                      </button>
                    )}
                </div>

                {/* Logout */}
                <div className="dashboard-menu-section-content dashboard-menu-logout-section">
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowHamburgerMenu(false);
                    }}
                    className="menu-item-hover w-full px-3 py-2 text-left text-sm text-red-600 rounded transition-colors flex items-center gap-2 font-medium"
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t('logout') || 'Logout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 通知和匯入/刪除進度區域 - 固定在頂部 */}
      <HeaderStatusBar 
        importProgress={importProgress || undefined}
        deleteProgress={deleteProgress || undefined}
        onDismissImport={handleDismissImport}
        onDismissDelete={handleDismissDelete}
        isRevalidating={isRevalidating}
      />

      <div className="dashboard-card content-pad">
        {activeTab === 'dashboard' && (
          <CustomizableDashboard
            expenses={expenses}
            incomes={incomes}
            repayments={repayments}
            budgets={budgets}
            cards={cards}
            categories={orderedCategories}
            ewallets={ewallets}
            banks={banks}
            billingCycleDay={billingCycleDay}
            displayCurrency={displayCurrency}
            onMarkTrackingCompleted={handleMarkTrackingCompleted}
            onQuickAdd={() => openExpenseEntry()}
            onQuickExpenseAdd={handleQuickExpenseAdd}
            onQuickExpensePresetsChange={handleReloadQuickExpensePresets}
            onNavigateToExpenses={() => setActiveTab('expenses')}
            onNavigateToExpenseCategory={(category, startDate, endDate) => {
              setExpenseCategory(category);
              setExpensePeriod({ mode: 'range', anchorDate: endDate, startDate, endDate });
              setActiveTab('expenses');
            }}
            onNavigateToExpenseMonth={(month) => {
              setExpensePeriod({ mode: 'month', anchorDate: `${month}-01` });
              setActiveTab('expenses');
            }}
            onNavigateToExpense={(expenseId) => {
              setExpensePeriod((current) => ({ mode: 'all', anchorDate: current.anchorDate }));
              setFocusExpenseId(expenseId);
              setActiveTab('expenses');
              // Clear focus highlight after animation completes
              setTimeout(() => setFocusExpenseId(null), 2500);
            }}
            onNavigateToScheduledPayment={(scheduledPaymentId) => {
              setFocusScheduledPaymentId(scheduledPaymentId);
              setActiveTab('recurring');
            }}
            onNavigateToIncomes={() => setActiveTab('incomes')}
            onNavigateToBudgets={() => setActiveTab('budgets')}
            onNavigateToPaymentMethods={() => setActiveTab('paymentMethods')}
            onCustomizingChange={setIsDashboardCustomizing}
            scheduledPayments={scheduledPayments}
            scheduledPaymentRecords={scheduledPaymentRecords}
            onConfirmScheduledPayment={handleConfirmScheduledPayment}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={expenses}
            categories={orderedCategories}
            cards={cards}
            ewallets={ewallets}
            banks={banks}
            repayments={repayments}
            transfers={transfers}
            period={expensePeriod}
            onPeriodChange={setExpensePeriod}
            initialCategory={expenseCategory}
            displayCurrency={displayCurrency}
            onDelete={handleDeleteExpense}
            onInlineUpdate={handleInlineUpdateExpense}
            onBulkDelete={handleBulkDeleteExpenses}
            onReloadRepayments={reloadRepayments}
            onCreateCard={() => setActiveTab('paymentMethods')}
            onCreateEWallet={() => setActiveTab('paymentMethods')}
            onCreateBank={() => setActiveTab('paymentMethods')}
            onAddTransfer={handleAddTransfer}
            focusExpenseId={focusExpenseId || undefined}
            quickExpensePresets={quickExpensePresets}
            onQuickExpenseAdd={handleQuickExpenseAdd}
            onQuickExpensePresetsChange={handleReloadQuickExpensePresets}
            onManageQuickExpenses={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'incomes' && (
          <Suspense fallback={<></>}>
            <IncomesTab
              incomes={incomes}
              expenses={expenses}
              cards={cards}
              ewallets={ewallets}
              banks={banks}
              onAddIncome={handleAddIncome}
              onInlineUpdate={handleInlineUpdateIncome}
              onDeleteIncome={handleDeleteIncome}
              onOpenExpenseById={(id) => { setExpensePeriod((current) => ({ mode: 'all', anchorDate: current.anchorDate })); setActiveTab('expenses'); setFocusExpenseId(id); setTimeout(() => setFocusExpenseId(null), 2500); }}
            />
          </Suspense>
        )}

        {activeTab === 'categories' && (
          <div className="flex flex-col gap-4">
            <Suspense fallback={<></>}>
              <CategoryManager
                categories={orderedCategories}
                expenses={expenses}
                categoryCreationRequest={pendingCategoryCreationRequest}
                onCategoryCreationRequestHandled={(requestId) => {
                  setPendingCategoryCreationRequest((current) => current?.id === requestId ? null : current);
                }}
                onAdd={handleAddCategory}
                onUpdate={handleUpdateCategory}
                onDelete={handleDeleteCategory}
                onReorder={handleReorderCategories}
                onUpdateExpense={handleInlineUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="flex flex-col gap-4">
            <Suspense fallback={<></>}>
              <BudgetManager
                budgets={budgets}
                categories={orderedCategories}
                expenses={expenses}
                repayments={repayments}
                onAdd={handleAddBudget}
                onUpdate={handleUpdateBudget}
                onDelete={handleDeleteBudget}
                onCreateCategory={handleNavigateToCreateCategory}
                overallBudgetLimits={settings?.overallBudgetLimits}
                onSaveOverallBudgetLimit={handleSaveOverallBudgetLimit}
                spentByCategory={getSpentByCategory()}
                billingCycleDay={billingCycleDay}
                displayCurrency={displayCurrency}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'recurring' && (
          <Suspense fallback={<></>}>
            <ScheduledPaymentManager
              scheduledPayments={scheduledPayments}
              paymentRecords={scheduledPaymentRecords}
              categories={orderedCategories}
              banks={banks}
              cards={cards}
              ewallets={ewallets}
              onAdd={handleAddScheduledPayment}
              onUpdate={handleUpdateScheduledPayment}
              onDelete={handleDeleteScheduledPayment}
              onToggleActive={handleToggleScheduledPaymentActive}
              onConfirmPayment={handleConfirmScheduledPayment}
              onDeletePaymentRecord={handleDeleteScheduledPaymentRecord}
              getSummary={getScheduledPaymentSummary}
              isPeriodPaid={isScheduledPaymentPeriodPaid}
              focusPaymentId={focusScheduledPaymentId || undefined}
            />
          </Suspense>
        )}

        {activeTab === 'paymentMethods' && (
          <Suspense fallback={<></>}>
            <PaymentMethodsTab
              cards={cards}
              ewallets={ewallets}
              categories={orderedCategories}
              expenses={expenses}
              incomes={incomes}
              transfers={transfers}
              onAddCard={handleAddCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onAddEWallet={handleAddEWallet}
              onUpdateEWallet={handleUpdateEWallet}
              onDeleteEWallet={handleDeleteEWallet}
              banks={banks}
              onAddBank={handleAddBank}
              onUpdateBank={handleUpdateBank}
              onDeleteBank={handleDeleteBank}
              onAddTransfer={handleAddTransfer}
              onDeleteTransfer={handleDeleteTransfer}
            />
          </Suspense>
        )}

        {activeTab === 'settings' && featureSettings && (
          <div className="flex flex-col gap-4">
            <Suspense fallback={<></>}>
              <FeatureManager
                enabledFeatures={featureSettings.enabledFeatures}
                tabFeatures={featureSettings.tabFeatures}
                hamburgerFeatures={featureSettings.hamburgerFeatures}
                onUpdate={handleUpdateFeatureSettings}
                onReset={handleResetFeatureSettings}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'profile' && (
          <Suspense fallback={<></>}>
            <UserProfile />
          </Suspense>
        )}

        {activeTab === 'admin' && isAdmin && (
          <Suspense fallback={<></>}>
            <AdminTab />
          </Suspense>
        )}
      </div>

      {/* Persistent quick-add actions stay available at the lower left. */}
      {!shouldHideFab && (
        <FloatingExpenseActions
          isMobile={isMobile}
          addExpenseLabel={addExpenseLabel}
          scanReceiptLabel={receiptActionLabel}
          onAddExpense={handleFabClick}
          onScanReceipt={() => openExpenseEntry({ withReceipt: true })}
          onLongPress={handleLongPress}
        />
      )}
      {/* Radial Date Menu - shown on long press of FAB */}
      <RadialDateMenu
        isOpen={showRadialDateMenu}
        onClose={() => setShowRadialDateMenu(false)}
        onSelectDate={handleRadialDateSelect}
        position={radialMenuPosition}
        customShortcuts={dateShortcuts}
      />

      {/* Add Expense Bottom Sheet - for all tabs except expenses */}
      {activeTab !== 'expenses' && (
        <PopupModal
          isOpen={showAddExpenseForm}
          onClose={closeExpenseEntry}
          title={t('addNewExpense')}
          hideHeader={true}
          chromeless={true}
          hideFooter={true}
          maxWidth="700px"
        >
          <StepByStepExpenseForm
            key={receiptEntryKey}
            onSubmit={(data) => {
              const result = handleAddExpense(data);
              closeExpenseEntry();
              return result;
            }}
            onSubmitAndAddAnother={async (data) => {
              const result = await handleAddExpense(data);
              // Don't close modal - form will reset itself
              return result;
            }}
            onCancel={closeExpenseEntry}
            startAtReceiptStep={startReceiptEntry}
            categories={orderedCategories}
            recentExpenses={expenses}
            cards={cards}
            ewallets={ewallets}
            banks={banks}
            onCreateEWallet={() => {
              closeExpenseEntry();
              setActiveTab('paymentMethods');
            }}
            onCreateCard={() => {
              closeExpenseEntry();
              setActiveTab('paymentMethods');
            }}
            onCreateBank={() => {
              closeExpenseEntry();
              setActiveTab('paymentMethods');
            }}
            onAddTransfer={handleAddTransfer}
            initialDate={expensePeriod.anchorDate}
            dateFormat={dateFormat}
            timeFormat={timeFormat}
            lastUsedCurrency={lastUsedCurrency}
          />
        </PopupModal>
      )}

      {/* Import/Export Modal */}
      {currentUser && (
        <ImportExportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          userId={currentUser.uid}
          existingCategories={orderedCategories}
          onImportComplete={handleImportComplete}
          onStartBackgroundImport={handleStartBackgroundImport}
          onUpdateProgress={handleUpdateImportProgress}
          onImportError={handleImportError}
        />
      )}
    </div>
      {/* Bottom Sheet for adding expense */}
      {activeTab === 'expenses' && (
        <PopupModal
          isOpen={showAddSheet}
          onClose={closeExpenseEntry}
          title={t('addNewExpense')}
          hideHeader={true}
          chromeless={true}
          hideFooter={true}
          maxWidth="700px"
        >
          <StepByStepExpenseForm
            key={receiptEntryKey}
            onSubmit={(data) => {
              const result = handleAddExpense(data);
              closeExpenseEntry();
              return result;
            }}
            onSubmitAndAddAnother={async (data) => {
              const result = await handleAddExpense(data);
              // Don't close modal - form will reset itself
              return result;
            }}
            onCancel={closeExpenseEntry}
            startAtReceiptStep={startReceiptEntry}
            categories={orderedCategories}
            recentExpenses={expenses}
            cards={cards}
            ewallets={ewallets}
            banks={banks}
            onAddTransfer={handleAddTransfer}
            onCreateEWallet={() => {
              closeExpenseEntry();
              setActiveTab('paymentMethods');
            }}
            onCreateCard={() => {
              closeExpenseEntry();
              setActiveTab('paymentMethods');
            }}
            onCreateBank={() => {
              closeExpenseEntry();
              setActiveTab('paymentMethods');
            }}
            initialDate={expensePeriod.mode === 'day' ? expensePeriod.anchorDate : undefined}
            dateFormat={dateFormat}
            timeFormat={timeFormat}
            lastUsedCurrency={lastUsedCurrency}
          />
        </PopupModal>
      )}
    </>
  );
};

export default Dashboard;
