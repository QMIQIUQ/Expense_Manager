import React, { useRef, useState } from 'react';
import { Repayment, Card, EWallet, Bank, PaymentMethodType, CurrencyCode, ExpenseSplitParticipant } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { BaseForm } from '../common/BaseForm';
import { useToday } from '../../hooks/useToday';
import { getTodayLocal } from '../../utils/dateUtils';
import DatePicker from '../common/DatePicker';
import PaymentMethodSelector from '../common/PaymentMethodSelector';
import { DEFAULT_BASE_CURRENCY, getCurrencySymbol } from '../../utils/currencyUtils';
import { fromMinorUnits, toMinorUnits } from '../../domain/money';
import CurrencySelector from '../common/CurrencySelector';

interface RepaymentFormProps {
  expenseId: string;
  onSubmit: (repayment: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>) => boolean | void | Promise<boolean | void>;
  splitParticipants?: ExpenseSplitParticipant[];
  onCancel?: () => void;
  initialData?: Repayment;
  maxAmount?: number; // Maximum amount that can be repaid (for validation)
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[]; // Prop threaded through component chain; implementation uses card.bankName directly
  title?: string;
  expenseCurrency?: CurrencyCode;
}

// No component-scoped CSS needed; reuse the same utility classes
// and CSS variables styling pattern used by ExpenseForm to keep
// visual consistency across light/dark themes.

const RepaymentForm: React.FC<RepaymentFormProps> = ({
  splitParticipants = [],
  onSubmit,
  onCancel,
  initialData,
  maxAmount: _maxAmount, // kept for API compatibility but no longer enforced as a hard limit
  cards = [],
  ewallets = [],
  banks: _banks = [],
  title,
  expenseCurrency = DEFAULT_BASE_CURRENCY,
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const today = useToday();
  const [formData, setFormData] = useState({
    splitParticipantId: initialData?.splitParticipantId || '',
    amount: toMinorUnits(initialData?.amount || 0, initialData?.currency || expenseCurrency),
    currency: initialData?.currency || expenseCurrency,
    date: initialData?.date || today,
    payerName: initialData?.payerName || '',
    note: initialData?.note || '',
    paymentMethod: initialData?.paymentMethod || ('cash' as 'cash' | 'credit_card' | 'e_wallet' | 'bank'),
    cardId: initialData?.cardId || '',
    paymentMethodName: initialData?.paymentMethodName || '',
    bankId: initialData?.bankId || '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('pleaseFillField') || 'Please enter a valid amount';
    }
    // Convert amount from cents to dollars
    const amountInDollars = fromMinorUnits(formData.amount, formData.currency);
    if (!formData.date) {
      newErrors.date = t('pleaseFillField') || 'Please select a date';
    }
    if (formData.paymentMethod === 'bank' && !formData.bankId) newErrors.bankId = t('pleaseFillField');
    if (formData.paymentMethod === 'e_wallet' && !formData.paymentMethodName) newErrors.paymentMethodName = t('pleaseFillField');
    if (formData.paymentMethod === 'credit_card' && !formData.cardId) newErrors.cardId = t('pleaseFillField');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    
    // Prepare data and remove undefined/empty fields to prevent Firestore errors
    // Convert amount from cents to dollars
    const submitData: Partial<typeof formData> = { 
      ...formData,
      amount: amountInDollars,
      currency: formData.currency,
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
      delete submitData.bankId;
    } else if (submitData.paymentMethod === 'credit_card') {
      delete submitData.paymentMethodName;
      delete submitData.bankId;
      if (!submitData.cardId) {
        delete submitData.cardId;
      }
    } else if (submitData.paymentMethod === 'e_wallet') {
      delete submitData.cardId;
      delete submitData.bankId;
      if (!submitData.paymentMethodName || submitData.paymentMethodName.trim() === '') {
        delete submitData.paymentMethodName;
      }
    } else if (submitData.paymentMethod === 'bank') {
      delete submitData.cardId;
      delete submitData.paymentMethodName;
      if (!submitData.bankId) {
        delete submitData.bankId;
      }
    }
    
    submitting.current = true; setIsSubmitting(true);
    try {
    const accepted = await onSubmit(submitData as Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>);
    if (accepted === false) return;
    
    if (!initialData) {
      setFormData({
        splitParticipantId: '',
        amount: 0,
        currency: expenseCurrency,
        date: getTodayLocal(),
        payerName: '',
        note: '',
        paymentMethod: 'cash',
        cardId: '',
        paymentMethodName: '',
        bankId: '',
      });
    }
    } catch (error) { setErrors((previous) => ({ ...previous, submit: String(error) })); }
    finally { submitting.current = false; setIsSubmitting(false); }
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
      submitDisabled={isSubmitting}
    >
      {Object.keys(errors).length > 0 && <p role="alert">{errors.submit || t('pleaseFillField')}</p>}
      {splitParticipants.length > 0 && <div className="ledger-panel"><label>{t('ledgerParticipant')}
        <select aria-label={t('ledgerParticipant')} value={formData.splitParticipantId} onChange={(event) => {
          const participant = splitParticipants.find((row) => row.id === event.target.value);
          setFormData((previous) => ({ ...previous, splitParticipantId: event.target.value, payerName: participant?.name ?? previous.payerName }));
        }}><option value="">{t('ledgerUnassigned')}</option>{splitParticipants.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
      </label><p>{t('ledgerSettlementHint')}</p></div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('repaymentAmount')} ({getCurrencySymbol(formData.currency)}) *
          </label>
          <input
            type="text"
            inputMode="numeric"
            id="amount"
            name="amount"
            value={fromMinorUnits(formData.amount, formData.currency).toFixed(formData.currency === 'JPY' ? 0 : 2)}
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

        <CurrencySelector
          value={formData.currency}
          label={t('currency')}
          onChange={(currency) => setFormData((prev) => ({
            ...prev,
            currency,
            amount: toMinorUnits(fromMinorUnits(prev.amount, prev.currency), currency),
          }))}
        />

        <DatePicker
          label={t('repaymentDate')}
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

      {/* Payment Method Selection */}
      <PaymentMethodSelector
        paymentMethod={formData.paymentMethod as PaymentMethodType}
        onPaymentMethodChange={(method) => setFormData(prev => ({
          ...prev,
          paymentMethod: method,
          cardId: method !== 'credit_card' ? '' : prev.cardId,
          paymentMethodName: method !== 'e_wallet' ? '' : prev.paymentMethodName,
          bankId: method !== 'bank' ? '' : prev.bankId,
        }))}
        cardId={formData.cardId}
        onCardChange={(cardId) => setFormData(prev => ({ ...prev, cardId }))}
        bankId={formData.bankId}
        onBankChange={(bankId) => setFormData(prev => ({ ...prev, bankId }))}
        paymentMethodName={formData.paymentMethodName}
        onPaymentMethodNameChange={(name) => setFormData(prev => ({ ...prev, paymentMethodName: name }))}
        cards={cards}
        banks={_banks}
        ewallets={ewallets}
      />

      {/* Moved payer name here to sit right above notes for better mobile flow */}
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
