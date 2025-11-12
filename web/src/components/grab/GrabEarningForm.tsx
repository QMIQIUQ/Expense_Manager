import React, { useState, useEffect } from 'react';
import { GrabEarning, GrabTripType, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  onSubmit: (data: Omit<GrabEarning, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel: () => void;
  initialData?: GrabEarning;
  expenses?: Expense[];
}

const GrabEarningForm: React.FC<Props> = ({ onSubmit, onCancel, initialData, expenses = [] }) => {
  const { t } = useLanguage();
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: initialData?.date || today,
    grossAmount: initialData?.grossAmount?.toString() || '',
    platformFees: initialData?.platformFees?.toString() || '',
    tips: initialData?.tips?.toString() || '0',
    netAmount: initialData?.netAmount?.toString() || '',
    tripType: initialData?.tripType || 'ride' as GrabTripType,
    tripIdOrRef: initialData?.tripIdOrRef || '',
    payoutDate: initialData?.payoutDate || '',
    payoutReference: initialData?.payoutReference || '',
    notes: initialData?.notes || '',
    linkedExpenseId: initialData?.linkedExpenseId || '',
  });

  // Auto-calculate net amount when gross, fees, or tips change
  useEffect(() => {
    const gross = parseFloat(formData.grossAmount) || 0;
    const fees = parseFloat(formData.platformFees) || 0;
    const tips = parseFloat(formData.tips) || 0;
    const calculatedNet = gross - fees + tips;
    
    if (!isNaN(calculatedNet) && calculatedNet >= 0) {
      setFormData((prev) => ({ ...prev, netAmount: calculatedNet.toFixed(2) }));
    }
  }, [formData.grossAmount, formData.platformFees, formData.tips]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.date || !formData.grossAmount || !formData.platformFees) {
      alert(t('pleaseFillField'));
      return;
    }

    const gross = parseFloat(formData.grossAmount);
    const fees = parseFloat(formData.platformFees);
    const tips = parseFloat(formData.tips);
    const net = parseFloat(formData.netAmount);

    if (isNaN(gross) || gross < 0) {
      alert('Invalid gross amount');
      return;
    }

    if (isNaN(fees) || fees < 0) {
      alert('Invalid platform fees');
      return;
    }

    if (isNaN(tips) || tips < 0) {
      alert('Invalid tips amount');
      return;
    }

    onSubmit({
      date: formData.date,
      grossAmount: gross,
      platformFees: fees,
      tips: tips,
      netAmount: net,
      tripType: formData.tripType,
      tripIdOrRef: formData.tripIdOrRef || undefined,
      payoutDate: formData.payoutDate || undefined,
      payoutReference: formData.payoutReference || undefined,
      notes: formData.notes || undefined,
      linkedExpenseId: formData.linkedExpenseId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.row}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('date')} *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t('tripType')} *</label>
          <select
            name="tripType"
            value={formData.tripType}
            onChange={handleChange}
            style={styles.select}
            required
          >
            <option value="ride">{t('ride')}</option>
            <option value="delivery">{t('delivery')}</option>
            <option value="other">{t('other')}</option>
          </select>
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('grossAmount')} ($) *</label>
          <input
            type="number"
            name="grossAmount"
            value={formData.grossAmount}
            onChange={handleChange}
            style={styles.input}
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t('platformFees')} ($) *</label>
          <input
            type="number"
            name="platformFees"
            value={formData.platformFees}
            onChange={handleChange}
            style={styles.input}
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('tips')} ($)</label>
          <input
            type="number"
            name="tips"
            value={formData.tips}
            onChange={handleChange}
            style={styles.input}
            step="0.01"
            min="0"
            placeholder="0.00"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            {t('netAmount')} ($) 
            <span style={styles.hint}> - {t('autoCalculated')}</span>
          </label>
          <input
            type="number"
            name="netAmount"
            value={formData.netAmount}
            onChange={handleChange}
            style={{ ...styles.input, backgroundColor: '#f5f5f5' }}
            step="0.01"
            placeholder="0.00"
            readOnly
          />
          <div style={styles.calcHint}>{t('grabNetCalculation')}</div>
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>{t('tripReferenceOptional')}</label>
        <input
          type="text"
          name="tripIdOrRef"
          value={formData.tripIdOrRef}
          onChange={handleChange}
          style={styles.input}
          placeholder="e.g., GRAB123456"
        />
      </div>

      <div style={styles.row}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('payoutDateOptional')}</label>
          <input
            type="date"
            name="payoutDate"
            value={formData.payoutDate}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t('payoutReferenceOptional')}</label>
          <input
            type="text"
            name="payoutReference"
            value={formData.payoutReference}
            onChange={handleChange}
            style={styles.input}
            placeholder="e.g., TXN987654"
          />
        </div>
      </div>

      {expenses.length > 0 && (
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('linkToExpenseOptional')}</label>
          <select
            name="linkedExpenseId"
            value={formData.linkedExpenseId}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="">{t('noLink')}</option>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.description} - ${expense.amount.toFixed(2)} ({expense.date})
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={styles.formGroup}>
        <label style={styles.label}>{t('notesOptional')}</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          style={styles.textarea}
          rows={3}
          placeholder={t('addAnyNotes')}
        />
      </div>

      <div style={styles.buttonGroup}>
        <button type="button" onClick={onCancel} style={styles.cancelButton}>
          {t('cancel')}
        </button>
        <button type="submit" style={styles.submitButton}>
          {initialData ? t('update') : t('save')}
        </button>
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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
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
  hint: {
    fontSize: '12px',
    fontWeight: '400' as const,
    color: '#666',
    fontStyle: 'italic' as const,
  },
  calcHint: {
    fontSize: '11px',
    color: '#666',
    marginTop: '2px',
  },
  input: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
  },
  select: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
  },
  textarea: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '10px',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#666',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'white',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default GrabEarningForm;
