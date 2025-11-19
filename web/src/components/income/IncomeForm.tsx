import React, { useState } from 'react';
import { Income, IncomeType, IncomeCategory, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface IncomeFormProps {
  onSubmit: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  initialData?: Income;
  expenses?: Expense[]; // For linking to expenses
  preselectedExpenseId?: string; // Pre-select an expense when creating from expense detail
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
    category: initialData?.category || ('default' as IncomeCategory),
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
    
    // Prepare data and remove undefined/empty fields to prevent Firestore errors
    const submitData: Partial<typeof formData> = { ...formData };
    
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
    
    onSubmit(submitData as Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);
    
    if (!initialData) {
      setFormData({
        title: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        type: 'other' as IncomeType,
        category: 'default' as IncomeCategory,
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
    <form onSubmit={handleSubmit} style={styles.form}>
      <style>{responsiveStyles}</style>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>{t('titleOptional')}</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder={t('enterTitleOrSource')}
          style={styles.input}
        />
      </div>

      <div className="form-row">
        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>{t('amount')} *</label>
          <input
            type="number"
            name="amount"
            value={formData.amount || ''}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            step="0.01"
            min="0"
            style={{
              ...styles.input,
              borderColor: errors.amount ? '#ef4444' : 'var(--border-color)',
            }}
          />
          {errors.amount && <span style={styles.errorText}>{errors.amount}</span>}
        </div>

        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>{t('date')} *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            style={{
              ...styles.input,
              borderColor: errors.date ? '#ef4444' : 'var(--border-color)',
            }}
          />
          {errors.date && <span style={styles.errorText}>{errors.date}</span>}
        </div>
      </div>

      <div className="form-row">
        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>{t('type')} *</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            style={{
              ...styles.input,
              borderColor: errors.type ? '#ef4444' : 'var(--border-color)',
            }}
          >
            <option value="salary">{t('salary')}</option>
            <option value="reimbursement">{t('reimbursement')}</option>
            <option value="repayment">{t('repayment')}</option>
            <option value="other">{t('other')}</option>
          </select>
          {errors.type && <span style={styles.errorText}>{errors.type}</span>}
        </div>

        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>{t('incomeCategory')}</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="default">{t('defaultIncome')}</option>
            <option value="ewallet_reload">{t('ewalletReload')}</option>
            <option value="other">{t('other')}</option>
          </select>
          <small style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {formData.category === 'ewallet_reload' && t('ewalletReloadDesc')}
          </small>
        </div>
      </div>

      {(formData.type === 'repayment' || formData.type === 'reimbursement') && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>{t('payerNameOptional')}</label>
          <input
            type="text"
            name="payerName"
            value={formData.payerName}
            onChange={handleChange}
            placeholder={t('payerNamePlaceholder')}
            style={styles.input}
          />
        </div>
      )}

      {expenses.length > 0 && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>{t('linkToExpenseOptional')}</label>
          <select
            name="linkedExpenseId"
            value={formData.linkedExpenseId}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="">-- {t('noLink')} --</option>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.description} - ${expense.amount.toFixed(2)} ({expense.date})
              </option>
            ))}
          </select>
          {selectedExpense && (
            <div style={styles.linkedInfo}>
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

      <div style={styles.fieldGroup}>
        <label style={styles.label}>{t('notesOptional')}</label>
        <textarea
          name="note"
          value={formData.note}
          onChange={handleChange}
          placeholder={t('addAnyNotes')}
          rows={3}
          style={{ ...styles.input, resize: 'vertical' as const }}
        />
      </div>

      <div style={styles.actions}>
        <button type="submit" style={styles.submitButton}>
          {initialData ? t('update') : t('addIncome')}
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

export default IncomeForm;

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  input: {
    padding: '10px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
  },
  errorText: {
    fontSize: '12px',
    color: '#ef4444',
  },
  linkedInfo: {
    fontSize: '12px',
    color: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
    padding: '8px',
    borderRadius: '8px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cancelButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
