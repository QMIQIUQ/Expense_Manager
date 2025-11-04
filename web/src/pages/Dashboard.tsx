import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Expense, Category, Budget, RecurringExpense } from '../types';
import { expenseService } from '../services/expenseService';
import { categoryService } from '../services/categoryService';
import { budgetService } from '../services/budgetService';
import { recurringExpenseService } from '../services/recurringExpenseService';
import ConfirmDialog from '../components/ConfirmDialog';
import { exportToCSV } from '../utils/exportUtils';

// Tab views
import DashboardHomeTab from './tabs/DashboardHomeTab';
import ExpensesTab from './tabs/ExpensesTab';
import CategoriesTab from './tabs/CategoriesTab';
import BudgetsTab from './tabs/BudgetsTab';
import RecurringTab from './tabs/RecurringTab';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'expenses' | 'categories' | 'budgets' | 'recurring'>('dashboard');
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [recurringExpenses, setRecurringExpenses] = React.useState<RecurringExpense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ type: string; id: string; name?: string } | null>(null);
  const [pendingItems, setPendingItems] = React.useState<Set<string>>(new Set());
  const [failedOperations, setFailedOperations] = React.useState<Array<{
    id: string;
    type: string;
    action: string;
    data: unknown;
    error: string;
  }>>([]);

  const loadData = React.useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Ensure defaults exist
      await categoryService.initializeDefaults(currentUser.uid);

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
      showError('Failed to load data. Some features may be unavailable.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showError]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
      showSuccess('Logged out successfully!');
      navigate('/login');
    } catch (error) {
      showError('Failed to log out');
      console.error('Failed to log out', error);
    }
  };

  // Retry failed operation
  const retryOperation = async (operationId: string) => {
    const operation = failedOperations.find(op => op.id === operationId);
    if (!operation) return;

    // Remove from failed list
    setFailedOperations(prev => prev.filter(op => op.id !== operationId));

    // Retry based on type and action
    switch (operation.type) {
      case 'expense':
        if (operation.action === 'add') await handleAddExpense(operation.data as Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);
        else if (operation.action === 'update') {
          const d = operation.data as Partial<Expense>;
          if (d && typeof d === 'object' && d.id) {
            const { id, ...updates } = d as { id: string } & Omit<Expense, 'userId' | 'createdAt' | 'updatedAt'>;
            await handleUpdateExpenseById(id, updates);
          }
        }
        break;
      case 'category':
        if (operation.action === 'add') {
          await handleAddCategory(operation.data as Omit<Category, 'id' | 'userId' | 'createdAt'>);
        } else if (operation.action === 'update') {
          const d = operation.data as Partial<Category> & { id?: string };
          if (d && d.id) {
            const { id, ...updates } = d as { id: string } & Partial<Category>;
            await handleUpdateCategory(id, updates);
          }
        }
        break;
      case 'budget':
        if (operation.action === 'add') {
          await handleAddBudget(operation.data as Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
        } else if (operation.action === 'update') {
          const d = operation.data as Partial<Budget> & { id?: string };
          if (d && d.id) {
            const { id, ...updates } = d as { id: string } & Partial<Budget>;
            await handleUpdateBudget(id, updates);
          }
        }
        break;
      case 'recurring':
        if (operation.action === 'add') {
          await handleAddRecurring(operation.data as Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
        } else if (operation.action === 'update') {
          const d = operation.data as Partial<RecurringExpense> & { id?: string };
          if (d && d.id) {
            const { id, ...updates } = d as { id: string } & Partial<RecurringExpense>;
            await handleUpdateRecurring(id, updates);
          }
        }
        break;
      default:
        break;
    }
  };

  // Expense handlers
  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;
    const tempId = 'temp-' + Date.now();
    setPendingItems(prev => new Set(prev).add(tempId));
    
    try {
      await expenseService.create({ ...expenseData, userId: currentUser.uid });
      showSuccess('Expense added successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error adding expense:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      showError('Failed to add expense. Saved for retry.');
      setFailedOperations(prev => [...prev, { id: tempId, type: 'expense', action: 'add', data: expenseData, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(tempId); return next; });
    }
  };

  const handleUpdateExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!editingExpense?.id) return;
    const expenseId = editingExpense.id;
    setPendingItems(prev => new Set(prev).add(expenseId));
    setEditingExpense(null);
    
    try {
      await expenseService.update(expenseId, expenseData);
      showSuccess('Expense updated successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error updating expense:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      showError('Failed to update expense. Saved for retry.');
      setFailedOperations(prev => [...prev, { id: expenseId, type: 'expense', action: 'update', data: { id: expenseId, ...expenseData }, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(expenseId); return next; });
      await loadData();
    }
  };

  // Update expense by id (used for retry flow)
  const handleUpdateExpenseById = async (
    id: string,
    expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ) => {
    setPendingItems(prev => new Set(prev).add(id));
    try {
      await expenseService.update(id, expenseData);
      showSuccess('Expense updated successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error updating expense:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      showError('Failed to update expense. Saved for retry.');
      setFailedOperations(prev => [...prev, { id, type: 'expense', action: 'update', data: { id, ...expenseData }, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(id); return next; });
      await loadData();
    }
  };

  // Category handlers
  const handleAddCategory = async (categoryData: Omit<Category, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    const tempId = 'temp-' + Date.now();
    setPendingItems(prev => new Set(prev).add(tempId));
    try {
      await categoryService.create({ ...categoryData, userId: currentUser.uid });
      showSuccess('Category added successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error adding category:', error);
      showError('Failed to add category. Saved for retry.');
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setFailedOperations(prev => [...prev, { id: tempId, type: 'category', action: 'add', data: categoryData, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(tempId); return next; });
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    setPendingItems(prev => new Set(prev).add(id));
    try {
      await categoryService.update(id, updates);
      showSuccess('Category updated successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error updating category:', error);
      showError('Failed to update category. Saved for retry.');
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setFailedOperations(prev => [...prev, { id, type: 'category', action: 'update', data: { id, ...updates }, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleDeleteExpense = async (id: string) => setDeleteConfirm({ type: 'expense', id });
  const handleDeleteCategory = async (id: string) => setDeleteConfirm({ type: 'category', id });
  const handleDeleteBudget = async (id: string) => setDeleteConfirm({ type: 'budget', id });
  const handleDeleteRecurring = async (id: string) => setDeleteConfirm({ type: 'recurring', id });

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const item = deleteConfirm;
    setDeleteConfirm(null);
    try {
      switch (item.type) {
        case 'expense':
          await expenseService.delete(item.id);
          showSuccess('Expense deleted successfully!');
          break;
        case 'category':
          await categoryService.delete(item.id);
          showSuccess('Category deleted successfully!');
          break;
        case 'budget':
          await budgetService.delete(item.id);
          showSuccess('Budget deleted successfully!');
          break;
        case 'recurring':
          await recurringExpenseService.delete(item.id);
          showSuccess('Recurring expense deleted successfully!');
          break;
      }
      await loadData();
    } catch (error) {
      console.error(`Error deleting ${item.type}:`, error);
      showError(`Failed to delete ${item.type}. Please try again.`);
      await loadData();
    }
  };

  // Budget handlers
  const handleAddBudget = async (budgetData: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;
    const tempId = 'temp-' + Date.now();
    setPendingItems(prev => new Set(prev).add(tempId));
    try {
      await budgetService.create({ ...budgetData, userId: currentUser.uid });
      showSuccess('Budget set successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error adding budget:', error);
      showError('Failed to set budget. Saved for retry.');
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setFailedOperations(prev => [...prev, { id: tempId, type: 'budget', action: 'add', data: budgetData, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(tempId); return next; });
    }
  };

  const handleUpdateBudget = async (id: string, updates: Partial<Budget>) => {
    setPendingItems(prev => new Set(prev).add(id));
    try {
      await budgetService.update(id, updates);
      showSuccess('Budget updated successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error updating budget:', error);
      showError('Failed to update budget. Saved for retry.');
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setFailedOperations(prev => [...prev, { id, type: 'budget', action: 'update', data: { id, ...updates }, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  // Recurring expense handlers
  const handleAddRecurring = async (recurringData: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;
    const tempId = 'temp-' + Date.now();
    setPendingItems(prev => new Set(prev).add(tempId));
    try {
      await recurringExpenseService.create({ ...recurringData, userId: currentUser.uid });
      showSuccess('Recurring expense added successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error adding recurring expense:', error);
      showError('Failed to add recurring expense. Saved for retry.');
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setFailedOperations(prev => [...prev, { id: tempId, type: 'recurring', action: 'add', data: recurringData, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(tempId); return next; });
    }
  };

  const handleUpdateRecurring = async (id: string, updates: Partial<RecurringExpense>) => {
    setPendingItems(prev => new Set(prev).add(id));
    try {
      await recurringExpenseService.update(id, updates);
      showSuccess('Recurring expense updated successfully!');
      await loadData();
    } catch (error: unknown) {
      console.error('Error updating recurring expense:', error);
      showError('Failed to update recurring expense. Saved for retry.');
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setFailedOperations(prev => [...prev, { id, type: 'recurring', action: 'update', data: { id, ...updates }, error: errorMsg }]);
    } finally {
      setPendingItems(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleToggleRecurring = async (id: string, isActive: boolean) => {
    try {
      await recurringExpenseService.toggleActive(id, isActive);
      await loadData();
    } catch (error) {
      console.error('Error toggling recurring expense:', error);
      showError('Failed to toggle recurring expense. Please try again.');
    }
  };

  // Export handler
  const handleExport = () => {
    const now = new Date();
    const filename = `expenses_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}.csv`;
    exportToCSV(expenses, filename);
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>💰 Expense Manager</h1>
          <p style={styles.subtitle}>Welcome, {currentUser?.email}</p>
        </div>
        <div style={styles.headerActions}>
          {loading && (
            <div style={styles.loadingIndicator}>
              <div style={styles.spinnerSmall}></div>
            </div>
          )}
          {pendingItems.size > 0 && (
            <div style={styles.pendingBadge}>
              <span style={styles.pendingText}>⏳ {pendingItems.size} pending</span>
            </div>
          )}
          {failedOperations.length > 0 && (
            <div style={styles.failedBadge}>
              <span style={styles.failedText}>⚠️ {failedOperations.length} failed</span>
              <button
                onClick={() => failedOperations.forEach(op => retryOperation(op.id))}
                style={styles.retryButton}
              >
                Retry All
              </button>
            </div>
          )}
          <button onClick={handleExport} style={styles.exportButton}>
            📊 Export CSV
          </button>
          <button onClick={() => setShowLogoutConfirm(true)} style={styles.logoutButton}>
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
      </div>

      <div style={styles.content}>
        {activeTab === 'dashboard' && (
          <DashboardHomeTab expenses={expenses} />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={expenses}
            categories={categories}
            editingExpense={editingExpense}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onEdit={setEditingExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            onAdd={handleAddCategory}
            onUpdate={handleUpdateCategory}
            onDelete={handleDeleteCategory}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsTab
            budgets={budgets}
            categories={categories}
            spentByCategory={getSpentByCategory()}
            onAdd={handleAddBudget}
            onUpdate={handleUpdateBudget}
            onDelete={handleDeleteBudget}
          />
        )}

        {activeTab === 'recurring' && (
          <RecurringTab
            recurringExpenses={recurringExpenses}
            categories={categories}
            onAdd={handleAddRecurring}
            onUpdate={handleUpdateRecurring}
            onDelete={handleDeleteRecurring}
            onToggleActive={handleToggleRecurring}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        confirmButtonColor="#f44336"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={`Delete ${deleteConfirm?.type || 'item'}`}
        message={`Are you sure you want to delete this ${deleteConfirm?.type}?`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="#f44336"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
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
    fontWeight: 700 as const,
    color: '#333',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerSmall: {
    width: '20px',
    height: '20px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  failedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#fff3cd',
    borderRadius: '4px',
    border: '1px solid #ffc107',
  },
  pendingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    border: '1px solid #64b5f6',
  },
  failedText: {
    fontSize: '13px',
    color: '#856404',
    fontWeight: 500 as const,
  },
  pendingText: {
    fontSize: '13px',
    color: '#0d47a1',
    fontWeight: 500 as const,
  },
  retryButton: {
    padding: '4px 12px',
    backgroundColor: '#ffc107',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500 as const,
    cursor: 'pointer',
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500 as const,
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
    fontWeight: 500 as const,
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
};

export default Dashboard;
