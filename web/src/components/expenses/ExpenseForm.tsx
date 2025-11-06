import React, { useState } from 'react';
import { Expense, Category } from '../../types';

interface ExpenseFormProps {
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  initialData?: Expense;
  categories: Category[];
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  categories,
}) => {
  const [formData, setFormData] = useState({
    description: initialData?.description || '',
    amount: initialData?.amount || 0,
    category: initialData?.category || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    notes: initialData?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);
    if (!initialData) {
      setFormData({
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Description *</label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="e.g., Grocery shopping"
          required
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Amount and Category - Stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-700">Amount ($) *</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            required
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-700">Category *</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Date *</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          max={new Date().toISOString().split('T')[0]}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Additional notes..."
          rows={3}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
        <button
          type="submit"
          className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white rounded-md text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors min-h-[44px]"
        >
          {initialData ? 'Update Expense' : 'Add Expense'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 text-white rounded-md text-base font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ExpenseForm;
