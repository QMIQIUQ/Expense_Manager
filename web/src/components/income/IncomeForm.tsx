import React, { useState } from 'react';
import { Income, IncomeType, IncomeCategory, Expense, Card, EWallet, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { BaseForm } from '../common/BaseForm';
import { useToday } from '../../hooks/useToday';
import { getTodayLocal } from '../../utils/dateUtils';

interface IncomeFormProps {
  onSubmit: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  initialData?: Income;
  expenses?: Expense[]; // For linking to expenses
  preselectedExpenseId?: string; // Pre-select an expense when creating from expense detail
  cards?: Card[]; // For payment method selection
  ewallets?: EWallet[]; // For payment method selection
  banks?: Bank[]; // For payment method selection
  title?: string;
}

const IncomeForm: React.FC<IncomeFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  expenses = [],
  preselectedExpenseId,
  cards = [],
  ewallets = [],
  banks = [],
  title,
}) => {
  const { t } = useLanguage();
  const today = useToday();
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    amount: initialData?.amount ? Math.round(initialData.amount * 100) : 0,
    date: initialData?.date || today,
    type: initialData?.type || ('other' as IncomeType),
    category: initialData?.category || ('default' as IncomeCategory),
    payerName: initialData?.payerName || '',
    linkedExpenseId: initialData?.linkedExpenseId || preselectedExpenseId || '',
    note: initialData?.note || '',
    paymentMethod: initialData?.paymentMethod || ('cash' as 'cash' | 'credit_card' | 'e_wallet' | 'bank'),
    paymentMethodName: initialData?.paymentMethodName || '',
    cardId: initialData?.cardId || '',
    bankId: initialData?.bankId || '',
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
    
    // Prepare data and remove undefined/empty fields to prevent Firestore errors
    // Convert amount from cents to dollars
    const submitData: Partial<typeof formData> = { 
      ...formData,
      amount: formData.amount / 100
    };
    
    // Remove empty optional fields
    if (!submitData.title || submitData.title.trim() === '') {
      delete submitData.title;
    }
    if (!submitData.payerName || submitData.payerName.trim() === '') {
      delete submitData.payerName;
    }
    if (!submitData.linkedExpenseId || submitData.linkedExpenseId === '') {
      delete submitData.linkedExpenseId;
    }
    if (!submitData.note || submitData.note.trim() === '') {
      delete submitData.note;
    }
    if (submitData.category === 'default') {
      delete submitData.category;
    }
    
    // Clean up payment method fields based on selection
    if (formData.paymentMethod === 'cash') {
      delete submitData.cardId;
      delete submitData.bankId;
      delete submitData.paymentMethodName;
    } else if (formData.paymentMethod === 'credit_card') {
      delete submitData.bankId;
      delete submitData.paymentMethodName;
    } else if (formData.paymentMethod === 'e_wallet') {
      delete submitData.cardId;
      delete submitData.bankId;
    } else if (formData.paymentMethod === 'bank') {
      delete submitData.cardId;
      delete submitData.paymentMethodName;
    }
    
    onSubmit(submitData as Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);
    
    if (!initialData) {
      setFormData({
        title: '',
        amount: 0,
        date: getTodayLocal(),
        type: 'other' as IncomeType,
        category: 'default' as IncomeCategory,
        payerName: '',
        linkedExpenseId: '',
        note: '',
        paymentMethod: 'cash',
        paymentMethodName: '',
        cardId: '',
        bankId: '',
      });
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    // Convert to integer (cents)
    const amountInCents = parseInt(digitsOnly) || 0;
    setFormData((prev) => ({
      ...prev,
      amount: amountInCents,
    }));
    // Clear error for this field
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseForm
      title={title || (initialData ? t('editIncome') || 'Edit Income' : t('addIncome') || 'Add Income')}
      onSubmit={handleSubmit}
      onCancel={onCancel || (() => {})}
      submitLabel={initialData ? t('update') : t('addIncome')}
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('titleOptional')}</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder={t('enterTitleOrSource')}
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('amount')} ($) *</label>
          <input
            type="text"
            inputMode="numeric"
            name="amount"
            value={(formData.amount / 100).toFixed(2)}
            onChange={handleAmountChange}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.amount ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: errors.amount ? undefined : 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.amount && <span className="text-xs text-red-600">{errors.amount}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('date')} *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.date ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: errors.date ? undefined : 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.date && <span className="text-xs text-red-600">{errors.date}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('type')} *</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.type ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: errors.type ? undefined : 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="salary">{t('salary')}</option>
            <option value="reimbursement">{t('reimbursement')}</option>
            <option value="repayment">{t('repayment')}</option>
            <option value="other">{t('other')}</option>
          </select>
          {errors.type && <span className="text-xs text-red-600">{errors.type}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('incomeCategory')}</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="default">{t('defaultIncome')}</option>
            <option value="ewallet_reload">{t('ewalletReload')}</option>
            <option value="other">{t('other')}</option>
          </select>
          {formData.category === 'ewallet_reload' && (
            <small className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('ewalletReloadDesc')}
            </small>
          )}
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('paymentMethod')}</label>
        <select
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
        >
          <option value="cash">💵 {t('cash')}</option>
          <option value="credit_card">💳 {t('creditCard')}</option>
          <option value="e_wallet">📱 {t('eWallet')}</option>
          <option value="bank">🏦 {t('bankTransfer')}</option>
        </select>
      </div>

      {/* Card Selection - Shown when credit card is selected */}
      {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('selectCard')}</label>
          <select
            name="cardId"
            value={formData.cardId}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">{t('selectPaymentMethod')}</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                💳 {card.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* E-Wallet Selection - Shown when e-wallet is selected */}
      {formData.paymentMethod === 'e_wallet' && ewallets.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('selectEWallet')}</label>
          <select
            name="paymentMethodName"
            value={formData.paymentMethodName}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">{t('selectEWallet')}</option>
            {ewallets.map((wallet) => (
              <option key={wallet.id} value={wallet.name}>
                {wallet.icon} {wallet.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Bank Selection - Shown when bank is selected */}
      {formData.paymentMethod === 'bank' && banks.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('selectBank')}</label>
          <select
            name="bankId"
            value={formData.bankId}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">{t('selectBank')}</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                🏦 {bank.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {(formData.type === 'repayment' || formData.type === 'reimbursement') && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('payerNameOptional')}</label>
          <input
            type="text"
            name="payerName"
            value={formData.payerName}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder={t('payerNamePlaceholder')}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      )}

      {expenses.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('linkToExpenseOptional')}</label>
          <select
            name="linkedExpenseId"
            value={formData.linkedExpenseId}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">-- {t('noLink')} --</option>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.description} - ${expense.amount.toFixed(2)} ({expense.date})
              </option>
            ))}
          </select>
          {selectedExpense && (
            <div 
              className="text-xs p-2 rounded mt-1"
              style={{
                color: 'var(--accent-primary)',
                backgroundColor: 'var(--accent-light)',
              }}
            >
              <div>
                <strong>{t('expense')}:</strong> ${selectedExpense.amount.toFixed(2)}
              </div>
              {selectedExpense.originalReceiptAmount && (
                <div>
                  <strong>{t('receipt')}:</strong> ${selectedExpense.originalReceiptAmount.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('notesOptional')}</label>
        <textarea
          name="note"
          value={formData.note}
          onChange={handleChange}
          placeholder={t('addAnyNotes')}
          rows={3}
          className="px-3 py-2 border rounded resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      {/* Footer removed - handled by BaseForm */}
    </BaseForm>
  );
};

export default IncomeForm;
