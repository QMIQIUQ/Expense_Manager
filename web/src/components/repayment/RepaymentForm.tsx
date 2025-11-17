import React, { useState } from 'react';
import { Repayment } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface RepaymentFormProps {
  expenseId: string;
  onSubmit: (repayment: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>) => void;
  onCancel?: () => void;
  initialData?: Repayment;
  maxAmount?: number; // Maximum amount that can be repaid (for validation)
}

const RepaymentForm: React.FC<RepaymentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  maxAmount,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    amount: initialData?.amount || 0,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    payerName: initialData?.payerName || '',
    note: initialData?.note || '',
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
    
    onSubmit(submitData as Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>);
    
    if (!initialData) {
      setFormData({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        payerName: '',
        note: '',
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
