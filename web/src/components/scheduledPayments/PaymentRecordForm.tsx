import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Card, 
  Bank, 
  EWallet,
  ScheduledPayment,
  PaymentMethodType 
} from '../../types';
import { getTodayLocal } from '../../utils/dateUtils';
import { CloseIcon } from '../icons';
import { getCurrencySymbol } from './ScheduledPaymentForm';

interface PaymentRecordFormData {
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  paidDate: string;
  paymentMethod?: PaymentMethodType;
  cardId?: string;
  paymentMethodName?: string;
  bankId?: string;
  note?: string;
}

interface PaymentRecordFormProps {
  scheduledPayment: ScheduledPayment;
  cards?: Card[];
  banks?: Bank[];
  ewallets?: EWallet[];
  onSubmit: (data: PaymentRecordFormData) => void;
  onCancel: () => void;
}

const PaymentRecordForm: React.FC<PaymentRecordFormProps> = ({
  scheduledPayment,
  cards = [],
  banks = [],
  ewallets = [],
  onSubmit,
  onCancel,
}) => {
  const { t } = useLanguage();
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currencySymbol = getCurrencySymbol(scheduledPayment.currency);
  
  const [formData, setFormData] = useState<PaymentRecordFormData>({
    expectedAmount: scheduledPayment.amount,
    actualAmount: scheduledPayment.amount,
    difference: 0,
    periodYear: currentYear,
    periodMonth: currentMonth,
    dueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(scheduledPayment.dueDay).padStart(2, '0')}`,
    paidDate: getTodayLocal(),
    paymentMethod: scheduledPayment.paymentMethod || 'cash',
    cardId: scheduledPayment.cardId || '',
    paymentMethodName: scheduledPayment.paymentMethodName || '',
    bankId: scheduledPayment.bankId || '',
    note: '',
  });

  const [actualAmountInCents, setActualAmountInCents] = useState(
    Math.round(scheduledPayment.amount * 100)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actualAmount = actualAmountInCents / 100;
    onSubmit({
      ...formData,
      actualAmount,
      difference: actualAmount - formData.expectedAmount,
    });
  };

  const difference = (actualAmountInCents / 100) - formData.expectedAmount;

  return (
    <div className="flex flex-col gap-4" style={{ 
      backgroundColor: 'var(--bg-secondary)', 
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid var(--border-color)'
    }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('confirmPayment')}
        </h3>
        <button 
          onClick={onCancel} 
          className="p-1 rounded-full transition-colors"
          style={{ 
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label={t('cancel')}
          type="button"
        >
          <CloseIcon size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Payment Info Summary */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('scheduledPayment')}:</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{scheduledPayment.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('expectedAmount')}:</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{currencySymbol}{scheduledPayment.amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Period Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('year')}
            </label>
            <input
              type="number"
              value={formData.periodYear}
              onChange={(e) => setFormData({ ...formData, periodYear: parseInt(e.target.value) || currentYear })}
              min="2020"
              max="2100"
              className="w-full p-3 rounded-lg outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('month')}
            </label>
            <select
              value={formData.periodMonth}
              onChange={(e) => setFormData({ ...formData, periodMonth: parseInt(e.target.value) })}
              className="w-full p-3 rounded-lg outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actual Amount Paid */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('actualAmountPaid')} ({currencySymbol}) *
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={(actualAmountInCents / 100).toFixed(2)}
            onChange={(e) => {
              const value = e.target.value;
              const digitsOnly = value.replace(/\D/g, '');
              const cents = parseInt(digitsOnly) || 0;
              setActualAmountInCents(cents);
            }}
            onFocus={(e) => e.target.select()}
            required
            className="w-full p-3 rounded-lg outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          />
        </div>

        {/* Difference Display */}
        {difference !== 0 && (
          <div 
            className="p-3 rounded-lg text-sm"
            style={{ 
              backgroundColor: difference > 0 ? 'var(--info-bg)' : 'var(--warning-bg)',
              color: difference > 0 ? 'var(--info-text)' : 'var(--warning-text)'
            }}
          >
            {difference > 0 ? (
              <span>💰 {t('overpaid')}: {currencySymbol}{difference.toFixed(2)}</span>
            ) : (
              <span>⚠️ {t('underpaid')}: {currencySymbol}{Math.abs(difference).toFixed(2)}</span>
            )}
          </div>
        )}

        {/* Payment Date */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('paymentDate')} *
          </label>
          <input
            type="date"
            value={formData.paidDate}
            onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
            required
            className="w-full p-3 rounded-lg outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
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
            className="w-full p-3 rounded-lg outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
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
              className="w-full p-3 rounded-lg outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
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
                className="w-full p-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
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
                className="w-full p-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
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
              className="w-full p-3 rounded-lg outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
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

        {/* Note */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('notes')} ({t('optional')})
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder={t('notesPlaceholder')}
            rows={2}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          />
        </div>

        {/* Form Actions - matching BaseForm pattern */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              fontWeight: 600,
              borderRadius: '6px',
              lineHeight: 1.2,
            }}
          >
            ✓ {t('confirmPayment')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              borderRadius: '6px',
              lineHeight: 1.2,
            }}
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentRecordForm;
