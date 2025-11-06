import React, { useState } from 'react';
import { Expense } from '../../types';
import ConfirmModal from '../ConfirmModal';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; expenseId: string | null }>({
    isOpen: false,
    expenseId: null,
  });

  const filteredAndSortedExpenses = () => {
    const filtered = expenses.filter((expense) => {
      const matchesSearch = expense.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'amount-desc':
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount-asc':
        sorted.sort((a, b) => a.amount - b.amount);
        break;
    }

    return sorted;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const categories = Array.from(new Set(expenses.map((e) => e.category)));

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Search expenses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>
      </div>

      {/* Expense List */}
      {filteredAndSortedExpenses().length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <p>No expenses found. Add your first expense! 📝</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredAndSortedExpenses().map((expense) => (
            <div
              key={expense.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              {/* Main Content - Stacks on mobile, side-by-side on desktop */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Expense Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 mb-1 truncate">
                    {expense.description}
                  </h3>
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                    {expense.category}
                  </span>
                  {expense.notes && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{expense.notes}</p>
                  )}
                </div>

                {/* Amount and Date */}
                <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-1">
                  <div className="text-xl sm:text-2xl font-semibold text-red-600">
                    ${expense.amount.toFixed(2)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">{formatDate(expense.date)}</div>
                </div>
              </div>

              {/* Actions - Full width on mobile, auto on desktop */}
              <div className="flex gap-2 sm:flex-shrink-0">
                <button
                  onClick={() => onEdit(expense)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-h-[44px]"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, expenseId: expense.id! })}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors min-h-[44px]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.expenseId) {
            onDelete(deleteConfirm.expenseId);
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, expenseId: null })}
      />
    </div>
  );
};

export default ExpenseList;
