import React, { useState } from 'react';
import { Repayment, Card, EWallet, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { BaseForm } from '../common/BaseForm';

interface RepaymentFormProps {
  expenseId: string;
  onSubmit: (repayment: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>) => void;
  onCancel?: () => void;
  initialData?: Repayment;
  maxAmount?: number; // Maximum amount that can be repaid (for validation)
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[]; // Prop threaded through component chain; implementation uses card.bankName directly
  title?: string;
}

// No component-scoped CSS needed; reuse the same utility classes
// and CSS variables styling pattern used by ExpenseForm to keep
// visual consistency across light/dark themes.

const RepaymentForm: React.FC<RepaymentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  maxAmount,
  cards = [],
  ewallets = [],
  banks: _banks = [],
  title,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    amount: initialData?.amount ? Math.round(initialData.amount * 100) : 0,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    payerName: initialData?.payerName || '',
    note: initialData?.note || '',
    paymentMethod: initialData?.paymentMethod || ('cash' as 'cash' | 'credit_card' | 'e_wallet'),
    cardId: initialData?.cardId || '',
    paymentMethodName: initialData?.paymentMethodName || '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('pleaseFillField') || 'Please enter a valid amount';
    }
    // Convert amount from cents to dollars for validation
    const amountInDollars = formData.amount / 100;
    if (maxAmount && amountInDollars > maxAmount) {
      newErrors.amount = `Amount cannot exceed ${maxAmount.toFixed(2)}`;
    }
    if (!formData.date) {
      newErrors.date = t('pleaseFillField') || 'Please select a date';
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
      amount: amountInDollars
    };
    
    // Remove empty optional fields
    if (!submitData.payerName || submitData.payerName.trim() === '') {
      delete submitData.payerName;
    }
    if (!submitData.note || submitData.note.trim() === '') {
      delete submitData.note;
    }
    // Remove payment method fields if cash or not applicable
    if (submitData.paymentMethod === 'cash') {
      delete submitData.cardId;
      delete submitData.paymentMethodName;
    } else if (submitData.paymentMethod === 'credit_card') {
      delete submitData.paymentMethodName;
      if (!submitData.cardId) {
        delete submitData.cardId;
      }
    } else if (submitData.paymentMethod === 'e_wallet') {
      delete submitData.cardId;
      if (!submitData.paymentMethodName || submitData.paymentMethodName.trim() === '') {
        delete submitData.paymentMethodName;
      }
    }
    
    onSubmit(submitData as Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>);
    
    if (!initialData) {
      setFormData({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        payerName: '',
        note: '',
        paymentMethod: 'cash',
        cardId: '',
        paymentMethodName: '',
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      title={title || t('addRepayment')}
      onSubmit={handleSubmit}
      onCancel={onCancel || (() => {})}
      submitLabel={t('save')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('repaymentAmount')} ($) *
          </label>
          <input
            type="text"
            inputMode="numeric"
            id="amount"
            name="amount"
            value={(formData.amount / 100).toFixed(2)}
            onChange={handleAmountChange}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${errors.amount ? 'border-red-500' : ''}`}
            style={{
              borderColor: errors.amount ? undefined : 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.amount && <span className="text-xs text-red-600">{errors.amount}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('repaymentDate')} *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${errors.date ? 'border-red-500' : ''}`}
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
          <label htmlFor="paymentMethod" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('paymentMethod')}
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={(e) => {
              setFormData(prev => ({
                ...prev,
                paymentMethod: e.target.value as 'cash' | 'credit_card' | 'e_wallet',
                cardId: e.target.value !== 'credit_card' ? '' : prev.cardId,
                paymentMethodName: e.target.value !== 'e_wallet' ? '' : prev.paymentMethodName,
              }));
            }}
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
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="payerName" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('payerNameOptional')}
          </label>
          <input
            type="text"
            id="payerName"
            name="payerName"
            value={formData.payerName}
            onChange={handleChange}
            placeholder={t('payerNamePlaceholder')}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

      {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="cardId" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('selectCard')}
          </label>
          <select
            id="cardId"
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
            <option value="">{t('selectCard')}</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.bankName ? `${card.bankName} - ${card.name}` : card.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {formData.paymentMethod === 'e_wallet' && ewallets.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="paymentMethodName" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('selectEWallet')}
          </label>
          <select
            id="paymentMethodName"
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

      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('repaymentNote')}
        </label>
        <textarea
          id="note"
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

export default RepaymentForm;
