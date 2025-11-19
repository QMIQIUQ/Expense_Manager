import React, { useState } from 'react';
import { Repayment, Card, EWallet } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface RepaymentFormProps {
  expenseId: string;
  onSubmit: (repayment: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>) => void;
  onCancel?: () => void;
  initialData?: Repayment;
  maxAmount?: number; // Maximum amount that can be repaid (for validation)
  cards?: Card[];
  ewallets?: EWallet[];
}

const responsiveStyles = `
  .form-row {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  @media (min-width: 640px) {
    .form-row {
      flex-direction: row;
    }
  }
`;

const RepaymentForm: React.FC<RepaymentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  maxAmount,
  cards = [],
  ewallets = [],
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    amount: initialData?.amount || 0,
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
    if (maxAmount && formData.amount > maxAmount) {
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
    const submitData: Partial<typeof formData> = { ...formData };
    
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
    <form onSubmit={handleSubmit} className="repayment-form">
      <style>{responsiveStyles}</style>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="amount" className="form-label">
            {t('repaymentAmount')} *
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            step="0.01"
            min="0.01"
            value={formData.amount || ''}
            onChange={handleChange}
            className={`form-input ${errors.amount ? 'error' : ''}`}
            placeholder="0.00"
          />
          {errors.amount && <span className="error-message">{errors.amount}</span>}
        </div>

        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="date" className="form-label">
            {t('repaymentDate')} *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`form-input ${errors.date ? 'error' : ''}`}
          />
          {errors.date && <span className="error-message">{errors.date}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="paymentMethod" className="form-label">
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
            className="form-select"
          >
            <option value="cash">💵 {t('cash')}</option>
            <option value="credit_card">💳 {t('creditCard')}</option>
            <option value="e_wallet">📱 {t('eWallet')}</option>
          </select>
        </div>

        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="payerName" className="form-label">
            {t('payerNameOptional')}
          </label>
          <input
            type="text"
            id="payerName"
            name="payerName"
            value={formData.payerName}
            onChange={handleChange}
            className="form-input"
            placeholder={t('payerNamePlaceholder')}
          />
        </div>
      </div>

      {/* Card Selection (only when credit card is selected) */}
      {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
        <div className="form-group">
          <label htmlFor="cardId" className="form-label">
            {t('selectCard')}
          </label>
          <select
            id="cardId"
            name="cardId"
            value={formData.cardId}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">{t('selectCard')}</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* E-Wallet Selection (only when e-wallet is selected) */}
      {formData.paymentMethod === 'e_wallet' && ewallets.length > 0 && (
        <div className="form-group">
          <label htmlFor="paymentMethodName" className="form-label">
            {t('selectEWallet')}
          </label>
          <select
            id="paymentMethodName"
            name="paymentMethodName"
            value={formData.paymentMethodName}
            onChange={handleChange}
            className="form-select"
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

      <div className="form-group">
        <label htmlFor="note" className="form-label">
          {t('repaymentNote')}
        </label>
        <textarea
          id="note"
          name="note"
          value={formData.note}
          onChange={handleChange}
          className="form-textarea"
          placeholder={t('addAnyNotes')}
          rows={3}
        />
      </div>

      <div className="button-group">
        <button type="submit" className="btn btn-primary">
          {initialData ? t('update') : t('add')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  );
};

export default RepaymentForm;
