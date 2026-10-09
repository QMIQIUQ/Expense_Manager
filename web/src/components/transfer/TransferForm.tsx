import React, { useState } from 'react';
import { Transfer, Card, EWallet, Bank, PaymentMethodType, CurrencyCode } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { getTodayLocal } from '../../utils/dateUtils';
import { BaseForm } from '../common/BaseForm';
import { getCurrentTimeLocal } from '../../utils/dateUtils';
import { useToday } from '../../hooks/useToday';
import DatePicker from '../common/DatePicker';
import PaymentMethodSelector from '../common/PaymentMethodSelector';
import CurrencySelector from '../common/CurrencySelector';
import { DEFAULT_BASE_CURRENCY, getCurrencySymbol } from '../../utils/currencyUtils';
import { fromMinorUnits, toMinorUnits } from '../../domain/money';

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
  const { dateFormat } = useUserSettings();
  const today = useToday();
  const [formData, setFormData] = useState({
    amount: 0,
    currency: DEFAULT_BASE_CURRENCY as CurrencyCode,
    toAmount: 0,
    toCurrency: DEFAULT_BASE_CURRENCY as CurrencyCode,
    date: today,
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
    if (formData.currency !== formData.toCurrency && formData.toAmount <= 0) {
      newErrors.toAmount = t('pleaseFillField') || 'Enter the amount received in the destination currency';
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
    const sourceAmount = fromMinorUnits(formData.amount, formData.currency);
    const destinationAmount = formData.currency === formData.toCurrency
      ? sourceAmount
      : fromMinorUnits(formData.toAmount, formData.toCurrency);
    const submitData: Partial<typeof formData> = {
      ...formData,
      amount: sourceAmount,
      toAmount: destinationAmount,
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
      currency: DEFAULT_BASE_CURRENCY,
      toAmount: 0,
      toCurrency: DEFAULT_BASE_CURRENCY,
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

  const handleDestinationAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, toAmount: parseInt(digitsOnly) || 0 }));
    if (errors.toAmount) setErrors((prev) => ({ ...prev, toAmount: '' }));
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('amount')} ({getCurrencySymbol(formData.currency)}) *
          </label>
          <input
            type="text"
            inputMode="numeric"
            name="amount"
            value={fromMinorUnits(formData.amount, formData.currency).toFixed(formData.currency === 'JPY' ? 0 : 2)}
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

        <CurrencySelector
          value={formData.currency}
          label={t('transferFromCurrency') || `${t('transferFrom')} ${t('currency')}`}
          onChange={(currency) => setFormData((prev) => ({
            ...prev,
            currency,
            amount: toMinorUnits(fromMinorUnits(prev.amount, prev.currency), currency),
            ...(currency === prev.toCurrency ? { toAmount: toMinorUnits(fromMinorUnits(prev.amount, prev.currency), currency) } : {}),
          }))}
        />

        <DatePicker
          label={t('date')}
          value={formData.date}
          onChange={(value) => setFormData({ ...formData, date: value })}
          required
          error={!!errors.date}
          errorMessage={errors.date}
          dateFormat={dateFormat}
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: errors.date ? undefined : 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
        />
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

        <PaymentMethodSelector
          paymentMethod={formData.fromPaymentMethod as PaymentMethodType}
          onPaymentMethodChange={(method) => setFormData(prev => ({ ...prev, fromPaymentMethod: method }))}
          cardId={formData.fromCardId}
          onCardChange={(cardId) => setFormData(prev => ({ ...prev, fromCardId: cardId }))}
          bankId={formData.fromBankId}
          onBankChange={(bankId) => setFormData(prev => ({ ...prev, fromBankId: bankId }))}
          paymentMethodName={formData.fromPaymentMethodName}
          onPaymentMethodNameChange={(name) => setFormData(prev => ({ ...prev, fromPaymentMethodName: name }))}
          cards={cards}
          banks={banks}
          ewallets={ewallets}
          showLabels={false}
        />
        {errors.fromCardId && <span className="text-xs text-red-600">{errors.fromCardId}</span>}
        {errors.fromPaymentMethodName && <span className="text-xs text-red-600">{errors.fromPaymentMethodName}</span>}
        {errors.fromBankId && <span className="text-xs text-red-600">{errors.fromBankId}</span>}
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

        <PaymentMethodSelector
          paymentMethod={formData.toPaymentMethod as PaymentMethodType}
          onPaymentMethodChange={(method) => setFormData(prev => ({ ...prev, toPaymentMethod: method }))}
          cardId={formData.toCardId}
          onCardChange={(cardId) => setFormData(prev => ({ ...prev, toCardId: cardId }))}
          bankId={formData.toBankId}
          onBankChange={(bankId) => setFormData(prev => ({ ...prev, toBankId: bankId }))}
          paymentMethodName={formData.toPaymentMethodName}
          onPaymentMethodNameChange={(name) => setFormData(prev => ({ ...prev, toPaymentMethodName: name }))}
          cards={cards}
          banks={banks}
          ewallets={ewallets}
          showLabels={false}
        />
        {errors.toCardId && <span className="text-xs text-red-600">{errors.toCardId}</span>}
        {errors.toPaymentMethodName && <span className="text-xs text-red-600">{errors.toPaymentMethodName}</span>}
        {errors.toBankId && <span className="text-xs text-red-600">{errors.toBankId}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CurrencySelector
          value={formData.toCurrency}
          label={t('transferToCurrency') || `${t('transferTo')} ${t('currency')}`}
          onChange={(toCurrency) => setFormData((prev) => ({
            ...prev,
            toCurrency,
            ...(toCurrency === prev.currency ? { toAmount: toMinorUnits(fromMinorUnits(prev.amount, prev.currency), toCurrency) } : {}),
          }))}
        />
        {formData.currency !== formData.toCurrency && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('destinationAmount') || 'Amount received'} ({getCurrencySymbol(formData.toCurrency)}) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={fromMinorUnits(formData.toAmount, formData.toCurrency).toFixed(formData.toCurrency === 'JPY' ? 0 : 2)}
              onChange={handleDestinationAmountChange}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${errors.toAmount ? 'border-red-500' : ''}`}
              style={{ borderColor: errors.toAmount ? undefined : 'var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }}
            />
            {errors.toAmount && <span className="text-xs text-red-600">{errors.toAmount}</span>}
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
