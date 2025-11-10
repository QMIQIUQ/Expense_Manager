import React, { useState } from 'react';
import { Income, IncomeType, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface IncomeFormProps {
  onSubmit: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  initialData?: Income;
  expenses?: Expense[]; // For linking to expenses
  preselectedExpenseId?: string; // Pre-select an expense when creating from expense detail
}

const IncomeForm: React.FC<IncomeFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  expenses = [],
  preselectedExpenseId,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    amount: initialData?.amount || 0,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    type: initialData?.type || ('other' as IncomeType),
    payerName: initialData?.payerName || '',
    linkedExpenseId: initialData?.linkedExpenseId || preselectedExpenseId || '',
    note: initialData?.note || '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const selectedExpense = formData.linkedExpenseId
    ? expenses.find((e) => e.id === formData.linkedExpenseId)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('pleaseFillField') || 'Please enter a valid amount';
    }
    if (!formData.date) {
      newErrors.date = t('pleaseFillField') || 'Please select a date';
    }
    if (!formData.type) {
      newErrors.type = t('pleaseFillField') || 'Please select income type';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({
      ...formData,
      title: formData.title || undefined,
      payerName: formData.payerName || undefined,
      linkedExpenseId: formData.linkedExpenseId || undefined,
      note: formData.note || undefined,
    });
    
    if (!initialData) {
      setFormData({
        title: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        type: 'other' as IncomeType,
        payerName: '',
        linkedExpenseId: '',
        note: '',
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
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Title (Optional)
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter title or source"
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('amount')} *
        </label>
        <input
          type="number"
          name="amount"
          value={formData.amount || ''}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.amount ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.amount && <span className="text-xs text-red-500">{errors.amount}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('date') || 'Date'} *
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.date ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.date && <span className="text-xs text-red-500">{errors.date}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Type *
        </label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.type ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="salary">Salary</option>
          <option value="reimbursement">Reimbursement</option>
          <option value="repayment">Repayment</option>
          <option value="other">Other</option>
        </select>
        {errors.type && <span className="text-xs text-red-500">{errors.type}</span>}
      </div>

      {(formData.type === 'repayment' || formData.type === 'reimbursement') && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Payer's Name (Optional)
          </label>
          <input
            type="text"
            name="payerName"
            value={formData.payerName}
            onChange={handleChange}
            placeholder="e.g., Friend A"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {expenses.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Link to Expense (Optional)
          </label>
          <select
            name="linkedExpenseId"
            value={formData.linkedExpenseId}
            onChange={handleChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- No Link --</option>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.description} - ${expense.amount.toFixed(2)} ({expense.date})
              </option>
            ))}
          </select>
          {selectedExpense && (
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
              <div>
                <strong>Expense:</strong> $
                {selectedExpense.amount.toFixed(2)}
              </div>
              {selectedExpense.originalReceiptAmount && (
                <div>
                  <strong>Receipt:</strong> $
                  {selectedExpense.originalReceiptAmount.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('notes')} (Optional)
        </label>
        <textarea
          name="note"
          value={formData.note}
          onChange={handleChange}
          placeholder="Add any additional notes"
          rows={3}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            {t('cancel') || 'Cancel'}
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {initialData ? 'Update' : 'Add Income'}
        </button>
      </div>
    </form>
  );
};

export default IncomeForm;
