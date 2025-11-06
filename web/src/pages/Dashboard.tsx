import React, { useState, useEffect } from 'react';
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
      <div style={styles.loading}>
        <InlineLoading size={24} />
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>💰 Expense Manager</h1>
          <p style={styles.subtitle}>Welcome, {currentUser?.email}</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleDownloadTemplate} style={styles.templateButton}>
            📥 Template
          </button>
          <button onClick={handleExportExcel} style={styles.exportButton}>
            📊 Export Excel
          </button>
          <button onClick={() => setShowImportModal(true)} style={styles.importButton}>
            📤 Import
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={activeTab === 'dashboard' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          style={activeTab === 'expenses' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          style={activeTab === 'categories' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          style={activeTab === 'budgets' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
        >
          Budgets
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          style={activeTab === 'recurring' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
        >
          Recurring
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          style={activeTab === 'profile' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
        >
          👤 Profile
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            style={activeTab === 'admin' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          >
            👑 Admin
          </button>
        )}
      </div>

      <div style={styles.content}>
        {activeTab === 'dashboard' && (
          <div>
            <DashboardSummary expenses={expenses} />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div style={styles.expensesTab}>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <ExpenseForm
                onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense}
                onCancel={editingExpense ? () => setEditingExpense(null) : undefined}
                initialData={editingExpense || undefined}
                categories={categories}
              />
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Expense History</h2>
              <ExpenseList
                expenses={expenses}
                onEdit={setEditingExpense}
                onDelete={handleDeleteExpense}
              />
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div style={styles.section}>
            <CategoryManager
              categories={categories}
              onAdd={handleAddCategory}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
            />
          </div>
        )}

        {activeTab === 'budgets' && (
          <div style={styles.section}>
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
          <div style={styles.section}>
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
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0 0 5px 0',
    fontSize: '28px',
    fontWeight: '700' as const,
    color: '#333',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  templateButton: {
    padding: '10px 20px',
    backgroundColor: '#9C27B0',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  importButton: {
    padding: '10px 20px',
    backgroundColor: '#4ECDC4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: '5px',
    marginBottom: '20px',
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    color: '#666',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: '#6366f1',
    color: 'white',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666',
  },
  loadingText: {
    marginLeft: '12px',
  },
  expensesTab: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '30px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#333',
  },
};

export default Dashboard;
