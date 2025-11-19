import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOptimisticCRUD } from '../hooks/useOptimisticCRUD';
import { Expense, Category, Budget, RecurringExpense, Income, Card, EWallet, FeatureSettings, FeatureTab, DEFAULT_FEATURES, Repayment } from '../types';
import { expenseService } from '../services/expenseService';
import { categoryService } from '../services/categoryService';
import { budgetService } from '../services/budgetService';
import { recurringExpenseService } from '../services/recurringExpenseService';
import { incomeService } from '../services/incomeService';
import { cardService } from '../services/cardService';
import { adminService } from '../services/adminService';
import { ewalletService } from '../services/ewalletService';
import { featureSettingsService } from '../services/featureSettingsService';
import { repaymentService } from '../services/repaymentService';
import { userSettingsService } from '../services/userSettingsService';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseList from '../components/expenses/ExpenseList';
import CategoryManager from '../components/categories/CategoryManager';
import BudgetManager from '../components/budgets/BudgetManager';
import RecurringExpenseManager from '../components/recurring/RecurringExpenseManager';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import CardsSummary from '../components/dashboard/CardsSummary';
import IncomesTab from './tabs/IncomesTab';
import AdminTab from './tabs/AdminTab';
import UserProfile from './UserProfile';
import FeatureManager from '../components/settings/FeatureManager';
import PaymentMethodsTab from '../components/payment/PaymentMethodsTab';
import { downloadExpenseTemplate, exportToExcel } from '../utils/importExportUtils';
import ImportExportModal from '../components/importexport/ImportExportModal';
import InlineLoading from '../components/InlineLoading';
import HeaderStatusBar from '../components/HeaderStatusBar';
import ThemeToggle from '../components/ThemeToggle';
import { offlineQueue } from '../utils/offlineQueue';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [ewallets, setEWallets] = useState<EWallet[]>([]);
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings | null>(null);
  const [billingCycleDay, setBillingCycleDay] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState(true);
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
      await categoryService.initializeDefaults(currentUser.uid);
      
      // Check if user is admin
      const adminStatus = await adminService.isAdmin(currentUser.uid);
      setIsAdmin(adminStatus);
      
      // Load user settings
      const userSettings = await userSettingsService.getOrCreate(currentUser.uid);
      setBillingCycleDay(userSettings.billingCycleDay);
      
      const [expensesData, incomesData, categoriesData, budgetsData, recurringData, repaymentsData] = await Promise.all([
        expenseService.getAll(currentUser.uid),
        incomeService.getAll(currentUser.uid),
        categoryService.getAll(currentUser.uid),
        budgetService.getAll(currentUser.uid),
        recurringExpenseService.getAll(currentUser.uid),
        repaymentService.getAll(currentUser.uid),
      ]);

      setExpenses(expensesData);
      setIncomes(incomesData);
      setCategories(categoriesData);
      setBudgets(budgetsData);
      setRecurringExpenses(recurringData);
      setRepayments(repaymentsData);
      
      // Load cards separately with error handling to prevent breaking existing functionality
      try {
        const cardsData = await cardService.getAll(currentUser.uid);
        setCards(cardsData);
        
        // Save unique bank names to localStorage for autocomplete
        const bankNames = [...new Set(cardsData.map(card => card.bankName).filter(Boolean) as string[])];
        if (bankNames.length > 0) {
          localStorage.setItem('cardBankNames', JSON.stringify(bankNames));
        }
      } catch (cardError) {
        console.warn('Could not load cards. This is normal if cards collection rules are not set up yet:', cardError);
        setCards([]);
      }
      
      // Load e-wallets with error handling
      try {
        await ewalletService.initializeDefaults(currentUser.uid);
        const ewalletsData = await ewalletService.getAll(currentUser.uid);
        setEWallets(ewalletsData);
      } catch (ewalletError) {
        console.warn('Could not load e-wallets:', ewalletError);
        setEWallets([]);
      }
      
      // Load feature settings with error handling
      try {
        const settingsData = await featureSettingsService.getOrCreate(currentUser.uid);
        setFeatureSettings(settingsData);
      } catch (settingsError) {
        console.warn('Could not load feature settings:', settingsError);
        setFeatureSettings(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('error', t('errorLoadingData'));
    } finally {
      setInitialLoading(false);
    }
  }, [currentUser, showNotification, t]);
  //#endregion

  //#region Budget Notifications
  // Budget notifications check
  useEffect(() => {
    if (!budgets.length || !expenses.length) return;

    // Check budgets once when data is loaded
    const checkBudgets = async () => {
      const { checkBudgetAlerts } = await import('../utils/budgetNotifications');
      const lastChecked = localStorage.getItem('lastBudgetCheck');
      const lastCheckedDate = lastChecked ? new Date(lastChecked) : null;
      
      const alerts = checkBudgetAlerts(budgets, expenses, lastCheckedDate);
      
      if (alerts.length > 0) {
        // Show notifications for each alert
        alerts.forEach(alert => {
          showNotification(alert.type, alert.message, { duration: 8000 });
        });
        
        // Update last check time
        localStorage.setItem('lastBudgetCheck', new Date().toISOString());
      }
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

    await optimisticCRUD.run(
      { type: 'create', data: expenseData },
      () => expenseService.create({ ...expenseData, userId: currentUser.uid }),
      {
        entityType: 'expense',
        retryToQueueOnFail: true,
        onSuccess: () => {
          // Replace temp expense with real data
          loadData();
        },
        onError: () => {
          // Rollback optimistic update
          setExpenses((prev) => prev.filter((e) => e.id !== tempId));
        },
      }
    );
  };



  const handleDeleteExpense = async (id: string) => {
    const expenseToDelete = expenses.find((e) => e.id === id);
    
    // Optimistic update: remove expense
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: expenseToDelete },
      () => expenseService.delete(id),
      {
        entityType: 'expense',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          // Rollback optimistic update
          if (expenseToDelete) {
            setExpenses((prev) => [expenseToDelete, ...prev]);
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

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalExpense },
      () => expenseService.update(id, updates),
      {
        entityType: 'expense',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalExpense) {
            setExpenses((prev) => prev.map((e) => (e.id === id ? originalExpense : e)));
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

    await optimisticCRUD.run(
      { type: 'create', data: categoryData },
      () => categoryService.create({ ...categoryData, userId: currentUser.uid }),
      {
        entityType: 'category',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          setCategories((prev) => prev.filter((c) => c.id !== tempId));
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

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalCategory },
      () => categoryService.update(id, updates),
      {
        entityType: 'category',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalCategory) {
            setCategories((prev) =>
              prev.map((c) => (c.id === id ? originalCategory : c))
            );
          }
        },
      }
    );
  };

  const handleDeleteCategory = async (id: string) => {
    const categoryToDelete = categories.find((c) => c.id === id);
    
    // Optimistic update
    setCategories((prev) => prev.filter((c) => c.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: categoryToDelete },
      () => categoryService.delete(id),
      {
        entityType: 'category',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (categoryToDelete) {
            setCategories((prev) => [...prev, categoryToDelete]);
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

    await optimisticCRUD.run(
      { type: 'create', data: budgetData },
      () => budgetService.create({ ...budgetData, userId: currentUser.uid }),
      {
        entityType: 'budget',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          setBudgets((prev) => prev.filter((b) => b.id !== tempId));
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

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalBudget },
      () => budgetService.update(id, updates),
      {
        entityType: 'budget',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalBudget) {
            setBudgets((prev) =>
              prev.map((b) => (b.id === id ? originalBudget : b))
            );
          }
        },
      }
    );
  };

  const handleDeleteBudget = async (id: string) => {
    const budgetToDelete = budgets.find((b) => b.id === id);
    
    // Optimistic update
    setBudgets((prev) => prev.filter((b) => b.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: budgetToDelete },
      () => budgetService.delete(id),
      {
        entityType: 'budget',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (budgetToDelete) {
            setBudgets((prev) => [...prev, budgetToDelete]);
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

    await optimisticCRUD.run(
      { type: 'create', data: recurringData },
      () => recurringExpenseService.create({ ...recurringData, userId: currentUser.uid }),
      {
        entityType: 'recurring',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          setRecurringExpenses((prev) => prev.filter((r) => r.id !== tempId));
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

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalRecurring },
      () => recurringExpenseService.update(id, updates),
      {
        entityType: 'recurring',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalRecurring) {
            setRecurringExpenses((prev) =>
              prev.map((r) => (r.id === id ? originalRecurring : r))
            );
          }
        },
      }
    );
  };

  const handleDeleteRecurring = async (id: string) => {
    const recurringToDelete = recurringExpenses.find((r) => r.id === id);
    
    // Optimistic update
    setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: recurringToDelete },
      () => recurringExpenseService.delete(id),
      {
        entityType: 'recurring',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (recurringToDelete) {
            setRecurringExpenses((prev) => [...prev, recurringToDelete]);
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

    await optimisticCRUD.run(
      { type: 'update', data: { isActive }, originalData: originalRecurring },
      () => recurringExpenseService.toggleActive(id, isActive),
      {
        entityType: 'recurring',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalRecurring) {
            setRecurringExpenses((prev) =>
              prev.map((r) => (r.id === id ? originalRecurring : r))
            );
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

    await optimisticCRUD.run(
      { type: 'create', data: incomeData },
      () => incomeService.create({ ...incomeData, userId: currentUser.uid }),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          setIncomes((prev) => prev.filter((i) => i.id !== tempId));
        },
      }
    );
  };

  const handleInlineUpdateIncome = async (id: string, updates: Partial<Income>) => {
    const originalIncome = incomes.find((i) => i.id === id);
    
    // Optimistic update
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalIncome },
      () => incomeService.update(id, updates),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalIncome) {
            setIncomes((prev) => prev.map((i) => (i.id === id ? originalIncome : i)));
          }
        },
      }
    );
  };

  const handleDeleteIncome = async (id: string) => {
    const incomeToDelete = incomes.find((i) => i.id === id);
    
    // Optimistic update
    setIncomes((prev) => prev.filter((i) => i.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: incomeToDelete },
      () => incomeService.delete(id),
      {
        entityType: 'income',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (incomeToDelete) {
            setIncomes((prev) => [...prev, incomeToDelete]);
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

    await optimisticCRUD.run(
      { type: 'create', data: cardData },
      () => cardService.create({ ...cardData, userId: currentUser.uid }),
      {
        entityType: 'card',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          setCards((prev) => prev.filter((c) => c.id !== tempId));
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

    await optimisticCRUD.run(
      { type: 'update', data: updates, originalData: originalCard },
      () => cardService.update(id, updates),
      {
        entityType: 'card',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (originalCard) {
            setCards((prev) =>
              prev.map((c) => (c.id === id ? originalCard : c))
            );
          }
        },
      }
    );
  };

  const handleDeleteCard = async (id: string) => {
    const cardToDelete = cards.find((c) => c.id === id);
    
    // Optimistic update
    setCards((prev) => prev.filter((c) => c.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: cardToDelete },
      () => cardService.delete(id),
      {
        entityType: 'card',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          if (cardToDelete) {
            setCards((prev) => [...prev, cardToDelete]);
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

    await optimisticCRUD.run(
      { type: 'create', data: walletData },
      () => ewalletService.create({ ...walletData, userId: currentUser.uid }),
      {
        entityType: 'category', // Using category type as ewallet is similar
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
          showNotification('success', t('eWalletAdded'));
        },
        onError: () => {
          setEWallets((prev) => prev.filter((w) => w.id !== tempId));
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

    await optimisticCRUD.run(
      { type: 'update', data: { id, updates }, originalData: originalWallet },
      () => ewalletService.update(id, updates),
      {
        entityType: 'category', // Using category type as ewallet is similar
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
          showNotification('success', t('eWalletUpdated'));
        },
        onError: () => {
          if (originalWallet) {
            setEWallets((prev) => prev.map((w) => (w.id === id ? originalWallet : w)));
          }
        },
      }
    );
  };

  const handleDeleteEWallet = async (id: string) => {
    const walletToDelete = ewallets.find((w) => w.id === id);

    // Optimistic update
    setEWallets((prev) => prev.filter((w) => w.id !== id));

    await optimisticCRUD.run(
      { type: 'delete', data: { id }, originalData: walletToDelete },
      () => ewalletService.delete(id),
      {
        entityType: 'category', // Using category type as ewallet is similar
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
          showNotification('success', t('eWalletDeleted'));
        },
        onError: () => {
          if (walletToDelete) {
            setEWallets((prev) => [...prev, walletToDelete]);
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
        onSuccess: () => {
          loadData();
          showNotification('success', t('featuresUpdated'));
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
        onSuccess: () => {
          loadData();
          showNotification('success', t('featuresReset'));
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
      <div className="dashboard-card dashboard-header relative mb-8" style={{ 
        paddingTop: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
      }}>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-white mb-1 truncate">{t('appTitle')}</h1>
          <p className="text-sm text-white/90 truncate">
            {t('welcome')}, {getDisplayName(currentUser)}
          </p>
        </div>

        <div className="header-actions">
          {/* Hamburger Menu */}
          <div ref={hamburgerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              className="p-3 hover:bg-white/20 rounded-lg transition-colors relative"
              aria-label="Menu"
              aria-expanded={showHamburgerMenu}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {queueCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
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
                  top: '100%',
                  transform: isMobile ? undefined : 'translateX(calc(-100% + 32px))',
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
                  <div className="px-4 py-2 border-b border-gray-200">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-orange-600 text-lg">⚠️</span>
                        <span className="text-sm font-semibold text-orange-800">
                          {queueCount} {t('pendingUploads') || 'Pending Uploads'}
                        </span>
                      </div>
                      <p className="text-xs text-orange-700 mb-2">
                        {t('pendingUploadsDesc') || 'Some changes are queued for upload. They will sync when connection is restored.'}
                      </p>
                      <button
                        onClick={() => {
                          handleClearOfflineQueue();
                          setShowHamburgerMenu(false);
                        }}
                        className="w-full mt-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-300 rounded transition-colors font-medium"
                      >
                        {t('clearQueue') || 'Clear Queue'}
                      </button>
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
          <div className="flex flex-col gap-6">
            <DashboardSummary 
              expenses={expenses} 
              incomes={incomes} 
              repayments={repayments}
              billingCycleDay={billingCycleDay}
              onMarkTrackingCompleted={handleMarkTrackingCompleted}
            />
            {cards.length > 0 && (
              <CardsSummary cards={cards} categories={categories} expenses={expenses} />
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-4">
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('expenseHistory')}</h2>
            <ExpenseList
              expenses={expenses}
              categories={categories}
              cards={cards}
              ewallets={ewallets}
              repayments={repayments}
              onDelete={handleDeleteExpense}
              onInlineUpdate={handleInlineUpdateExpense}
              onBulkDelete={handleBulkDeleteExpenses}
              onReloadRepayments={reloadRepayments}
              focusExpenseId={focusExpenseId || undefined}
            />
          </div>
        )}

        {activeTab === 'incomes' && (
          <IncomesTab
            incomes={incomes}
            expenses={expenses}
            onAddIncome={handleAddIncome}
            onInlineUpdate={handleInlineUpdateIncome}
            onDeleteIncome={handleDeleteIncome}
            onOpenExpenseById={(id) => { setActiveTab('expenses'); setFocusExpenseId(id); setTimeout(() => setFocusExpenseId(null), 2500); }}
          />
        )}

        {activeTab === 'categories' && (
          <div className="flex flex-col gap-4">
            <CategoryManager
              categories={categories}
              expenses={expenses}
              onAdd={handleAddCategory}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
              onUpdateExpense={handleInlineUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="flex flex-col gap-4">
            <BudgetManager
              budgets={budgets}
              categories={categories}
              onAdd={handleAddBudget}
              onUpdate={handleUpdateBudget}
              onDelete={handleDeleteBudget}
              spentByCategory={getSpentByCategory()}
            />
          </div>
        )}

        {activeTab === 'recurring' && (
          <div className="flex flex-col gap-4">
            <RecurringExpenseManager
              recurringExpenses={recurringExpenses}
              categories={categories}
              cards={cards}
              onAdd={handleAddRecurring}
              onUpdate={handleUpdateRecurring}
              onDelete={handleDeleteRecurring}
              onToggleActive={handleToggleRecurring}
            />
          </div>
        )}

        {activeTab === 'paymentMethods' && (
          <PaymentMethodsTab
            cards={cards}
            ewallets={ewallets}
            categories={categories}
            expenses={expenses}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            onAddEWallet={handleAddEWallet}
            onUpdateEWallet={handleUpdateEWallet}
            onDeleteEWallet={handleDeleteEWallet}
          />
        )}

        {activeTab === 'settings' && featureSettings && (
          <div className="flex flex-col gap-4">
            <FeatureManager
              enabledFeatures={featureSettings.enabledFeatures}
              tabFeatures={featureSettings.tabFeatures}
              hamburgerFeatures={featureSettings.hamburgerFeatures}
              onUpdate={handleUpdateFeatureSettings}
              onReset={handleResetFeatureSettings}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <UserProfile />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminTab />
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
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t('addExpense')}</h3>
                  <button
                    aria-label="Close"
                    onClick={() => setShowAddExpenseForm(false)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.3 5.71L12 12.01 5.7 5.71 4.29 7.12l6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.29 6.3 1.42-1.41-6.3-6.3 6.3-6.3-1.41-1.41z" fill="var(--text-secondary)"/>
                    </svg>
                  </button>
                </div>
                <ExpenseForm
                  onSubmit={(data) => {
                    handleAddExpense(data);
                    setShowAddExpenseForm(false);
                  }}
                  onCancel={() => setShowAddExpenseForm(false)}
                  categories={categories}
                  cards={cards}
                  ewallets={ewallets}
                  onCreateEWallet={() => {
                    setShowAddExpenseForm(false);
                    setActiveTab('paymentMethods');
                  }}
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
          className="floating-btn-hover text-white"
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
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t('addExpense')}</h3>
                  <button
                    aria-label="Close"
                    onClick={() => setShowAddSheet(false)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.3 5.71L12 12.01 5.7 5.71 4.29 7.12l6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.29 6.3 1.42-1.41-6.3-6.3 6.3-6.3-1.41-1.41z" fill="var(--text-secondary)"/>
                    </svg>
                  </button>
                </div>
                <ExpenseForm
                  onSubmit={(data) => { handleAddExpense(data); setShowAddSheet(false); }}
                  onCancel={() => setShowAddSheet(false)}
                  categories={categories}
                  cards={cards}
                  ewallets={ewallets}
                  onCreateEWallet={() => {
                    setShowAddSheet(false);
                    setActiveTab('paymentMethods');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  floatingButton: {
    position: 'fixed' as const,
    bottom: '24px',
    left: '24px',
    padding: '16px 24px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
    zIndex: 9999,
    transition: 'all 0.3s ease',
  },
};
//#endregion

export default Dashboard;
