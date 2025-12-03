import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Category, 
  Card, 
  Bank, 
  EWallet,
  ScheduledPaymentType, 
  ScheduledPaymentFrequency,
  PaymentMethodType,
  PaymentSplitParticipant 
} from '../../types';
import { BaseForm } from '../common/BaseForm';
import { useToday } from '../../hooks/useToday';
import { calculateInstallmentAmount } from '../../services/scheduledPaymentService';
import DatePicker from '../common/DatePicker';

// Common currencies - exported for use in other components
export const CURRENCIES = [
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

// Helper to get currency symbol
export const getCurrencySymbol = (currencyCode?: string): string => {
  if (!currencyCode) return 'RM'; // Default to MYR
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
};

// Helper to format amount with currency
export const formatCurrency = (amount: number, currencyCode?: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
};

interface ScheduledPaymentFormData {
  name: string;
  description: string;
  category: string;
  type: ScheduledPaymentType;
  amount: number;
  totalAmount: number;
  interestRate: number;
  currency: string;
  frequency: ScheduledPaymentFrequency;
  dueDay: number;
  startDate: string;
  endDate: string;
  hasEndDate: boolean;
  totalInstallments: number;
  paymentMethod: PaymentMethodType;
  cardId: string;
  paymentMethodName: string;
  bankId: string;
  isActive: boolean;
  // New fields
  enableReminders: boolean;
  reminderDaysBefore: number;
  autoGenerateExpense: boolean;
  isShared: boolean;
  splitParticipants: PaymentSplitParticipant[];
}

interface ScheduledPaymentFormProps {
  initialData?: Partial<ScheduledPaymentFormData>;
  categories: Category[];
  cards: Card[];
  banks?: Bank[];
  ewallets?: EWallet[];
  onSubmit: (data: ScheduledPaymentFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const ScheduledPaymentForm: React.FC<ScheduledPaymentFormProps> = ({
  initialData,
  categories,
  cards,
  banks = [],
  ewallets = [],
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const { t } = useLanguage();
  const today = useToday();
  
  const [formData, setFormData] = useState<ScheduledPaymentFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    type: initialData?.type || 'subscription',
    amount: initialData?.amount || 0,
    totalAmount: initialData?.totalAmount || 0,
    interestRate: initialData?.interestRate || 0,
    currency: initialData?.currency || 'MYR',
    frequency: initialData?.frequency || 'monthly',
    dueDay: initialData?.dueDay || 1,
    startDate: initialData?.startDate || today,
    endDate: initialData?.endDate || '',
    hasEndDate: initialData?.hasEndDate || false,
    totalInstallments: initialData?.totalInstallments || 12,
    paymentMethod: initialData?.paymentMethod || 'cash',
    cardId: initialData?.cardId || '',
    paymentMethodName: initialData?.paymentMethodName || '',
    bankId: initialData?.bankId || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    // New fields
    enableReminders: initialData?.enableReminders !== undefined ? initialData.enableReminders : true,
    reminderDaysBefore: initialData?.reminderDaysBefore || 3,
    autoGenerateExpense: initialData?.autoGenerateExpense || false,
    isShared: initialData?.isShared || false,
    splitParticipants: initialData?.splitParticipants || [],
  });

  const [amountInCents, setAmountInCents] = useState(
    initialData?.amount ? Math.round(initialData.amount * 100) : 0
  );
  
  const [totalAmountInCents, setTotalAmountInCents] = useState(
    initialData?.totalAmount ? Math.round(initialData.totalAmount * 100) : 0
  );

  const [calculateFromTotal, setCalculateFromTotal] = useState(false);

  // Calculate monthly amount from total when enabled
  useEffect(() => {
    if (calculateFromTotal && formData.type !== 'subscription' && totalAmountInCents > 0 && formData.totalInstallments > 0) {
      const calculatedAmount = calculateInstallmentAmount(
        totalAmountInCents / 100,
        formData.totalInstallments,
        formData.interestRate
      );
      setAmountInCents(Math.round(calculatedAmount * 100));
    }
  }, [calculateFromTotal, totalAmountInCents, formData.totalInstallments, formData.interestRate, formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: amountInCents / 100,
      totalAmount: totalAmountInCents / 100,
    });
  };

  const handleTypeChange = (type: ScheduledPaymentType) => {
    setFormData({ ...formData, type });
    if (type === 'subscription') {
      setCalculateFromTotal(false);
    }
  };

  return (
    <BaseForm
      title={isEditing ? t('editScheduledPayment') : t('addScheduledPayment')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-4">
        {/* Payment Type Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('paymentType')} *
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('subscription')}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                formData.type === 'subscription' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              style={{
                backgroundColor: formData.type === 'subscription' ? 'var(--accent-light)' : 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="text-lg">🔄</span>
              <div className="text-sm font-medium">{t('subscription')}</div>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('installment')}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                formData.type === 'installment' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              style={{
                backgroundColor: formData.type === 'installment' ? 'var(--accent-light)' : 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="text-lg">📅</span>
              <div className="text-sm font-medium">{t('installment')}</div>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('debt')}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                formData.type === 'debt' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              style={{
                backgroundColor: formData.type === 'debt' ? 'var(--accent-light)' : 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="text-lg">💳</span>
              <div className="text-sm font-medium">{t('debt')}</div>
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('name')} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('scheduledPaymentNamePlaceholder')}
            required
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('category')} *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          >
            <option value="">{t('selectCategory')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* For Installment/Debt: Total Amount and Calculate Option */}
        {formData.type !== 'subscription' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('totalAmount')} ($) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={(totalAmountInCents / 100).toFixed(2)}
                onChange={(e) => {
                  const value = e.target.value;
                  const digitsOnly = value.replace(/\D/g, '');
                  const cents = parseInt(digitsOnly) || 0;
                  setTotalAmountInCents(cents);
                }}
                onFocus={(e) => e.target.select()}
                required
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('totalInstallments')} *
                </label>
                <input
                  type="number"
                  value={formData.totalInstallments || ''}
                  onChange={(e) => setFormData({ ...formData, totalInstallments: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  onBlur={(e) => {
                    if (!e.target.value || parseInt(e.target.value) < 1) {
                      setFormData({ ...formData, totalInstallments: 1 });
                    }
                  }}
                  min="1"
                  max="360"
                  required
                  className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('interestRate')} (%)
                </label>
                <input
                  type="number"
                  value={formData.interestRate || ''}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  onBlur={(e) => {
                    if (!e.target.value) {
                      setFormData({ ...formData, interestRate: 0 });
                    }
                  }}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <input
                type="checkbox"
                id="calculateFromTotal"
                checked={calculateFromTotal}
                onChange={(e) => setCalculateFromTotal(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="calculateFromTotal" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('autoCalculateMonthly')}
              </label>
            </div>

            {calculateFromTotal && totalAmountInCents > 0 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}>
                <span className="text-sm">
                  {t('calculatedMonthlyAmount')}: <strong>${(amountInCents / 100).toFixed(2)}</strong>
                  {formData.interestRate > 0 && (
                    <span className="ml-2">
                      ({t('withInterest')}: ${((totalAmountInCents / 100) * (1 + formData.interestRate / 100)).toFixed(2)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </>
        )}

        {/* Amount per period (always shown but can be auto-calculated) */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {formData.frequency === 'monthly' ? t('monthlyAmount') : t('yearlyAmount')} ($) *
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={(amountInCents / 100).toFixed(2)}
            onChange={(e) => {
              const value = e.target.value;
              const digitsOnly = value.replace(/\D/g, '');
              const cents = parseInt(digitsOnly) || 0;
              setAmountInCents(cents);
              if (calculateFromTotal) {
                setCalculateFromTotal(false);
              }
            }}
            onFocus={(e) => e.target.select()}
            required
            disabled={calculateFromTotal && formData.type !== 'subscription'}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            style={{
              backgroundColor: calculateFromTotal && formData.type !== 'subscription' ? 'var(--bg-secondary)' : 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          />
        </div>

        {/* Frequency and Due Day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('frequency')} *
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as ScheduledPaymentFrequency })}
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
              }}
            >
              <option value="monthly">{t('freqMonthly')}</option>
              <option value="yearly">{t('freqYearly')}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('dueDay')} *
            </label>
            <input
              type="number"
              value={formData.dueDay || ''}
              onChange={(e) => setFormData({ ...formData, dueDay: e.target.value === '' ? 0 : parseInt(e.target.value) })}
              onBlur={(e) => {
                if (!e.target.value || parseInt(e.target.value) < 1) {
                  setFormData({ ...formData, dueDay: 1 });
                }
              }}
              min="1"
              max="31"
              required
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
              }}
            />
          </div>
        </div>

        {/* Start Date */}
        <DatePicker
          label={t('startDate')}
          value={formData.startDate}
          onChange={(value) => setFormData({ ...formData, startDate: value })}
          required
          className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          style={{
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)'
          }}
        />

        {/* Payment Method */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('paymentMethod')}
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ 
              ...formData, 
              paymentMethod: e.target.value as PaymentMethodType,
              cardId: e.target.value !== 'credit_card' ? '' : formData.cardId,
              paymentMethodName: e.target.value !== 'e_wallet' ? '' : formData.paymentMethodName,
              bankId: e.target.value !== 'bank' ? '' : formData.bankId,
            })}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          >
            <option value="cash">💵 {t('cash')}</option>
            <option value="credit_card">💳 {t('creditCard')}</option>
            <option value="e_wallet">📱 {t('eWallet')}</option>
            <option value="bank">🏦 {t('bankTransfer')}</option>
          </select>
        </div>

        {/* Card Selection */}
        {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectCard')}
            </label>
            <select
              value={formData.cardId}
              onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
              }}
            >
              <option value="">{t('selectCard')}</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  💳 {card.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* E-Wallet Selection */}
        {formData.paymentMethod === 'e_wallet' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectEWallet')}
            </label>
            {ewallets.length > 0 ? (
              <select
                value={formData.paymentMethodName}
                onChange={(e) => setFormData({ ...formData, paymentMethodName: e.target.value })}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <option value="">{t('selectEWallet')}</option>
                {ewallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.name}>
                    {wallet.icon} {wallet.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.paymentMethodName}
                onChange={(e) => setFormData({ ...formData, paymentMethodName: e.target.value })}
                placeholder={t('eWalletPlaceholder')}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              />
            )}
          </div>
        )}

        {/* Bank Selection */}
        {formData.paymentMethod === 'bank' && banks.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('selectBank')}
            </label>
            <select
              value={formData.bankId}
              onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
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

        {/* Currency Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('currency')}
          </label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          >
            {CURRENCIES.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.symbol} {curr.code} - {curr.name}
              </option>
            ))}
          </select>
        </div>

        {/* End Date Option (for subscriptions) */}
        {formData.type === 'subscription' && (
          <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasEndDate"
                checked={formData.hasEndDate}
                onChange={(e) => setFormData({ ...formData, hasEndDate: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="hasEndDate" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('hasEndDate')}
              </label>
            </div>
            
            {formData.hasEndDate && (
              <DatePicker
                value={formData.endDate}
                onChange={(value) => setFormData({ ...formData, endDate: value })}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              />
            )}
            
            {!formData.hasEndDate && (
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('untilCancelled')}
              </span>
            )}
          </div>
        )}

        {/* Reminder Settings */}
        <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableReminders"
              checked={formData.enableReminders}
              onChange={(e) => setFormData({ ...formData, enableReminders: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="enableReminders" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              🔔 {t('enableReminders')}
            </label>
          </div>
          
          {formData.enableReminders && (
            <div className="flex items-center gap-2 ml-6">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('reminderDaysBefore')}:
              </label>
              <input
                type="number"
                value={formData.reminderDaysBefore || ''}
                onChange={(e) => setFormData({ ...formData, reminderDaysBefore: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                onBlur={(e) => {
                  if (!e.target.value || parseInt(e.target.value) < 1) {
                    setFormData({ ...formData, reminderDaysBefore: 3 });
                  }
                }}
                min="1"
                max="30"
                className="w-16 p-2 rounded-lg border text-center"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('days')}</span>
            </div>
          )}
        </div>

        {/* Auto-generate Expense */}
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <input
            type="checkbox"
            id="autoGenerateExpense"
            checked={formData.autoGenerateExpense}
            onChange={(e) => setFormData({ ...formData, autoGenerateExpense: e.target.checked })}
            className="w-4 h-4"
          />
          <div className="flex flex-col">
            <label htmlFor="autoGenerateExpense" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              📝 {t('autoGenerateExpense')}
            </label>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('autoGenerateExpenseHint')}
            </span>
          </div>
        </div>

        {/* Shared Payment Option */}
        <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isShared"
              checked={formData.isShared}
              onChange={(e) => setFormData({ ...formData, isShared: e.target.checked, splitParticipants: e.target.checked ? formData.splitParticipants : [] })}
              className="w-4 h-4"
            />
            <label htmlFor="isShared" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              👥 {t('sharedPayment')}
            </label>
          </div>
          
          {formData.isShared && (
            <div className="flex flex-col gap-2 ml-6 mt-2">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('splitWith')}:
              </label>
              
              {formData.splitParticipants.map((participant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => {
                      const updated = [...formData.splitParticipants];
                      updated[index].name = e.target.value;
                      setFormData({ ...formData, splitParticipants: updated });
                    }}
                    placeholder={t('personName')}
                    className="flex-1 p-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  />
                  <input
                    type="number"
                    value={participant.shareAmount || ''}
                    onChange={(e) => {
                      const updated = [...formData.splitParticipants];
                      updated[index].shareAmount = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setFormData({ ...formData, splitParticipants: updated });
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        const updated = [...formData.splitParticipants];
                        updated[index].shareAmount = 0;
                        setFormData({ ...formData, splitParticipants: updated });
                      }
                    }}
                    placeholder={t('shareAmount')}
                    min="0"
                    step="0.01"
                    className="w-24 p-2 rounded-lg border text-right"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = formData.splitParticipants.filter((_, i) => i !== index);
                      setFormData({ ...formData, splitParticipants: updated });
                    }}
                    className="p-2 rounded-lg"
                    style={{ color: 'var(--error-text)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    splitParticipants: [...formData.splitParticipants, { name: '', shareAmount: 0 }]
                  });
                }}
                className="flex items-center gap-1 p-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent-primary)'
                }}
              >
                + {t('addPerson')}
              </button>
              
              {formData.splitParticipants.length > 0 && amountInCents > 0 && (
                (() => {
                  const totalParticipantShare = formData.splitParticipants.reduce((sum, p) => sum + p.shareAmount, 0);
                  const yourShare = (amountInCents / 100) - totalParticipantShare;
                  const isInvalid = yourShare < 0;
                  return (
                    <div 
                      className="p-2 rounded-lg text-sm" 
                      style={{ 
                        backgroundColor: isInvalid ? 'var(--error-bg)' : 'var(--success-bg)', 
                        color: isInvalid ? 'var(--error-text)' : 'var(--success-text)' 
                      }}
                    >
                      {t('yourShare')}: {formatCurrency(Math.max(0, yourShare), formData.currency)}
                      {isInvalid && (
                        <span className="ml-2">⚠️ {t('shareExceedsTotal') || 'Shares exceed total amount'}</span>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>

        {/* Description (Optional) */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('description')} ({t('optional')})
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('descriptionPlaceholder')}
            rows={2}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          />
        </div>
      </div>
    </BaseForm>
  );
};

export default ScheduledPaymentForm;
