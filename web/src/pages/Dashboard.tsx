import React, { useState, useEffect } from 'react';
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
import Header from '../components/Header';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const optimisticCRUD = useOptimisticCRUD();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'categories' | 'budgets' | 'recurring' | 'profile' | 'admin'>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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

  const handleUpdateExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!editingExpense?.id) return;
    
    const expenseId = editingExpense.id;
    const originalExpense = expenses.find((e) => e.id === expenseId);
    
    // Optimistic update
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, ...expenseData } : e))
    );
    setEditingExpense(null);

    await optimisticCRUD.run(
      { type: 'update', data: expenseData, originalData: originalExpense },
      () => expenseService.update(expenseId, expenseData),
      {
        entityType: 'expense',
        retryToQueueOnFail: true,
        onSuccess: () => {
          loadData();
        },
        onError: () => {
          // Rollback optimistic update
          if (originalExpense) {
            setExpenses((prev) =>
              prev.map((e) => (e.id === expenseId ? originalExpense : e))
            );
          }
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <InlineLoading size={24} />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
        onImportClick={() => setShowImportModal(true)}
        onExportClick={handleExportExcel}
        onDownloadTemplateClick={handleDownloadTemplate}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <div>
            <DashboardSummary expenses={expenses} />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <ExpenseForm
                onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense}
                onCancel={editingExpense ? () => setEditingExpense(null) : undefined}
                initialData={editingExpense || undefined}
                categories={categories}
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Expense History</h2>
              <ExpenseList
                expenses={expenses}
                onEdit={setEditingExpense}
                onDelete={handleDeleteExpense}
              />
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-4">
            <CategoryManager
              categories={categories}
              onAdd={handleAddCategory}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
            />
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="space-y-4">
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
          <div className="space-y-4">
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
      </div>

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
    </>
  );
};



export default Dashboard;
