import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useOptimisticCRUD } from '../hooks/useOptimisticCRUD';
import { Expense, Category, Budget, RecurringExpense } from '../types';
import { expenseService } from '../services/expenseService';
import { categoryService } from '../services/categoryService';
import { budgetService } from '../services/budgetService';
import { recurringExpenseService } from '../services/recurringExpenseService';
import { adminService } from '../services/adminService';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseList from '../components/expenses/ExpenseList';
import CategoryManager from '../components/categories/CategoryManager';
import BudgetManager from '../components/budgets/BudgetManager';
import RecurringExpenseManager from '../components/recurring/RecurringExpenseManager';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import AdminTab from './tabs/AdminTab';
import UserProfile from './UserProfile';
import { downloadExpenseTemplate, exportToExcel } from '../utils/importExportUtils';
import ImportExportModal from '../components/importexport/ImportExportModal';
import InlineLoading from '../components/InlineLoading';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { t, language, setLanguage } = useLanguage();
  const optimisticCRUD = useOptimisticCRUD();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'categories' | 'budgets' | 'recurring' | 'profile' | 'admin'>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showImportExportDropdown, setShowImportExportDropdown] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const languageRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLDivElement | null>(null);
  const importExportRef = useRef<HTMLDivElement | null>(null);
  const isMobile = window.innerWidth <= 768;

  const loadData = React.useCallback(async () => {
    if (!currentUser) return;

    try {
      await categoryService.initializeDefaults(currentUser.uid);
      
      // Check if user is admin
      const adminStatus = await adminService.isAdmin(currentUser.uid);
      setIsAdmin(adminStatus);
      
      const [expensesData, categoriesData, budgetsData, recurringData] = await Promise.all([
        expenseService.getAll(currentUser.uid),
        categoryService.getAll(currentUser.uid),
        budgetService.getAll(currentUser.uid),
        recurringExpenseService.getAll(currentUser.uid),
      ]);

      setExpenses(expensesData);
      setCategories(categoriesData);
      setBudgets(budgetsData);
      setRecurringExpenses(recurringData);
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('error', t('errorLoadingData'));
    } finally {
      setInitialLoading(false);
    }
  }, [currentUser, showNotification, t]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Expense handlers
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

  // Bulk delete expenses (from ExpenseList multi-select)
  const handleBulkDeleteExpenses = async (ids: string[]) => {
    if (ids.length === 0) return;
    const originals = expenses.filter((e) => ids.includes(e.id!));

    // Optimistic update: remove selected expenses
    setExpenses((prev) => prev.filter((e) => !ids.includes(e.id!)));

    // Run delete for each id with optimisticCRUD so failures are retried/handled
    await Promise.all(ids.map((id) => {
      const original = originals.find((o) => o.id === id);
      return optimisticCRUD.run(
        { type: 'delete', data: { id }, originalData: original },
        () => expenseService.delete(id),
        {
          entityType: 'expense',
          retryToQueueOnFail: true,
          onSuccess: () => {},
          onError: () => {
            // Rollback the specific failed deletion
            if (original) {
              setExpenses((prev) => [original!, ...prev]);
            }
          },
        }
      );
    }));

    // Refresh to ensure server state is in sync
    loadData();
  };

  // Category handlers
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

  // Budget handlers
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

  // Recurring expense handlers
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

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel(expenses, categories);
  };

  const handleDownloadTemplate = () => {
    downloadExpenseTemplate();
  };

  const handleImportComplete = () => {
    // Reload data after import
    loadData();
    showNotification('success', 'Import completed successfully!');
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
      <div className="dashboard-card dashboard-header relative mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-gray-800 mb-1 truncate">{t('appTitle')}</h1>
          <p className="text-sm text-gray-600 truncate">{t('welcome')}, {currentUser?.email}</p>
        </div>

        <div className="header-actions">
          {/* Hamburger Menu */}
          <div ref={hamburgerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menu"
              aria-expanded={showHamburgerMenu}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {showHamburgerMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                {/* Language Section */}
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Language / 語言</div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setShowHamburgerMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                        language === 'en' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      🌐 English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('zh');
                        setShowHamburgerMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                        language === 'zh' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      🌐 繁體中文
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('zh-CN');
                        setShowHamburgerMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                        language === 'zh-CN' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      🌐 简体中文
                    </button>
                  </div>
                </div>

                {/* Import/Export Section */}
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Import / Export</div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        handleDownloadTemplate();
                        setShowHamburgerMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {t('template') || 'Download Template'}
                    </button>
                    <button
                      onClick={() => {
                        handleExportExcel();
                        setShowHamburgerMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {t('exportExcel') || 'Export to Excel'}
                    </button>
                    <button
                      onClick={() => {
                        setShowImportModal(true);
                        setShowHamburgerMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3v12m0-12l-4 4m4-4l4 4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {t('import') || 'Import Data'}
                    </button>
                  </div>
                </div>

                {/* Profile & Admin Section */}
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setShowHamburgerMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm rounded transition-colors flex items-center gap-2 ${
                        activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {t('profile') || 'Profile'}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setActiveTab('admin');
                          setShowHamburgerMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm rounded transition-colors flex items-center gap-2 ${
                          activeTab === 'admin' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t('admin') || 'Admin'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Logout */}
                <div className="px-4 py-2">
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowHamburgerMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-2 font-medium"
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

      <div className="dashboard-card dashboard-tabs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'dashboard' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t('dashboard')}
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'expenses' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t('expenses')}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'categories' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t('categories')}
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'budgets' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t('budgets')}
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'recurring' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t('recurring')}
        </button>
      </div>

      <div className="dashboard-card content-pad">
        {activeTab === 'dashboard' && (
          <div>
            <DashboardSummary expenses={expenses} />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-800">{t('expenseHistory')}</h2>
            <ExpenseList
              expenses={expenses}
              categories={categories}
              onDelete={handleDeleteExpense}
              onInlineUpdate={handleInlineUpdateExpense}
              onBulkDelete={handleBulkDeleteExpenses}
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="flex flex-col gap-4">
            <CategoryManager
              categories={categories}
              onAdd={handleAddCategory}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
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
              onAdd={handleAddRecurring}
              onUpdate={handleUpdateRecurring}
              onDelete={handleDeleteRecurring}
              onToggleActive={handleToggleRecurring}
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

      {/* Floating Add Expense Button - visible on all tabs except expenses tab where form is already visible */}
      {activeTab !== 'expenses' && !showAddExpenseForm && (
        <button 
          onClick={() => setShowAddExpenseForm(true)}
          style={styles.floatingButton}
          className="floating-btn-hover"
          title={t('addNewExpense')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: isMobile ? 0 : '8px' }}>
            <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor"/>
          </svg>
          {!isMobile && t('addNewExpense')}
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
              <div className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 px-4 sm:px-6 pt-3 pb-4 max-h-[85vh] overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">{t('addExpense')}</h3>
                  <button
                    aria-label="Close"
                    onClick={() => setShowAddExpenseForm(false)}
                    className="p-2 rounded-md hover:bg-gray-100"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.3 5.71L12 12.01 5.7 5.71 4.29 7.12l6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.29 6.3 1.42-1.41-6.3-6.3 6.3-6.3-1.41-1.41z" fill="#444"/>
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
        />
      )}
    </div>
      {/* Floating Add button visible on Expenses tab */}
      {activeTab === 'expenses' && !showAddSheet && (
        <button
          aria-label="Add Expense"
          onClick={() => setShowAddSheet(true)}
          style={styles.floatingButton}
          className="floating-btn-hover"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: isMobile ? 0 : '8px' }}>
            <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor"/>
          </svg>
          {!isMobile && t('addNewExpense')}
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
              <div className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 px-4 sm:px-6 pt-3 pb-4 max-h-[85vh] overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">{t('addExpense')}</h3>
                  <button
                    aria-label="Close"
                    onClick={() => setShowAddSheet(false)}
                    className="p-2 rounded-md hover:bg-gray-100"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.3 5.71L12 12.01 5.7 5.71 4.29 7.12l6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.29 6.3 1.42-1.41-6.3-6.3 6.3-6.3-1.41-1.41z" fill="#444"/>
                    </svg>
                  </button>
                </div>
                <ExpenseForm
                  onSubmit={(data) => { handleAddExpense(data); setShowAddSheet(false); }}
                  onCancel={() => setShowAddSheet(false)}
                  categories={categories}
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
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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

export default Dashboard;
