import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { Category, Card, Bank, PaymentMethodType } from '../../types';
import { BaseForm } from '../common/BaseForm';
import { useToday } from '../../hooks/useToday';
import DatePicker from '../common/DatePicker';
import AutocompleteDropdown, { AutocompleteOption } from '../common/AutocompleteDropdown';
import PaymentMethodSelector from '../common/PaymentMethodSelector';

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
  paymentMethod: 'cash' | 'credit_card' | 'e_wallet' | 'bank';
  cardId: string;
  paymentMethodName: string;
  bankId: string;
}

interface RecurringFormProps {
  initialData?: RecurringFormData;
  categories: Category[];
  cards: Card[];
  banks?: Bank[];
  onSubmit: (data: RecurringFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const RecurringForm: React.FC<RecurringFormProps> = ({
  initialData,
  categories,
  cards,
  banks = [],
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const today = useToday();
  const [formData, setFormData] = React.useState<RecurringFormData>(
    initialData || {
      description: '',
      amount: 0,
      category: '',
      frequency: 'monthly',
      startDate: today,
      endDate: '',
      dayOfWeek: 1,
      dayOfMonth: 1,
      isActive: true,
      paymentMethod: 'cash',
      cardId: '',
      paymentMethodName: '',
      bankId: '',
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
            <AutocompleteDropdown
              options={categories.map((cat): AutocompleteOption => ({
                id: cat.name,
                label: cat.name,
                icon: cat.icon,
                color: cat.color,
              }))}
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              label={`${t('category')} *`}
              placeholder={t('selectCategory')}
              allowClear={false}
            />
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

          <DatePicker
            label={t('startDate')}
            value={formData.startDate}
            onChange={(value) => setFormData({ ...formData, startDate: value })}
            required
            dateFormat={dateFormat}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          />
        </div>

        {/* Payment Method Selection */}
        <PaymentMethodSelector
          paymentMethod={formData.paymentMethod as PaymentMethodType}
          onPaymentMethodChange={(method) => setFormData({ 
            ...formData, 
            paymentMethod: method,
            cardId: method !== 'credit_card' ? '' : formData.cardId,
            paymentMethodName: method !== 'e_wallet' ? '' : formData.paymentMethodName,
            bankId: method !== 'bank' ? '' : formData.bankId,
          })}
          cardId={formData.cardId}
          onCardChange={(cardId) => setFormData({ ...formData, cardId })}
          bankId={formData.bankId}
          onBankChange={(bankId) => setFormData({ ...formData, bankId })}
          paymentMethodName={formData.paymentMethodName}
          onPaymentMethodNameChange={(name) => setFormData({ ...formData, paymentMethodName: name })}
          cards={cards}
          banks={banks}
          ewallets={[]}
        />
      </div>
    </BaseForm>
  );
};

export default RecurringForm;