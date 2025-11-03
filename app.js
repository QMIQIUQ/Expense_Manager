// Expense Monitor App - Main JavaScript
class ExpenseManager {
    constructor() {
        this.expenses = [];
        this.init();
    }

    init() {
        this.loadExpenses();
        this.setupEventListeners();
        this.setDefaultDate();
        this.renderExpenses();
        this.updateSummary();
        this.registerServiceWorker();
    }

    // Set today's date as default
    setDefaultDate() {
        const dateInput = document.getElementById('date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.max = today; // Prevent future dates
    }

    // Setup event listeners
    setupEventListeners() {
        // Form submission
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterExpenses();
        });

        // Category filter
        document.getElementById('filterCategory').addEventListener('change', (e) => {
            this.filterExpenses();
        });

        // Sort
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortExpenses(e.target.value);
        });
    }

    // Add new expense
    addExpense() {
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        if (!description || !amount || !category || !date) {
            alert('Please fill in all fields');
            return;
        }

        const expense = {
            id: Date.now().toString(),
            description,
            amount,
            category,
            date,
            timestamp: new Date().toISOString()
        };

        this.expenses.unshift(expense); // Add to beginning
        this.saveExpenses();
        this.renderExpenses();
        this.updateSummary();
        this.resetForm();
        this.showSyncStatus('Expense added successfully! ✅');
    }

    // Delete expense
    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            this.expenses = this.expenses.filter(exp => exp.id !== id);
            this.saveExpenses();
            this.renderExpenses();
            this.updateSummary();
            this.showSyncStatus('Expense deleted! 🗑️');
        }
    }

    // Save expenses to localStorage
    saveExpenses() {
        try {
            localStorage.setItem('expenses', JSON.stringify(this.expenses));
            this.syncData();
        } catch (error) {
            console.error('Error saving expenses:', error);
            alert('Failed to save expenses. Storage might be full.');
        }
    }

    // Load expenses from localStorage
    loadExpenses() {
        try {
            const stored = localStorage.getItem('expenses');
            this.expenses = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.expenses = [];
        }
    }

    // Render expenses list
    renderExpenses(expensesToRender = this.expenses) {
        const expensesList = document.getElementById('expensesList');
        
        if (expensesToRender.length === 0) {
            expensesList.innerHTML = '<p class="no-expenses">No expenses found. Try adjusting your filters or add a new expense! 📝</p>';
            return;
        }

        expensesList.innerHTML = expensesToRender.map(expense => `
            <div class="expense-item" data-id="${expense.id}">
                <div class="expense-icon">${this.getCategoryIcon(expense.category)}</div>
                <div class="expense-details">
                    <div class="expense-description">${this.escapeHtml(expense.description)}</div>
                    <div class="expense-category">${this.getCategoryName(expense.category)}</div>
                </div>
                <div class="expense-date">${this.formatDate(expense.date)}</div>
                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                <button class="expense-delete" onclick="expenseManager.deleteExpense('${expense.id}')">Delete</button>
            </div>
        `).join('');
    }

    // Filter expenses based on search and category
    filterExpenses() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('filterCategory').value;

        let filtered = this.expenses.filter(expense => {
            const matchesSearch = expense.description.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || expense.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        const sortBy = document.getElementById('sortBy').value;
        filtered = this.applySorting(filtered, sortBy);
        this.renderExpenses(filtered);
    }

    // Sort expenses
    sortExpenses(sortBy) {
        const filtered = this.getFilteredExpenses();
        const sorted = this.applySorting(filtered, sortBy);
        this.renderExpenses(sorted);
    }

    // Apply sorting logic
    applySorting(expenses, sortBy) {
        const sorted = [...expenses];
        
        switch (sortBy) {
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'amount-desc':
                sorted.sort((a, b) => b.amount - a.amount);
                break;
            case 'amount-asc':
                sorted.sort((a, b) => a.amount - b.amount);
                break;
        }
        
        return sorted;
    }

    // Get filtered expenses
    getFilteredExpenses() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('filterCategory').value;

        return this.expenses.filter(expense => {
            const matchesSearch = expense.description.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || expense.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }

    // Update summary statistics
    updateSummary() {
        const total = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('totalExpenses').textContent = `$${total.toFixed(2)}`;

        // This month
        const now = new Date();
        const monthExpenses = this.expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === now.getMonth() && 
                   expDate.getFullYear() === now.getFullYear();
        }).reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('monthExpenses').textContent = `$${monthExpenses.toFixed(2)}`;

        // Today
        const today = new Date().toISOString().split('T')[0];
        const todayExpenses = this.expenses.filter(exp => exp.date === today)
            .reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('todayExpenses').textContent = `$${todayExpenses.toFixed(2)}`;
    }

    // Reset form
    resetForm() {
        document.getElementById('expenseForm').reset();
        this.setDefaultDate();
    }

    // Get category icon
    getCategoryIcon(category) {
        const icons = {
            food: '🍔',
            transport: '🚗',
            shopping: '🛍️',
            entertainment: '🎬',
            bills: '📄',
            health: '🏥',
            education: '📚',
            other: '📦'
        };
        return icons[category] || '📦';
    }

    // Get category name
    getCategoryName(category) {
        const names = {
            food: 'Food & Dining',
            transport: 'Transportation',
            shopping: 'Shopping',
            entertainment: 'Entertainment',
            bills: 'Bills & Utilities',
            health: 'Healthcare',
            education: 'Education',
            other: 'Other'
        };
        return names[category] || 'Other';
    }

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show sync status
    showSyncStatus(message) {
        const syncStatus = document.getElementById('syncStatus');
        syncStatus.textContent = message;
        setTimeout(() => {
            syncStatus.textContent = '✅ Data synced';
        }, 3000);
    }

    // Sync data across tabs via localStorage
    syncData() {
        // localStorage changes automatically trigger 'storage' events on other tabs
        // No additional action needed here
    }

    // Register service worker for offline capability
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered successfully:', registration.scope);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }
}

// Initialize the app
const expenseManager = new ExpenseManager();

// Listen for storage events (sync across tabs)
window.addEventListener('storage', (e) => {
    if (e.key === 'expenses') {
        expenseManager.loadExpenses();
        expenseManager.renderExpenses();
        expenseManager.updateSummary();
        expenseManager.showSyncStatus('🔄 Synced from another tab');
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    expenseManager.showSyncStatus('✅ Back online');
});

window.addEventListener('offline', () => {
    expenseManager.showSyncStatus('📡 Working offline');
});
