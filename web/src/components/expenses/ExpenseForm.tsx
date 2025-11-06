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
    time: initialData?.time || new Date().toTimeString().slice(0, 5), // Default to current time HH:mm
    notes: initialData?.notes || '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.description.trim()) newErrors.description = 'Please fill in this field.';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Please fill in this field.';
    if (!formData.category) newErrors.category = 'Please select a category.';
    if (!formData.date) newErrors.date = 'Please select a date.';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    onSubmit(formData as Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);
    if (!initialData) {
      setFormData({
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5), // Reset to current time
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
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Description *</label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="e.g., Grocery shopping"
          className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.description && <span className="text-xs text-red-600">{errors.description}</span>}
      </div>

      <div className="flex gap-4">
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
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.amount && <span className="text-xs text-red-600">{errors.amount}</span>}
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-700">Category *</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`px-3 py-2 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.category ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          {errors.category && <span className="text-xs text-red-600">{errors.category}</span>}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-700">Date *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date && <span className="text-xs text-red-600">{errors.date}</span>}
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-700">Time</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Additional notes..."
          rows={3}
          className="px-3 py-2 border border-gray-300 rounded resize-y focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex gap-3 mt-2">
        <button type="submit" className="flex-1 px-4 py-3 bg-primary hover:bg-indigo-700 text-white rounded-lg text-base font-medium transition-colors">
          {initialData ? 'Update Expense' : 'Add Expense'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-base font-medium transition-colors">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ExpenseForm;
