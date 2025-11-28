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

interface PaymentRecordFormData {
  expectedAmount: number;
  actualAmount: number;
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
  
  const [formData, setFormData] = useState<PaymentRecordFormData>({
    expectedAmount: scheduledPayment.amount,
    actualAmount: scheduledPayment.amount,
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
    } as PaymentRecordFormData & { difference: number });
  };

  const difference = (actualAmountInCents / 100) - formData.expectedAmount;

  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
      <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        {t('confirmPayment')}
      </h4>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Payment Info Summary */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: 'var(--text-secondary)' }}>{t('scheduledPayment')}:</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{scheduledPayment.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--text-secondary)' }}>{t('expectedAmount')}:</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${scheduledPayment.amount.toFixed(2)}</span>
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
              className="w-full p-3 rounded-lg border"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
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
              className="w-full p-3 rounded-lg border"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
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
            {t('actualAmountPaid')} ($) *
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
            className="w-full p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
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
              <span>💰 {t('overpaid')}: ${difference.toFixed(2)}</span>
            ) : (
              <span>⚠️ {t('underpaid')}: ${Math.abs(difference).toFixed(2)}</span>
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
            className="w-full p-3 rounded-lg border"
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
            className="w-full p-3 rounded-lg border"
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
              className="w-full p-3 rounded-lg border"
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
                className="w-full p-3 rounded-lg border"
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
                className="w-full p-3 rounded-lg border"
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
              className="w-full p-3 rounded-lg border"
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
            className="w-full p-3 rounded-lg border resize-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 p-3 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="flex-1 p-3 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white'
            }}
          >
            ✓ {t('confirmPayment')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentRecordForm;
