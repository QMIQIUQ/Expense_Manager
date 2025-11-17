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
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formGroup}>
        <label htmlFor="amount" style={styles.label}>
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
          style={{ ...styles.input, ...(errors.amount ? styles.inputError : {}) }}
          placeholder="0.00"
        />
        {errors.amount && <span style={styles.error}>{errors.amount}</span>}
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="date" style={styles.label}>
          {t('repaymentDate')} *
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          style={{ ...styles.input, ...(errors.date ? styles.inputError : {}) }}
        />
        {errors.date && <span style={styles.error}>{errors.date}</span>}
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="payerName" style={styles.label}>
          {t('payerNameOptional')}
        </label>
        <input
          type="text"
          id="payerName"
          name="payerName"
          value={formData.payerName}
          onChange={handleChange}
          style={styles.input}
          placeholder={t('payerNamePlaceholder')}
        />
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="note" style={styles.label}>
          {t('repaymentNote')}
        </label>
        <textarea
          id="note"
          name="note"
          value={formData.note}
          onChange={handleChange}
          style={styles.textarea}
          placeholder={t('addAnyNotes')}
          rows={3}
        />
      </div>

      {/* Payment Method Selection */}
      <div style={styles.formGroup}>
        <label htmlFor="paymentMethod" style={styles.label}>
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
          style={styles.select}
        >
          <option value="cash">💵 {t('cash')}</option>
          <option value="credit_card">💳 {t('creditCard')}</option>
          <option value="e_wallet">📱 {t('eWallet')}</option>
        </select>
      </div>

      {/* Card Selection (only when credit card is selected) */}
      {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
        <div style={styles.formGroup}>
          <label htmlFor="cardId" style={styles.label}>
            {t('selectCard')}
          </label>
          <select
            id="cardId"
            name="cardId"
            value={formData.cardId}
            onChange={handleChange}
            style={styles.select}
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
        <div style={styles.formGroup}>
          <label htmlFor="paymentMethodName" style={styles.label}>
            {t('selectEWallet')}
          </label>
          <select
            id="paymentMethodName"
            name="paymentMethodName"
            value={formData.paymentMethodName}
            onChange={handleChange}
            style={styles.select}
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

      <div style={styles.buttonGroup}>
        <button type="submit" style={styles.submitButton}>
          {initialData ? t('update') : t('add')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={styles.cancelButton}>
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  );
};

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#333',
  },
  input: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  select: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  } as React.CSSProperties,
  textarea: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  } as React.CSSProperties,
  inputError: {
    borderColor: '#ff4444',
  },
  error: {
    color: '#ff4444',
    fontSize: '12px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
  },
  submitButton: {
    flex: 1,
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500' as const,
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  cancelButton: {
    flex: 1,
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500' as const,
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
};

export default RepaymentForm;
