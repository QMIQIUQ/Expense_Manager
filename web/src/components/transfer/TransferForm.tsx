import React, { useState } from 'react';
import { Transfer, Card, EWallet, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { BaseForm } from '../common/BaseForm';
import { getTodayLocal, getCurrentTimeLocal } from '../../utils/dateUtils';

interface TransferFormProps {
  onSubmit: (transfer: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  cards: Card[];
  ewallets: EWallet[];
  banks: Bank[];
  title?: string;
}

const TransferForm: React.FC<TransferFormProps> = ({
  onSubmit,
  onCancel,
  cards,
  ewallets,
  banks,
  title,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    amount: 0,
    date: getTodayLocal(),
    time: getCurrentTimeLocal(),
    fromPaymentMethod: 'cash' as 'cash' | 'credit_card' | 'e_wallet' | 'bank',
    fromPaymentMethodName: '',
    fromCardId: '',
    fromBankId: '',
    toPaymentMethod: 'cash' as 'cash' | 'credit_card' | 'e_wallet' | 'bank',
    toPaymentMethodName: '',
    toCardId: '',
    toBankId: '',
    note: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

    // Validate from payment method
    if (formData.fromPaymentMethod === 'e_wallet' && !formData.fromPaymentMethodName.trim()) {
      newErrors.fromPaymentMethodName = t('pleaseFillField');
    }
    if (formData.fromPaymentMethod === 'credit_card' && !formData.fromCardId) {
      newErrors.fromCardId = t('pleaseFillField');
    }
    if (formData.fromPaymentMethod === 'bank' && !formData.fromBankId) {
      newErrors.fromBankId = t('pleaseFillField');
    }

    // Validate to payment method
    if (formData.toPaymentMethod === 'e_wallet' && !formData.toPaymentMethodName.trim()) {
      newErrors.toPaymentMethodName = t('pleaseFillField');
    }
    if (formData.toPaymentMethod === 'credit_card' && !formData.toCardId) {
      newErrors.toCardId = t('pleaseFillField');
    }
    if (formData.toPaymentMethod === 'bank' && !formData.toBankId) {
      newErrors.toBankId = t('pleaseFillField');
    }

    // Check if from and to are the same
    if (
      formData.fromPaymentMethod === formData.toPaymentMethod &&
      (formData.fromPaymentMethod === 'cash' ||
        (formData.fromPaymentMethod === 'e_wallet' && formData.fromPaymentMethodName === formData.toPaymentMethodName) ||
        (formData.fromPaymentMethod === 'credit_card' && formData.fromCardId === formData.toCardId) ||
        (formData.fromPaymentMethod === 'bank' && formData.fromBankId === formData.toBankId))
    ) {
      newErrors.general = t('cannotTransferToSameAccount') || 'Cannot transfer to the same account';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    // Prepare data and remove unused fields
    const submitData: Partial<typeof formData> = {
      ...formData,
      amount: formData.amount / 100, // Convert from cents to dollars
    };

    // Clean up from fields based on payment method
    if (formData.fromPaymentMethod === 'cash') {
      delete submitData.fromPaymentMethodName;
      delete submitData.fromCardId;
      delete submitData.fromBankId;
    } else if (formData.fromPaymentMethod === 'credit_card') {
      delete submitData.fromPaymentMethodName;
      delete submitData.fromBankId;
    } else if (formData.fromPaymentMethod === 'e_wallet') {
      delete submitData.fromCardId;
      delete submitData.fromBankId;
    } else if (formData.fromPaymentMethod === 'bank') {
      delete submitData.fromPaymentMethodName;
      delete submitData.fromCardId;
    }

    // Clean up to fields based on payment method
    if (formData.toPaymentMethod === 'cash') {
      delete submitData.toPaymentMethodName;
      delete submitData.toCardId;
      delete submitData.toBankId;
    } else if (formData.toPaymentMethod === 'credit_card') {
      delete submitData.toPaymentMethodName;
      delete submitData.toBankId;
    } else if (formData.toPaymentMethod === 'e_wallet') {
      delete submitData.toCardId;
      delete submitData.toBankId;
    } else if (formData.toPaymentMethod === 'bank') {
      delete submitData.toPaymentMethodName;
      delete submitData.toCardId;
    }

    // Remove empty note
    if (!submitData.note || submitData.note.trim() === '') {
      delete submitData.note;
    }

    onSubmit(submitData as Omit<Transfer, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);

    // Reset form
    setFormData({
      amount: 0,
      date: getTodayLocal(),
      time: getCurrentTimeLocal(),
      fromPaymentMethod: 'cash',
      fromPaymentMethodName: '',
      fromCardId: '',
      fromBankId: '',
      toPaymentMethod: 'cash',
      toPaymentMethodName: '',
      toCardId: '',
      toBankId: '',
      note: '',
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '');
    const amountInCents = parseInt(digitsOnly) || 0;
    setFormData((prev) => ({ ...prev, amount: amountInCents }));
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseForm
      title={title || t('addTransfer') || 'Add Transfer'}
      onSubmit={handleSubmit}
      onCancel={onCancel || (() => {})}
      submitLabel={t('addTransfer') || 'Add Transfer'}
    >
      {errors.general && (
        <div className="text-sm text-red-600 p-3 bg-red-50 rounded" style={{ marginBottom: '16px' }}>
          {errors.general}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('amount')} ($) *
          </label>
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
              color: 'var(--text-primary)',
            }}
          />
          {errors.amount && <span className="text-xs text-red-600">{errors.amount}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('date')} *
          </label>
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
              color: 'var(--text-primary)',
            }}
          />
          {errors.date && <span className="text-xs text-red-600">{errors.date}</span>}
        </div>
      </div>

      {/* From Payment Method */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: 'var(--info-light)', 
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}>
          {t('transferFrom')} ⬆️
        </h4>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('paymentMethod')} *
          </label>
          <select
            name="fromPaymentMethod"
            value={formData.fromPaymentMethod}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="cash">💵 {t('cash')}</option>
            <option value="credit_card">💳 {t('creditCard')}</option>
            <option value="e_wallet">📱 {t('eWallet')}</option>
            <option value="bank">🏦 {t('bankTransfer')}</option>
          </select>
        </div>

        {/* From Card Selection */}
        {formData.fromPaymentMethod === 'credit_card' && (
          <div className="flex flex-col gap-1" style={{ marginTop: '12px' }}>
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectCard')} *
            </label>
            <select
              name="fromCardId"
              value={formData.fromCardId}
              onChange={handleChange}
              className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.fromCardId ? 'border-red-500' : ''
              }`}
              style={{
                borderColor: errors.fromCardId ? undefined : 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">{t('selectCard')}</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  💳 {card.name}
                </option>
              ))}
            </select>
            {errors.fromCardId && <span className="text-xs text-red-600">{errors.fromCardId}</span>}
          </div>
        )}

        {/* From E-Wallet Selection */}
        {formData.fromPaymentMethod === 'e_wallet' && (
          <div className="flex flex-col gap-1" style={{ marginTop: '12px' }}>
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectEWallet')} *
            </label>
            <select
              name="fromPaymentMethodName"
              value={formData.fromPaymentMethodName}
              onChange={handleChange}
              className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.fromPaymentMethodName ? 'border-red-500' : ''
              }`}
              style={{
                borderColor: errors.fromPaymentMethodName ? undefined : 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">{t('selectEWallet')}</option>
              {ewallets.map((wallet) => (
                <option key={wallet.id} value={wallet.name}>
                  {wallet.icon} {wallet.name}
                </option>
              ))}
            </select>
            {errors.fromPaymentMethodName && (
              <span className="text-xs text-red-600">{errors.fromPaymentMethodName}</span>
            )}
          </div>
        )}

        {/* From Bank Selection */}
        {formData.fromPaymentMethod === 'bank' && (
          <div className="flex flex-col gap-1" style={{ marginTop: '12px' }}>
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectBank')} *
            </label>
            <select
              name="fromBankId"
              value={formData.fromBankId}
              onChange={handleChange}
              className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.fromBankId ? 'border-red-500' : ''
              }`}
              style={{
                borderColor: errors.fromBankId ? undefined : 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">{t('selectBank')}</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  🏦 {bank.name}
                </option>
              ))}
            </select>
            {errors.fromBankId && <span className="text-xs text-red-600">{errors.fromBankId}</span>}
          </div>
        )}
      </div>

      {/* To Payment Method */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: 'var(--success-light)', 
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}>
          {t('transferTo')} ⬇️
        </h4>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('paymentMethod')} *
          </label>
          <select
            name="toPaymentMethod"
            value={formData.toPaymentMethod}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="cash">💵 {t('cash')}</option>
            <option value="credit_card">💳 {t('creditCard')}</option>
            <option value="e_wallet">📱 {t('eWallet')}</option>
            <option value="bank">🏦 {t('bankTransfer')}</option>
          </select>
        </div>

        {/* To Card Selection */}
        {formData.toPaymentMethod === 'credit_card' && (
          <div className="flex flex-col gap-1" style={{ marginTop: '12px' }}>
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectCard')} *
            </label>
            <select
              name="toCardId"
              value={formData.toCardId}
              onChange={handleChange}
              className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.toCardId ? 'border-red-500' : ''
              }`}
              style={{
                borderColor: errors.toCardId ? undefined : 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">{t('selectCard')}</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  💳 {card.name}
                </option>
              ))}
            </select>
            {errors.toCardId && <span className="text-xs text-red-600">{errors.toCardId}</span>}
          </div>
        )}

        {/* To E-Wallet Selection */}
        {formData.toPaymentMethod === 'e_wallet' && (
          <div className="flex flex-col gap-1" style={{ marginTop: '12px' }}>
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectEWallet')} *
            </label>
            <select
              name="toPaymentMethodName"
              value={formData.toPaymentMethodName}
              onChange={handleChange}
              className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.toPaymentMethodName ? 'border-red-500' : ''
              }`}
              style={{
                borderColor: errors.toPaymentMethodName ? undefined : 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">{t('selectEWallet')}</option>
              {ewallets.map((wallet) => (
                <option key={wallet.id} value={wallet.name}>
                  {wallet.icon} {wallet.name}
                </option>
              ))}
            </select>
            {errors.toPaymentMethodName && (
              <span className="text-xs text-red-600">{errors.toPaymentMethodName}</span>
            )}
          </div>
        )}

        {/* To Bank Selection */}
        {formData.toPaymentMethod === 'bank' && (
          <div className="flex flex-col gap-1" style={{ marginTop: '12px' }}>
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectBank')} *
            </label>
            <select
              name="toBankId"
              value={formData.toBankId}
              onChange={handleChange}
              className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.toBankId ? 'border-red-500' : ''
              }`}
              style={{
                borderColor: errors.toBankId ? undefined : 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">{t('selectBank')}</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  🏦 {bank.name}
                </option>
              ))}
            </select>
            {errors.toBankId && <span className="text-xs text-red-600">{errors.toBankId}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('notesOptional')}
        </label>
        <textarea
          name="note"
          value={formData.note}
          onChange={handleChange}
          placeholder={t('addAnyNotes')}
          rows={2}
          className="px-3 py-2 border rounded resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
    </BaseForm>
  );
};

export default TransferForm;
