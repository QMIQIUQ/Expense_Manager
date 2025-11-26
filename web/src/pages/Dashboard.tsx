import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOptimisticCRUD } from '../hooks/useOptimisticCRUD';
import { Expense, Category, Budget, RecurringExpense, Income, Card, EWallet, FeatureSettings, FeatureTab, DEFAULT_FEATURES, Repayment, Bank, Transfer } from '../types';
import { QuickExpensePreset } from '../types/quickExpense';
import { expenseService } from '../services/expenseService';
import { categoryService } from '../services/categoryService';
import { budgetService } from '../services/budgetService';
import { recurringExpenseService } from '../services/recurringExpenseService';
import { incomeService } from '../services/incomeService';
import { cardService } from '../services/cardService';
import { bankService } from '../services/bankService';
import { adminService } from '../services/adminService';
import { ewalletService } from '../services/ewalletService';
import { featureSettingsService } from '../services/featureSettingsService';
import { repaymentService } from '../services/repaymentService';
import { userSettingsService } from '../services/userSettingsService';
import { transferService } from '../services/transferService';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseList from '../components/expenses/ExpenseList';
import CustomizableDashboard from '../components/dashboard/CustomizableDashboard';
import InlineLoading from '../components/InlineLoading';

// Lazy load heavy components
const CategoryManager = lazy(() => import('../components/categories/CategoryManager'));
const BudgetManager = lazy(() => import('../components/budgets/BudgetManager'));
const RecurringExpenseManager = lazy(() => import('../components/recurring/RecurringExpenseManager'));
const IncomesTab = lazy(() => import('./tabs/IncomesTab'));
const AdminTab = lazy(() => import('./tabs/AdminTab'));
const UserProfile = lazy(() => import('./UserProfile'));
const FeatureManager = lazy(() => import('../components/settings/FeatureManager'));
const PaymentMethodsTab = lazy(() => import('../components/payment/PaymentMethodsTab'));
import { downloadExpenseTemplate, exportToExcel } from '../utils/importExportUtils';
import ImportExportModal from '../components/importexport/ImportExportModal';
import HeaderStatusBar from '../components/HeaderStatusBar';
import ThemeToggle from '../components/ThemeToggle';
import { offlineQueue } from '../utils/offlineQueue';
import { dataService } from '../services/dataService';
import { networkStatus } from '../utils/networkStatus';
import NetworkStatusIndicator from '../components/NetworkStatusIndicator';

//#region Helper Functions
// Helper function to get display name
const getDisplayName = (user: { displayName?: string | null; email?: string | null } | null): string => {
  if (!user) return '';
  if (user.displayName) return user.displayName;
  if (user.email) {
    const emailPrefix = user.email.split('@')[0];
    return emailPrefix || user.email;
  }
  return '';
};
//#endregion

const Dashboard: React.FC = () => {
  //#region State and Hooks
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { t, language, setLanguage } = useLanguage();
  const { fontFamily, setFontFamily, fontScale, setFontScale } = useTheme();
  const optimisticCRUD = useOptimisticCRUD();

  const [activeTab, setActiveTab] = useState<FeatureTab>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [ewallets, setEWallets] = useState<EWallet[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings | null>(null);
  const [billingCycleDay, setBillingCycleDay] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  // Collapsible sections inside hamburger
  const [openLanguageSection, setOpenLanguageSection] = useState(false);
  const [openAppearanceSection, setOpenAppearanceSection] = useState(false);
  const [openImportExportSection, setOpenImportExportSection] = useState(false);
  const [openFeaturesSection, setOpenFeaturesSection] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showImportExportDropdown, setShowImportExportDropdown] = useState(false);
  const [focusExpenseId, setFocusExpenseId] = useState<string | null>(null);
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
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const languageRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLDivElement | null>(null);
  const importExportRef = useRef<HTMLDivElement | null>(null);
  // Reactive mobile breakpoint (updates on window resize)
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 768);
  //#endregion
  
  //#region Effects
  // Track offline queue count
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
      // Phase 1: Load cached data first (instant display)
      console.log('Phase 1: Loading cached data...');
      const [expensesData, incomesData, categoriesData, budgetsData, recurringData, repaymentsData, transfersData] = await Promise.all([
        dataService.getDataWithRevalidate('expenses', currentUser.uid, () => expenseService.getAll(currentUser.uid), setExpenses),
        dataService.getDataWithRevalidate('incomes', currentUser.uid, () => incomeService.getAll(currentUser.uid), setIncomes),
        dataService.getDataWithRevalidate('categories', currentUser.uid, () => categoryService.getAll(currentUser.uid), setCategories),
        dataService.getDataWithRevalidate('budgets', currentUser.uid, () => budgetService.getAll(currentUser.uid), setBudgets),
        dataService.getDataWithRevalidate('recurring', currentUser.uid, () => recurringExpenseService.getAll(currentUser.uid), setRecurringExpenses),
        dataService.getDataWithRevalidate('repayments', currentUser.uid, () => repaymentService.getAll(currentUser.uid), setRepayments),
        dataService.getDataWithRevalidate('transfers', currentUser.uid, () => transferService.getAll(currentUser.uid), setTransfers),
      ]);

      // Set initial data (from cache or fresh)
      setExpenses(expensesData);
      setIncomes(incomesData);
      setCategories(categoriesData);
      setBudgets(budgetsData);
      setRecurringExpenses(recurringData);
      setRepayments(repaymentsData);
      setTransfers(transfersData);
      
      // End initial loading immediately
      setInitialLoading(false);
      console.log('Phase 1 complete: UI ready with cached data');
      
      // Phase 2: Initialize and load additional data in background (only if online)
      if (networkStatus.isOnline) {
        console.log('Phase 2: Background initialization and updates...');
        setIsRevalidating(true);
        
        // Batch all background tasks to complete together
        Promise.all([
          // Initialize defaults in background
          categoryService.initializeDefaults(currentUser.uid).catch(err => {
            console.warn('Background category init failed:', err);
            return null;
          }),
          
          // Check admin status
          adminService.isAdmin(currentUser.uid).catch(err => {
            console.warn('Admin check failed:', err);
            return false;
          }),
          
          // Load user settings
          userSettingsService.getOrCreate(currentUser.uid).catch(err => {
            console.warn('User settings load failed:', err);
            return { billingCycleDay: 1 };
          }),
          
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
        ]).then(([_catInit, adminStatus, userSettings, cardsData, ewalletsData, banksData, featSettings]) => {
          // Apply all state updates together (single render cycle)
          if (typeof adminStatus === 'boolean') setIsAdmin(adminStatus);
          if (userSettings) setBillingCycleDay(userSettings.billingCycleDay);
          if (Array.isArray(cardsData) && cardsData.length > 0) {
            setCards(cardsData);
            const bankNames = [...new Set(cardsData.map(card => card.bankName).filter(Boolean) as string[])];
            if (bankNames.length > 0) {
              localStorage.setItem('cardBankNames', JSON.stringify(bankNames));
            }
          }
          if (Array.isArray(ewalletsData) && ewalletsData.length > 0) setEWallets(ewalletsData);
          if (Array.isArray(banksData) && banksData.length > 0) {
            setBanks(banksData);
            const bankNames = [...new Set(banksData.map(b => b.name).filter(Boolean))];
            if (bankNames.length > 0) {
              localStorage.setItem('cardBankNames', JSON.stringify(bankNames));
            }
          }
          if (featSettings) setFeatureSettings(featSettings);
        }).finally(() => {
          setIsRevalidating(false);
          console.log('Phase 2: Background initialization complete');
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('error', t('errorLoadingData'));
      setInitialLoading(false);
    }
  }, [currentUser, showNotification, t]);
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
      
      const alerts = checkBudgetAlerts(budgets, expenses, lastCheckedDate);
      
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
  }, [budgets, expenses, showNotification]);
  //#endregion

  //#region Data Refresh Functions
  // Function to reload only repayments (for performance)
  const reloadRepayments = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const repaymentsData = await repaymentService.getAll(currentUser.uid);
      setRepayments(repaymentsData);
    } catch (error) {
      console.error('Failed to reload repayments:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Smart tab refresh: Reload data when switching tabs
  useEffect(() => {
    if (!currentUser) return;
    
    const refreshTabData = async () => {
      try {
        switch (activeTab) {
          case 'expenses': {
            // Reload expenses and repayments
            const [expensesData, repaymentsData] = await Promise.all([
              expenseService.getAll(currentUser.uid),
              repaymentService.getAll(currentUser.uid),
            ]);
            setExpenses(expensesData);
            setRepayments(repaymentsData);
            break;
          }
          case 'incomes': {
            // Reload incomes
            const incomesData = await incomeService.getAll(currentUser.uid);
            setIncomes(incomesData);
            break;
          }
          case 'dashboard': {
            // Reload all for dashboard
            const [dashExpenses, dashIncomes, dashRepayments] = await Promise.all([
              expenseService.getAll(currentUser.uid),
              incomeService.getAll(currentUser.uid),
              repaymentService.getAll(currentUser.uid),
            ]);
            setExpenses(dashExpenses);
            setIncomes(dashIncomes);
            setRepayments(dashRepayments);
            break;
          }
          case 'categories': {
            // Reload categories and budgets
            const [categoriesData, budgetsData] = await Promise.all([
              categoryService.getAll(currentUser.uid),
              budgetService.getAll(currentUser.uid),
            ]);
            setCategories(categoriesData);
            setBudgets(budgetsData);
            break;
          }
          case 'recurring': {
            // Reload recurring expenses
            const recurringData = await recurringExpenseService.getAll(currentUser.uid);
            setRecurringExpenses(recurringData);
            break;
          }
          case 'paymentMethods': {
            // Reload cards and ewallets
            try {
              const cardsData = await cardService.getAll(currentUser.uid);
              setCards(cardsData);
            } catch (error) {
              console.warn('Could not reload cards:', error);
            }
            try {
              const ewalletsData = await ewalletService.getAll(currentUser.uid);
              setEWallets(ewalletsData);
            } catch (error) {
              console.warn('Could not reload e-wallets:', error);
            }
            break;
          }
          // Admin and settings tabs don't need auto-refresh
          default:
            break;
        }
      } catch (error) {
        console.error('Error refreshing tab data:', error);
        // Silent fail - don't show notification to avoid annoying users
      }
    };
    
    // Don't refresh on initial mount, only on tab change
    if (!initialLoading) {
      refreshTabData();
    }
  }, [activeTab, currentUser, initialLoading]);
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
  //#endregion

  //#region UI State Flags
  // Centralized flag to hide Floating Action Button when any popout/modal/menu is open
  const shouldHideFab =
    showHamburgerMenu ||
    showLanguageMenu ||
    showImportExportDropdown ||
    showImportModal ||
    showAddSheet ||
    showAddExpenseForm;
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
  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;
    
    // Optimistic update: add temporary expense
    const tempId = `temp-${Date.now()}`;
    const optimisticExpense: Expense = {
      ...expenseData,
      id: tempId,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setExpenses((prev) => [optimisticExpense, ...prev]);
    
    // Update cache optimistically
    dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => [optimisticExpense, ...data]);

    await optimisticCRUD.run(
      { type: 'create', data: expenseData },
      () => expenseService.create({ ...expenseData, userId: currentUser.uid }),
      {
        entityType: 'expense',
        retryToQueueOnFail: true,
        onSuccess: (result) => {
          // Replace temp expense with real ID
          const newId = result as string;
          const realExpense: Expense = {
            ...optimisticExpense,
            id: newId,
          };
          setExpenses((prev) => prev.map((e) => (e.id === tempId ? realExpense : e)));
          // Update cache with real ID
          dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => 
            data.map((e) => (e.id === tempId ? realExpense : e))
          );
        },
        onError: () => {
          // Rollback optimistic update
          setExpenses((prev) => prev.filter((e) => e.id !== tempId));
          // Rollback cache
          dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => data.filter((e) => e.id !== tempId));
        },
      }
    );
  };

  // Handle quick expense add from preset
  const handleQuickExpenseAdd = async (preset: QuickExpensePreset) => {
    if (!currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);
    
    // Find category name from categoryId
    const category = categories.find(c => c.id === preset.categoryId);
    const categoryName = category?.name || '';
    
    // Find e-wallet name if ewalletId is set
    const ewallet = preset.ewalletId ? ewallets.find(w => w.id === preset.ewalletId) : null;
    
    // Build expense data, excluding undefined fields (Firebase doesn't accept undefined)
    const expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      description: preset.name,
      amount: preset.amount,
      category: categoryName,
      date: today,
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
    const expenseToDelete = expenses.find((e) => e.id === id);
    
    // Optimistic update: remove expense
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    
    // Update cache optimistically
    dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => data.filter((e) => e.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: expenseToDelete },
      () => expenseService.delete(id),
      {
        entityType: 'expense',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          // Rollback optimistic update
          if (expenseToDelete) {
            setExpenses((prev) => [expenseToDelete, ...prev]);
            // Rollback cache
            dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => [expenseToDelete, ...data]);
          }
        },
      }
    );
  };

  // Inline update by id (used by ExpenseList inline editing)
  const handleInlineUpdateExpense = async (id: string, updates: Partial<Expense>) => {
    const originalExpense = expenses.find((e) => e.id === id);

    // Optimistic update
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    
    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => 
        data.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    }

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalExpense },
      () => expenseService.update(id, updates),
      {
        entityType: 'expense',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (originalExpense) {
            // Rollback state
            setExpenses((prev) => prev.map((e) => (e.id === id ? originalExpense : e)));
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<Expense[]>('expenses', currentUser.uid, (data) => 
                data.map((e) => (e.id === id ? originalExpense : e))
              );
            }
          }
        },
      }
    );
  };

  // Mark tracking as completed
  const handleMarkTrackingCompleted = async (id: string) => {
    await handleInlineUpdateExpense(id, { repaymentTrackingCompleted: true });
  };

  // Bulk delete expenses (from ExpenseList multi-select)
  const handleBulkDeleteExpenses = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    const originals = expenses.filter((e) => ids.includes(e.id!));

    // Optimistic update: remove selected expenses
    setExpenses((prev) => prev.filter((e) => !ids.includes(e.id!)));

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
    
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const original = originals.find((o) => o.id === id);
      
      try {
        const result = await optimisticCRUD.run(
          { type: 'delete', data: { id }, originalData: original },
          () => expenseService.delete(id),
          {
            entityType: 'expense',
            retryToQueueOnFail: true,
            suppressNotification: true,
            onSuccess: () => {},
            onError: () => {
              // Rollback the specific failed deletion
              if (original) {
                setExpenses((prev) => [original!, ...prev]);
              }
            },
          }
        );
        
        if (result === null) {
          failCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        failCount++;
        // Rollback on error
        if (original) {
          setExpenses((prev) => [original!, ...prev]);
        }
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

    // Refresh to ensure server state is in sync
    loadData();
  };
  //#endregion

  //#region Event Handlers - Categories
  const handleAddCategory = async (categoryData: Omit<Category, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticCategory: Category = {
      ...categoryData,
      id: tempId,
      userId: currentUser.uid,
      createdAt: new Date(),
    };
    setCategories((prev) => [...prev, optimisticCategory]);
    
    // Update cache optimistically
    dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => [...data, optimisticCategory]);

    await optimisticCRUD.run(
      { type: 'create', data: categoryData },
      () => categoryService.create({ ...categoryData, userId: currentUser.uid }),
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
          setCategories((prev) => prev.map((c) => (c.id === tempId ? realCategory : c)));
          // Update cache with real ID
          dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => 
            data.map((c) => (c.id === tempId ? realCategory : c))
          );
        },
        onError: () => {
          setCategories((prev) => prev.filter((c) => c.id !== tempId));
          // Rollback cache
          dataService.updateCache<Category[]>('categories', currentUser.uid, (data) => data.filter((c) => c.id !== tempId));
        },
      }
    );
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

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalCategory },
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

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: categoryToDelete },
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
  const handleAddBudget = async (budgetData: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticBudget: Budget = {
      ...budgetData,
      id: tempId,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setBudgets((prev) => [...prev, optimisticBudget]);
    
    // Update cache optimistically
    dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => [...data, optimisticBudget]);

    await optimisticCRUD.run(
      { type: 'create', data: budgetData },
      () => budgetService.create({ ...budgetData, userId: currentUser.uid }),
      {
        entityType: 'budget',
        retryToQueueOnFail: true,
        onSuccess: (result) => {
          // Replace temp budget with real ID
          const newId = result as string;
          const realBudget: Budget = {
            ...optimisticBudget,
            id: newId,
          };
          setBudgets((prev) => prev.map((b) => (b.id === tempId ? realBudget : b)));
          // Update cache with real ID
          dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => 
            data.map((b) => (b.id === tempId ? realBudget : b))
          );
        },
        onError: () => {
          setBudgets((prev) => prev.filter((b) => b.id !== tempId));
          // Rollback cache
          dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => data.filter((b) => b.id !== tempId));
        },
      }
    );
  };

  const handleUpdateBudget = async (id: string, updates: Partial<Budget>) => {
    const originalBudget = budgets.find((b) => b.id === id);
    
    // Optimistic update
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    
    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => 
        data.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
    }

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalBudget },
      () => budgetService.update(id, updates),
      {
        entityType: 'budget',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (originalBudget) {
            setBudgets((prev) =>
              prev.map((b) => (b.id === id ? originalBudget : b))
            );
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => 
                data.map((b) => (b.id === id ? originalBudget : b))
              );
            }
          }
        },
      }
    );
  };

  const handleDeleteBudget = async (id: string) => {
    const budgetToDelete = budgets.find((b) => b.id === id);
    
    // Optimistic update
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    
    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Budget[]>('budgets', currentUser.uid, (data) => data.filter((b) => b.id !== id));
    }

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: budgetToDelete },
      () => budgetService.delete(id),
      {
        entityType: 'budget',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
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
  };
  //#endregion

  //#region Event Handlers - Recurring Expenses
  const handleAddRecurring = async (recurringData: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticRecurring: RecurringExpense = {
      ...recurringData,
      id: tempId,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setRecurringExpenses((prev) => [...prev, optimisticRecurring]);
    
    // Update cache optimistically
    dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => [...data, optimisticRecurring]);

    await optimisticCRUD.run(
      { type: 'create', data: recurringData },
      () => recurringExpenseService.create({ ...recurringData, userId: currentUser.uid }),
      {
        entityType: 'recurring',
        retryToQueueOnFail: true,
        onSuccess: (result) => {
          // Replace temp recurring expense with real ID
          const newId = result as string;
          const realRecurring: RecurringExpense = {
            ...optimisticRecurring,
            id: newId,
          };
          setRecurringExpenses((prev) => prev.map((r) => (r.id === tempId ? realRecurring : r)));
          // Update cache with real ID
          dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => 
            data.map((r) => (r.id === tempId ? realRecurring : r))
          );
        },
        onError: () => {
          setRecurringExpenses((prev) => prev.filter((r) => r.id !== tempId));
          // Rollback cache
          dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => data.filter((r) => r.id !== tempId));
        },
      }
    );
  };

  const handleUpdateRecurring = async (id: string, updates: Partial<RecurringExpense>) => {
    const originalRecurring = recurringExpenses.find((r) => r.id === id);
    
    // Optimistic update
    setRecurringExpenses((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    
    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => 
        data.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    }

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalRecurring },
      () => recurringExpenseService.update(id, updates),
      {
        entityType: 'recurring',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (originalRecurring) {
            setRecurringExpenses((prev) =>
              prev.map((r) => (r.id === id ? originalRecurring : r))
            );
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => 
                data.map((r) => (r.id === id ? originalRecurring : r))
              );
            }
          }
        },
      }
    );
  };

  const handleDeleteRecurring = async (id: string) => {
    const recurringToDelete = recurringExpenses.find((r) => r.id === id);
    
    // Optimistic update
    setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
    
    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => data.filter((r) => r.id !== id));
    }

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: recurringToDelete },
      () => recurringExpenseService.delete(id),
      {
        entityType: 'recurring',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (recurringToDelete) {
            setRecurringExpenses((prev) => [...prev, recurringToDelete]);
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => [...data, recurringToDelete]);
            }
          }
        },
      }
    );
  };

  const handleToggleRecurring = async (id: string, isActive: boolean) => {
    const originalRecurring = recurringExpenses.find((r) => r.id === id);
    
    // Optimistic update
    setRecurringExpenses((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive } : r))
    );
    
    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => 
        data.map((r) => (r.id === id ? { ...r, isActive } : r))
      );
    }

    await optimisticCRUD.run(
      { type: 'update', data: { isActive }, originalData: originalRecurring },
      () => recurringExpenseService.toggleActive(id, isActive),
      {
        entityType: 'recurring',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
        onError: () => {
          if (originalRecurring) {
            setRecurringExpenses((prev) =>
              prev.map((r) => (r.id === id ? originalRecurring : r))
            );
            // Rollback cache
            if (currentUser) {
              dataService.updateCache<RecurringExpense[]>('recurring', currentUser.uid, (data) => 
                data.map((r) => (r.id === id ? originalRecurring : r))
              );
            }
          }
        },
      }
    );
  };
  //#endregion

  //#region Event Handlers - Incomes
  const handleAddIncome = async (incomeData: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticIncome: Income = {
      ...incomeData,
      id: tempId,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setIncomes((prev) => [optimisticIncome, ...prev]);
    
    // Update cache optimistically
    dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => [optimisticIncome, ...data]);

    await optimisticCRUD.run(
      { type: 'create', data: incomeData },
      () => incomeService.create({ ...incomeData, userId: currentUser.uid }),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: (result) => {
          // Replace temp income with real ID
          const newId = result as string;
          const realIncome: Income = {
            ...optimisticIncome,
            id: newId,
          };
          setIncomes((prev) => prev.map((i) => (i.id === tempId ? realIncome : i)));
          // Update cache with real ID
          dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => 
            data.map((i) => (i.id === tempId ? realIncome : i))
          );
        },
        onError: () => {
          setIncomes((prev) => prev.filter((i) => i.id !== tempId));
          // Rollback cache
          dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => data.filter((i) => i.id !== tempId));
        },
      }
    );
  };

  const handleInlineUpdateIncome = async (id: string, updates: Partial<Income>) => {
    const originalIncome = incomes.find((i) => i.id === id);
    
    // Optimistic update
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    
    // Update cache optimistically
    if (currentUser) {
      dataService.updateCache<Income[]>('incomes', currentUser.uid, (data) => 
        data.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
    }

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalIncome },
      () => incomeService.update(id, updates),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
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

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: incomeToDelete },
      () => incomeService.delete(id),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Cache already updated optimistically, no need to reload
        },
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
  const handleAddTransfer = async (transferData: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticTransfer: Transfer = {
      ...transferData,
      id: tempId,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTransfers((prev) => [optimisticTransfer, ...prev]);

    await optimisticCRUD.run(
      { type: 'create', data: transferData },
      () => transferService.create({ ...transferData, userId: currentUser.uid }),
      {
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
          showNotification('success', 'Transfer added successfully');
        },
        onError: () => {
          setTransfers((prev) => prev.filter((t) => t.id !== tempId));
        },
      }
    );
  };

  const handleDeleteTransfer = async (id: string) => {
    const transferToDelete = transfers.find((t) => t.id === id);
    
    // Optimistic update
    setTransfers((prev) => prev.filter((t) => t.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: transferToDelete },
      () => transferService.delete(id),
      {
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
          showNotification('success', 'Transfer deleted successfully');
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
    const tempId = `temp-${Date.now()}`;
    const optimisticCard: Card = {
      ...cardData,
      id: tempId,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCards((prev) => [optimisticCard, ...prev]);
    
    // Update cache optimistically
    dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => [optimisticCard, ...data]);

    await optimisticCRUD.run(
      { type: 'create', data: cardData },
      () => cardService.create({ ...cardData, userId: currentUser.uid }),
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
          setCards((prev) => prev.map((c) => (c.id === tempId ? realCard : c)));
          // Update cache with real ID
          dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => 
            data.map((c) => (c.id === tempId ? realCard : c))
          );
        },
        onError: () => {
          setCards((prev) => prev.filter((c) => c.id !== tempId));
          // Rollback cache
          dataService.updateCache<Card[]>('cards', currentUser.uid, (data) => data.filter((c) => c.id !== tempId));
        },
      }
    );
  };

  // Banks CRUD
  const handleAddBank = async (bankData: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;
    const tempId = `temp-${Date.now()}`;
    const optimisticBank: Bank = { ...bankData, id: tempId, userId: currentUser.uid, createdAt: new Date(), updatedAt: new Date() };
    setBanks(prev => [...prev, optimisticBank]);
    
    // Update cache optimistically
    dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => [...data, optimisticBank]);

    await optimisticCRUD.run(
      { type: 'create', data: bankData },
      () => bankService.create({ ...bankData, userId: currentUser.uid }),
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
          setBanks((prev) => prev.map((b) => (b.id === tempId ? realBank : b)));
          // Update cache with real ID
          dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => 
            data.map((b) => (b.id === tempId ? realBank : b))
          );
        },
        onError: () => {
          setBanks(prev => prev.filter(b => b.id !== tempId));
          // Rollback cache
          dataService.updateCache<Bank[]>('banks', currentUser.uid, (data) => data.filter((b) => b.id !== tempId));
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

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: original },
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

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: original },
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

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalCard },
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

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: cardToDelete },
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

    const tempId = `temp-${Date.now()}`;
    const optimisticWallet: EWallet = {
      ...walletData,
      id: tempId,
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEWallets((prev) => [...prev, optimisticWallet]);
    
    // Update cache optimistically
    dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => [...data, optimisticWallet]);

    await optimisticCRUD.run(
      { type: 'create', data: walletData },
      () => ewalletService.create({ ...walletData, userId: currentUser.uid }),
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
          setEWallets((prev) => prev.map((w) => (w.id === tempId ? realWallet : w)));
          // Update cache with real ID
          dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => 
            data.map((w) => (w.id === tempId ? realWallet : w))
          );
        },
        onError: () => {
          setEWallets((prev) => prev.filter((w) => w.id !== tempId));
          // Rollback cache
          dataService.updateCache<EWallet[]>('ewallets', currentUser.uid, (data) => data.filter((w) => w.id !== tempId));
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

    await optimisticCRUD.run(
      { type: 'update', data: { id, updates }, originalData: originalWallet },
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

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: walletToDelete },
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

    await optimisticCRUD.run(
      { type: 'update', data: { enabledFeatures, tabFeatures, hamburgerFeatures }, originalData: originalSettings },
      () => featureSettingsService.update(currentUser.uid, enabledFeatures, tabFeatures, hamburgerFeatures),
      {
        entityType: 'budget', // Using budget type as settings is configuration-like
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

    await optimisticCRUD.run(
      { type: 'update', data: {} },
      () => featureSettingsService.resetToDefaults(currentUser.uid),
      {
        entityType: 'budget', // Using budget type as settings is configuration-like
        retryToQueueOnFail: true,
        successMessage: t('featuresReset'),
        onSuccess: () => {
          loadData();
        },
        onError: () => {},
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

  // Calculate spending by category
  const getSpentByCategory = () => {
    const spent: { [key: string]: number } = {};
    expenses.forEach((exp) => {
      if (!spent[exp.category]) {
        spent[exp.category] = 0;
      }
      spent[exp.category] += exp.amount;
    });
    return spent;
  };
  //#endregion

  //#region Render
  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <InlineLoading size={24} />
        <p className="ml-3 text-lg text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto min-h-screen px-2 sm:px-4">
      <div className="dashboard-header-modern">
        <div className="header-brand">
          <span className="header-logo">💰</span>
          <div className="header-text">
            <h1 className="header-title">{t('appTitleShort')}</h1>
            <p className="header-subtitle">
              {t('welcome')}, {getDisplayName(currentUser)}
            </p>
          </div>
        </div>

        <div className="header-actions">
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
                className="absolute right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-lg shadow-xl border py-2 z-[9999]"
                style={{
                  minWidth: '240px',
                  maxWidth: '90vw',
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                  {/* Language Section */}
                <div className="px-4 py-2 border-b border-gray-200">
                  <button
                    className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 uppercase tracking-wide"
                    onClick={() => setOpenLanguageSection(o => !o)}
                    aria-expanded={openLanguageSection}
                    aria-controls="hamburger-language-section"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <span> 🌐 Language / 語言</span>
                    <svg
                      className={`transition-transform ${openLanguageSection ? 'rotate-90' : ''}`}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path d="M8 5l8 7-8 7" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {openLanguageSection && (
                    <div id="hamburger-language-section" className="mt-2 space-y-1">
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
                    </div>
                  )}
                </div>

                {/* Appearance Section */}
                <div className="px-4 py-2 border-b border-gray-200">
                  <button
                    className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 uppercase tracking-wide"
                    onClick={() => setOpenAppearanceSection(o => !o)}
                    aria-expanded={openAppearanceSection}
                    aria-controls="hamburger-appearance-section"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <span> 🎨 {t('appearance')}</span>
                    <svg
                      className={`transition-transform ${openAppearanceSection ? 'rotate-90' : ''}`}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path d="M8 5l8 7-8 7" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {openAppearanceSection && (
                    <div id="hamburger-appearance-section" className="mt-2 space-y-3">
                      {/* Font Family */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1 px-1">{t('fontFamily')}</div>
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
                        <div className="text-xs text-gray-500 mb-1 px-1">{t('fontSize')}</div>
                        <div className="grid grid-cols-3 gap-2 px-1">
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
                    </div>
                  )}
                </div>                {/* Features Section - Collapsible */}
                <div className="px-4 py-2 border-b border-gray-200">
                  <button
                    className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 uppercase tracking-wide"
                    onClick={() => setOpenFeaturesSection(o => !o)}
                    aria-expanded={openFeaturesSection}
                    aria-controls="hamburger-features-section"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <span>{t('features') || 'Features'}</span>
                    <svg
                      className={`transition-transform ${openFeaturesSection ? 'rotate-90' : ''}`}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path d="M8 5l8 7-8 7" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {openFeaturesSection && (
                    <div id="hamburger-features-section" className="mt-2 space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setShowHamburgerMenu(false);
                          setOpenFeaturesSection(false);
                        }}
                        className={`menu-item-hover w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                          activeTab === 'settings'
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700'
                        }`}
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {t('featureSettings')}
                      </button>
                      {(featureSettings?.hamburgerFeatures || featureSettings?.enabledFeatures || DEFAULT_FEATURES)
                        .map((feature) => {
                          const featureStr = feature as string;
                          if (featureStr === 'cards' || featureStr === 'ewallets') {
                            return 'paymentMethods' as FeatureTab;
                          }
                          return feature;
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
                                activeTab === feature
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-700'
                              }`}
                              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                              {labelMap[feature]}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Import/Export Section */}
                <div className="px-4 py-2 border-b border-gray-200">
                  <button
                    className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 uppercase tracking-wide"
                    onClick={() => setOpenImportExportSection(o => !o)}
                    aria-expanded={openImportExportSection}
                    style={{ whiteSpace: 'nowrap' }}
                    aria-controls="hamburger-importexport-section"
                  >
                    <span>Import / Export</span>
                    <svg
                      className={`transition-transform ${openImportExportSection ? 'rotate-90' : ''}`}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path d="M8 5l8 7-8 7" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {openImportExportSection && (
                    <div id="hamburger-importexport-section" className="mt-2 space-y-1">
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
                    </div>
                  )}
                </div>

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
                              
                              // 模拟清除队列显示（乐观更新）
                              setQueueCount(0);
                              
                              // 实际重新加载数据，触发同步
                              await loadData();
                              
                              // 成功后显示通知
                              showNotification('success', t('queueCleared') || '数据同步成功');
                              setShowHamburgerMenu(false);
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
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="space-y-1">
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
                </div>

                {/* Theme Toggle */}
                <div className="px-4 py-2 border-t border-gray-200">
                  <ThemeToggle />
                </div>

                {/* Logout */}
                <div className="px-4 py-2">
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

      <div className="dashboard-card dashboard-tabs" style={{ marginTop: '1rem' }}>
        {/* Dynamically render tabs based on enabled features (use tabFeatures if available, fallback to enabledFeatures) */}
        {(featureSettings?.tabFeatures || featureSettings?.enabledFeatures || DEFAULT_FEATURES)
          .map((feature) => {
            // Migrate old feature names to new ones
            const featureStr = feature as string;
            if (featureStr === 'cards' || featureStr === 'ewallets') {
              return 'paymentMethods' as FeatureTab;
            }
            return feature;
          })
          .filter((feature, index, array) => {
            // Remove duplicates (e.g., both 'cards' and 'ewallets' -> 'paymentMethods')
            return array.indexOf(feature) === index;
          })
          .map((feature) => {
            // Skip profile and admin from main tabs (they're in hamburger menu)
            if (feature === 'profile' || feature === 'admin') return null;
            
            // Map feature to display label
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
                onClick={() => setActiveTab(feature)}
                className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
                  activeTab === feature ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                {labelMap[feature]}
              </button>
            );
          })}
      </div>

      <div className="dashboard-card content-pad">
        {activeTab === 'dashboard' && (
          <CustomizableDashboard
            expenses={expenses}
            incomes={incomes}
            repayments={repayments}
            budgets={budgets}
            cards={cards}
            categories={categories}
            ewallets={ewallets}
            banks={banks}
            billingCycleDay={billingCycleDay}
            onMarkTrackingCompleted={handleMarkTrackingCompleted}
            onQuickAdd={() => setShowAddExpenseForm(true)}
            onQuickExpenseAdd={handleQuickExpenseAdd}
          />
        )}

        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-4">
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('expenseHistory')}</h2>
            <ExpenseList
              expenses={expenses}
              categories={categories}
              cards={cards}
              ewallets={ewallets}
              banks={banks}
              repayments={repayments}
              onDelete={handleDeleteExpense}
              onInlineUpdate={handleInlineUpdateExpense}
              onBulkDelete={handleBulkDeleteExpenses}
              onReloadRepayments={reloadRepayments}
              onCreateCard={() => setActiveTab('paymentMethods')}
              onCreateEWallet={() => setActiveTab('paymentMethods')}
              onAddTransfer={handleAddTransfer}
              focusExpenseId={focusExpenseId || undefined}
            />
          </div>
        )}

        {activeTab === 'incomes' && (
          <Suspense fallback={<InlineLoading />}>
            <IncomesTab
              incomes={incomes}
              expenses={expenses}
              cards={cards}
              ewallets={ewallets}
              banks={banks}
              onAddIncome={handleAddIncome}
              onInlineUpdate={handleInlineUpdateIncome}
              onDeleteIncome={handleDeleteIncome}
              onOpenExpenseById={(id) => { setActiveTab('expenses'); setFocusExpenseId(id); setTimeout(() => setFocusExpenseId(null), 2500); }}
            />
          </Suspense>
        )}

        {activeTab === 'categories' && (
          <div className="flex flex-col gap-4">
            <Suspense fallback={<InlineLoading />}>
              <CategoryManager
                categories={categories}
                expenses={expenses}
                onAdd={handleAddCategory}
                onUpdate={handleUpdateCategory}
                onDelete={handleDeleteCategory}
                onUpdateExpense={handleInlineUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="flex flex-col gap-4">
            <Suspense fallback={<InlineLoading />}>
              <BudgetManager
                budgets={budgets}
                categories={categories}
                onAdd={handleAddBudget}
                onUpdate={handleUpdateBudget}
                onDelete={handleDeleteBudget}
                spentByCategory={getSpentByCategory()}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'recurring' && (
          <div className="flex flex-col gap-4">
            <Suspense fallback={<InlineLoading />}>
              <RecurringExpenseManager
                recurringExpenses={recurringExpenses}
                categories={categories}
                banks={banks}
                cards={cards}
                onAdd={handleAddRecurring}
                onUpdate={handleUpdateRecurring}
                onDelete={handleDeleteRecurring}
                onToggleActive={handleToggleRecurring}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'paymentMethods' && (
          <Suspense fallback={<InlineLoading />}>
            <PaymentMethodsTab
              cards={cards}
              ewallets={ewallets}
              categories={categories}
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
            <Suspense fallback={<InlineLoading />}>
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
          <Suspense fallback={<InlineLoading />}>
            <UserProfile />
          </Suspense>
        )}

        {activeTab === 'admin' && isAdmin && (
          <Suspense fallback={<InlineLoading />}>
            <AdminTab />
          </Suspense>
        )}
      </div>

      {/* Floating Add Expense Button - unified: desktop shows expanded, mobile shows icon only */}
      {activeTab !== 'expenses' && !showAddExpenseForm && !shouldHideFab && (
        <button
          onClick={() => setShowAddExpenseForm(true)}
          style={{
            ...styles.floatingButton,
            width: isMobile ? '56px' : 'auto',
            height: '56px',
            padding: isMobile ? '0' : '16px 24px',
            borderRadius: isMobile ? '50%' : '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '0' : '8px',
            fontSize: isMobile ? '28px' : '16px',
            fontWeight: isMobile ? 500 : 600,
          }}
          className="floating-btn-hover"
          title={t('addNewExpense')}
          aria-label={t('addNewExpense')}
        >
          {/* Plus icon unified */}
          <svg
            width={isMobile ? 28 : 20}
            height={isMobile ? 28 : 20}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" />
          </svg>
          {!isMobile && <span style={{ lineHeight: 1 }}>{t('addNewExpense')}</span>}
        </button>
      )}

      {/* Add Expense Bottom Sheet - for all tabs except expenses */}
      {showAddExpenseForm && activeTab !== 'expenses' && (
        <div
          className="fixed inset-0 z-[9998]"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAddExpenseForm(false)}
          />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto w-full max-w-7xl">
              <div style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                borderTop: '1px solid var(--border-color)',
                padding: '12px 16px',
                maxHeight: '85vh',
                overflowY: 'auto'
              }}>

                <ExpenseForm
                  onSubmit={(data) => {
                    handleAddExpense(data);
                    setShowAddExpenseForm(false);
                  }}
                  onCancel={() => setShowAddExpenseForm(false)}
                  categories={categories}
                  cards={cards}
                  ewallets={ewallets}
                  banks={banks}
                  onCreateEWallet={() => {
                    setShowAddExpenseForm(false);
                    setActiveTab('paymentMethods');
                  }}
                  onCreateCard={() => {
                    setShowAddExpenseForm(false);
                    setActiveTab('paymentMethods');
                  }}
                  onAddTransfer={handleAddTransfer}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      {currentUser && (
        <ImportExportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          userId={currentUser.uid}
          existingCategories={categories}
          onImportComplete={handleImportComplete}
          onStartBackgroundImport={handleStartBackgroundImport}
          onUpdateProgress={handleUpdateImportProgress}
          onImportError={handleImportError}
        />
      )}
    </div>
      {/* Floating Add button visible on Expenses tab (responsive like others) */}
      {activeTab === 'expenses' && !showAddSheet && !shouldHideFab && (
        <button
          aria-label={t('addNewExpense')}
          onClick={() => setShowAddSheet(true)}
          style={{
            ...styles.floatingButton,
            width: isMobile ? '56px' : 'auto',
            height: '56px',
            padding: isMobile ? '0' : '16px 24px',
            borderRadius: isMobile ? '50%' : '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '0' : '8px',
            fontSize: isMobile ? '28px' : '16px',
            fontWeight: isMobile ? 500 : 600,
          }}
          className="floating-btn-hover"
          title={t('addNewExpense')}
        >
          <svg
            width={isMobile ? 28 : 20}
            height={isMobile ? 28 : 20}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" />
          </svg>
          {!isMobile && <span style={{ lineHeight: 1 }}>{t('addNewExpense')}</span>}
        </button>
      )}

      {/* Bottom Sheet for adding expense */}
      {activeTab === 'expenses' && showAddSheet && (
        <div
          className="fixed inset-0 z-[9998]"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAddSheet(false)}
          />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto w-full max-w-7xl">
              <div style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                borderTop: '1px solid var(--border-color)',
                padding: '12px 16px',
                maxHeight: '85vh',
                overflowY: 'auto'
              }}>
                <ExpenseForm
                  onSubmit={(data) => { handleAddExpense(data); setShowAddSheet(false); }}
                  onCancel={() => setShowAddSheet(false)}
                  categories={categories}
                  cards={cards}
                  ewallets={ewallets}
                  banks={banks}
                  onAddTransfer={handleAddTransfer}
                  onCreateEWallet={() => {
                    setShowAddSheet(false);
                    setActiveTab('paymentMethods');
                  }}
                  onCreateCard={() => {
                    setShowAddSheet(false);
                    setActiveTab('paymentMethods');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Network Status Indicator */}
      <NetworkStatusIndicator />
    </>
  );
};

const styles = {
  floatingButton: {
    position: 'fixed' as const,
    bottom: '24px',
    left: '24px',
    padding: '16px 24px',
    background: 'var(--tab-active-bg)',
    color: 'var(--tab-active-text)',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    boxShadow: 'var(--purple-glow-strong)',
    zIndex: 9999,
    transition: 'all 0.3s ease',
  },
};
//#endregion

export default Dashboard;
