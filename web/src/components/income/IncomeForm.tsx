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
          {t('titleOptional')}
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder={t('enterTitleOrSource')}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
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
          onFocus={(e) => e.target.select()}
          placeholder="0.00"
          step="0.01"
          min="0"
          className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.amount ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.amount && <span className="text-xs text-red-600">{errors.amount}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('date')} *
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.date ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.date && <span className="text-xs text-red-600">{errors.date}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('type')} *
        </label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className={`px-3 py-2 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.type ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="salary">{t('salary')}</option>
          <option value="reimbursement">{t('reimbursement')}</option>
          <option value="repayment">{t('repayment')}</option>
          <option value="other">{t('other')}</option>
        </select>
        {errors.type && <span className="text-xs text-red-600">{errors.type}</span>}
      </div>

      {(formData.type === 'repayment' || formData.type === 'reimbursement') && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            {t('payerNameOptional')}
          </label>
          <input
            type="text"
            name="payerName"
            value={formData.payerName}
            onChange={handleChange}
            placeholder={t('payerNamePlaceholder')}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {expenses.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            {t('linkToExpenseOptional')}
          </label>
          <select
            name="linkedExpenseId"
            value={formData.linkedExpenseId}
            onChange={handleChange}
            className="px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">-- {t('noLink')} --</option>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.description} - ${expense.amount.toFixed(2)} ({expense.date})
              </option>
            ))}
          </select>
          {selectedExpense && (
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded mt-1">
              <div>
                <strong>{t('expense')}:</strong> $
                {selectedExpense.amount.toFixed(2)}
              </div>
              {selectedExpense.originalReceiptAmount && (
                <div>
                  <strong>{t('receipt')}:</strong> $
                  {selectedExpense.originalReceiptAmount.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('notesOptional')}
        </label>
        <textarea
          name="note"
          value={formData.note}
          onChange={handleChange}
          placeholder={t('addAnyNotes')}
          rows={3}
          className="px-3 py-2 border border-gray-300 rounded resize-y focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex gap-3 mt-2">
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-primary hover:bg-indigo-700 text-white rounded-lg text-base font-medium transition-colors"
        >
          {initialData ? t('update') : t('addIncome')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-base font-medium transition-colors"
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  );
};

export default IncomeForm;
