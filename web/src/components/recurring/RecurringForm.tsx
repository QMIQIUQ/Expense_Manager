import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category, Card } from '../../types';
import { BaseForm } from '../common/BaseForm';

interface RecurringFormData {
  description: string;
  amount: number; // dollars
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  dayOfWeek: number;
  dayOfMonth: number;
  isActive: boolean;
  paymentMethod: 'cash' | 'credit_card' | 'e_wallet';
  cardId: string;
  paymentMethodName: string;
}

interface RecurringFormProps {
  initialData?: RecurringFormData;
  categories: Category[];
  cards: Card[];
  onSubmit: (data: RecurringFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const RecurringForm: React.FC<RecurringFormProps> = ({
  initialData,
  categories,
  cards,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = React.useState<RecurringFormData>(
    initialData || {
      description: '',
      amount: 0,
      category: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dayOfWeek: 1,
      dayOfMonth: 1,
      isActive: true,
      paymentMethod: 'cash',
      cardId: '',
      paymentMethodName: '',
    }
  );

  const [amountInCents, setAmountInCents] = React.useState(
    initialData ? Math.round(initialData.amount * 100) : 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: amountInCents / 100
    });
  };

  return (
    <BaseForm
      title={isEditing ? t('editRecurring') : t('addRecurring')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('description')} *</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., Netflix Subscription, Rent"
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
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('amount')} ($) *</label>
            <input
              type="text"
              inputMode="numeric"
              value={(amountInCents / 100).toFixed(2)}
              onChange={(e) => {
                const value = e.target.value;
                const digitsOnly = value.replace(/\D/g, '');
                const cents = parseInt(digitsOnly) || 0;
                setAmountInCents(cents);
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

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('category')} *</label>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('frequency')} *</label>
            <select
              value={formData.frequency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly',
                })
              }
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
              }}
            >
              <option value="daily">{t('freqDaily')}</option>
              <option value="weekly">{t('freqWeekly')}</option>
              <option value="monthly">{t('freqMonthly')}</option>
              <option value="yearly">{t('freqYearly')}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('startDate')} *</label>
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
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('paymentMethod')}</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ 
              ...formData, 
              paymentMethod: e.target.value as 'cash' | 'credit_card' | 'e_wallet',
              cardId: e.target.value !== 'credit_card' ? '' : formData.cardId,
              paymentMethodName: e.target.value !== 'e_wallet' ? '' : formData.paymentMethodName,
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
          </select>
        </div>

        {formData.paymentMethod === 'credit_card' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('selectCard')}</label>
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
                  {card.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.paymentMethod === 'e_wallet' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('eWalletName')}</label>
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
          </div>
        )}
      </div>
    </BaseForm>
  );
};

export default RecurringForm;