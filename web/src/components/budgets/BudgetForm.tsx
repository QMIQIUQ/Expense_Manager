import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types';
import { BaseForm } from '../common/BaseForm';
import { getTodayLocal } from '../../utils/dateUtils';

interface BudgetFormData {
  categoryId: string;
  categoryName: string;
  amount: number; // stored in cents
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  alertThreshold: number;
}

interface BudgetFormProps {
  initialData?: BudgetFormData;
  categories: Category[];
  onSubmit: (data: BudgetFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const BudgetForm: React.FC<BudgetFormProps> = ({
  initialData,
  categories,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = React.useState<BudgetFormData>(
    initialData || {
      categoryId: '',
      categoryName: '',
      amount: 0,
      period: 'monthly',
      startDate: getTodayLocal(),
      alertThreshold: 80,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
    if (!selectedCategory) return;

    onSubmit({
      ...formData,
      categoryName: selectedCategory.name,
    });
  };

  return (
    <BaseForm
      title={isEditing ? t('editBudget') : t('setBudget')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('category')} *</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">{t('selectCategory')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('amount')} ($) *</label>
            <input
              type="text"
              inputMode="numeric"
              value={(formData.amount / 100).toFixed(2)}
              onChange={(e) => {
                const value = e.target.value;
                const digitsOnly = value.replace(/\D/g, '');
                const amountInCents = parseInt(digitsOnly) || 0;
                setFormData({ ...formData, amount: amountInCents });
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
              required
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('budgetPeriod')} *</label>
            <select
              value={formData.period}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  period: e.target.value as 'monthly' | 'weekly' | 'yearly',
                })
              }
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="weekly">{t('periodWeekly')}</option>
              <option value="monthly">{t('periodMonthly')}</option>
              <option value="yearly">{t('periodYearly')}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('alertAt')} (%) *</label>
            <input
              type="number"
              value={formData.alertThreshold}
              onChange={(e) =>
                setFormData({ ...formData, alertThreshold: parseInt(e.target.value) || 0 })
              }
              onFocus={(e) => e.target.select()}
              min="1"
              max="100"
              required
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>
      </div>
    </BaseForm>
  );
};

export default BudgetForm;