import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Expense, Category, Budget, RecurringExpense } from '../types';
import { expenseService } from '../services/expenseService';
import { categoryService } from '../services/categoryService';
import { budgetService } from '../services/budgetService';
import { recurringExpenseService } from '../services/recurringExpenseService';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseList from '../components/expenses/ExpenseList';
import CategoryManager from '../components/categories/CategoryManager';
import BudgetManager from '../components/budgets/BudgetManager';
import RecurringExpenseManager from '../components/recurring/RecurringExpenseManager';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import { exportToCSV } from '../utils/exportUtils';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'categories' | 'budgets' | 'recurring'>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const loadData = React.useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
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
      alert('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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
    try {
      await expenseService.create({ ...expenseData, userId: currentUser.uid });
      await loadData();
      alert('Expense added successfully!');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    }
  };

  const handleUpdateExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!editingExpense?.id) return;
    try {
      await expenseService.update(editingExpense.id, expenseData);
      setEditingExpense(null);
      await loadData();
      alert('Expense updated successfully!');
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense. Please try again.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await expenseService.delete(id);
      await loadData();
      alert('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  // Category handlers
  const handleAddCategory = async (categoryData: Omit<Category, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    try {
      await categoryService.create({ ...categoryData, userId: currentUser.uid });
      await loadData();
      alert('Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. Please try again.');
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      await categoryService.update(id, updates);
      await loadData();
      alert('Category updated successfully!');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category. Please try again.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await categoryService.delete(id);
      await loadData();
      alert('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };

  // Budget handlers
  const handleAddBudget = async (budgetData: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;
    try {
      await budgetService.create({ ...budgetData, userId: currentUser.uid });
      await loadData();
      alert('Budget set successfully!');
    } catch (error) {
      console.error('Error adding budget:', error);
      alert('Failed to set budget. Please try again.');
    }
  };

  const handleUpdateBudget = async (id: string, updates: Partial<Budget>) => {
    try {
      await budgetService.update(id, updates);
      await loadData();
      alert('Budget updated successfully!');
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Failed to update budget. Please try again.');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await budgetService.delete(id);
      await loadData();
      alert('Budget deleted successfully!');
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget. Please try again.');
    }
  };

  // Recurring expense handlers
  const handleAddRecurring = async (recurringData: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;
    try {
      await recurringExpenseService.create({ ...recurringData, userId: currentUser.uid });
      await loadData();
      alert('Recurring expense added successfully!');
    } catch (error) {
      console.error('Error adding recurring expense:', error);
      alert('Failed to add recurring expense. Please try again.');
    }
  };

  const handleUpdateRecurring = async (id: string, updates: Partial<RecurringExpense>) => {
    try {
      await recurringExpenseService.update(id, updates);
      await loadData();
      alert('Recurring expense updated successfully!');
    } catch (error) {
      console.error('Error updating recurring expense:', error);
      alert('Failed to update recurring expense. Please try again.');
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await recurringExpenseService.delete(id);
      await loadData();
      alert('Recurring expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      alert('Failed to delete recurring expense. Please try again.');
    }
  };

  const handleToggleRecurring = async (id: string, isActive: boolean) => {
    try {
      await recurringExpenseService.toggleActive(id, isActive);
      await loadData();
    } catch (error) {
      console.error('Error toggling recurring expense:', error);
      alert('Failed to toggle recurring expense. Please try again.');
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

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading...</p>
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
          <button onClick={handleExport} style={styles.exportButton}>
            📊 Export CSV
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
      </div>
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
