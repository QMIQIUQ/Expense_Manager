import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Category, 
  Card, 
  Bank, 
  EWallet,
  ScheduledPaymentType, 
  ScheduledPaymentFrequency,
  PaymentMethodType 
} from '../../types';
import { BaseForm } from '../common/BaseForm';
import { getTodayLocal } from '../../utils/dateUtils';
import { calculateInstallmentAmount } from '../../services/scheduledPaymentService';

interface ScheduledPaymentFormData {
  name: string;
  description: string;
  category: string;
  type: ScheduledPaymentType;
  amount: number;
  totalAmount: number;
  interestRate: number;
  frequency: ScheduledPaymentFrequency;
  dueDay: number;
  startDate: string;
  endDate: string;
  totalInstallments: number;
  paymentMethod: PaymentMethodType;
  cardId: string;
  paymentMethodName: string;
  bankId: string;
  isActive: boolean;
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
  
  const [formData, setFormData] = useState<ScheduledPaymentFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    type: initialData?.type || 'subscription',
    amount: initialData?.amount || 0,
    totalAmount: initialData?.totalAmount || 0,
    interestRate: initialData?.interestRate || 0,
    frequency: initialData?.frequency || 'monthly',
    dueDay: initialData?.dueDay || 1,
    startDate: initialData?.startDate || getTodayLocal(),
    endDate: initialData?.endDate || '',
    totalInstallments: initialData?.totalInstallments || 12,
    paymentMethod: initialData?.paymentMethod || 'cash',
    cardId: initialData?.cardId || '',
    paymentMethodName: initialData?.paymentMethodName || '',
    bankId: initialData?.bankId || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
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
                  value={formData.totalInstallments}
                  onChange={(e) => setFormData({ ...formData, totalInstallments: parseInt(e.target.value) || 1 })}
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
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
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
              value={formData.dueDay}
              onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) || 1 })}
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('startDate')} *
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          />
        </div>

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
