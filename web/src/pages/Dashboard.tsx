import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
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
  const actionsRef = useRef<HTMLDivElement | null>(null);
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
      showNotification('error', 'Failed to load data. Please refresh the page.');
    } finally {
      setInitialLoading(false);
    }
  }, [currentUser, showNotification]);

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
        <p className="ml-3 text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto min-h-screen">
      <div className="dashboard-card dashboard-header relative mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">💰 Expense Manager</h1>
          <p className="text-sm text-gray-600">Welcome, {currentUser?.email}</p>
        </div>
        {/* Compact actions toggle for small screens */}
        <div ref={actionsRef} className="flex items-center gap-2">
          <button
            className="actions-toggle"
            aria-label="Open actions"
            onClick={() => setShowActionsMenu((s) => !s)}
          >
            {/* hamburger icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="6" width="18" height="2" rx="1" fill="#444" />
              <rect x="3" y="11" width="18" height="2" rx="1" fill="#444" />
              <rect x="3" y="16" width="18" height="2" rx="1" fill="#444" />
            </svg>
          </button>
          {showActionsMenu && (
            <div className="action-dropdown" role="menu">
              <button onClick={() => { handleDownloadTemplate(); setShowActionsMenu(false); }} className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-md text-sm font-medium text-left transition-colors">
                📥 Template
              </button>
              <button onClick={() => { handleExportExcel(); setShowActionsMenu(false); }} className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-md text-sm font-medium text-left transition-colors">
                📊 Export Excel
              </button>
              <button onClick={() => { setShowImportModal(true); setShowActionsMenu(false); }} className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-md text-sm font-medium text-left transition-colors">
                📤 Import
              </button>
              <button onClick={() => { handleLogout(); setShowActionsMenu(false); }} className="w-full px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-sm font-medium text-left transition-colors">
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="header-actions">
          <button onClick={handleDownloadTemplate} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-sm transition-colors">
            📥 Template
          </button>
          <button onClick={handleExportExcel} className="px-5 py-2.5 bg-success hover:bg-green-600 text-white rounded font-medium text-sm transition-colors">
            📊 Export Excel
          </button>
          <button onClick={() => setShowImportModal(true)} className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded font-medium text-sm transition-colors">
            📤 Import
          </button>
          <button onClick={handleLogout} className="px-5 py-2.5 bg-danger hover:bg-red-600 text-white rounded font-medium text-sm transition-colors">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-card dashboard-tabs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'dashboard' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'expenses' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'categories' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'budgets' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          Budgets
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'recurring' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          Recurring
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
            activeTab === 'profile' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          👤 Profile
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`dashboard-tab px-5 py-3 rounded font-medium text-sm transition-all ${
              activeTab === 'admin' ? 'bg-primary text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            👑 Admin
          </button>
        )}
      </div>

      <div className="dashboard-card content-pad">
        {activeTab === 'dashboard' && (
          <div>
            <DashboardSummary expenses={expenses} />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Expense History</h2>
            <ExpenseList
              expenses={expenses}
              categories={categories}
              onDelete={handleDeleteExpense}
              onInlineUpdate={handleInlineUpdateExpense}
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
      {activeTab !== 'expenses' && (
        <button 
          onClick={() => setShowAddExpenseForm(true)}
          style={styles.floatingButton}
          className="floating-btn-hover"
          title="Add New Expense"
        >
          {isMobile ? '+' : '+ Add New Expense'}
        </button>
      )}

      {/* Add Expense Modal */}
      {showAddExpenseForm && activeTab !== 'expenses' && (
        <div style={styles.modalOverlay} onClick={() => setShowAddExpenseForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Expense</h2>
              <button 
                onClick={() => setShowAddExpenseForm(false)} 
                style={styles.modalCloseButton}
              >
                ✕
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
      {activeTab === 'expenses' && (
        <button
          aria-label="Add Expense"
          onClick={() => setShowAddSheet(true)}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-primary hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor"/>
          </svg>
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
                  <h3 className="text-lg font-semibold text-gray-800">Add Expense</h3>
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
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600' as const,
    color: '#333',
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#666',
    lineHeight: '1',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
};

export default Dashboard;
