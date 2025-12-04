import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { Category } from '../../types';
import { BaseForm } from '../common/BaseForm';
import { getTodayLocal } from '../../utils/dateUtils';
import DatePicker from '../common/DatePicker';
import AutocompleteDropdown, { AutocompleteOption } from '../common/AutocompleteDropdown';

interface BudgetFormData {
  categoryId: string;
  categoryName: string;
  amount: number; // stored in cents
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  alertThreshold: number;
  // Rollover fields
  rolloverEnabled?: boolean;
  rolloverPercentage?: number;
  rolloverCap?: number;
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
  const { dateFormat } = useUserSettings();
  const [showRolloverSettings, setShowRolloverSettings] = React.useState(initialData?.rolloverEnabled || false);
  const [formData, setFormData] = React.useState<BudgetFormData>(
    initialData || {
      categoryId: '',
      categoryName: '',
      amount: 0,
      period: 'monthly',
      startDate: getTodayLocal(),
      alertThreshold: 80,
      rolloverEnabled: false,
      rolloverPercentage: 100,
      rolloverCap: undefined,
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
      title={isEditing ? t('editBudget') : t('addBudget')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <AutocompleteDropdown
              options={categories.map((cat): AutocompleteOption => ({
                id: cat.id,
                label: cat.name,
                icon: cat.icon,
                color: cat.color,
              }))}
              value={formData.categoryId}
              onChange={(value) => setFormData({ ...formData, categoryId: value })}
              label={`${t('category')} *`}
              placeholder={t('selectCategory')}
              allowClear={false}
            />
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
            {formData.period === 'monthly' && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {t('monthlyBudgetNote') || 'Uses your billing cycle day from settings'}
              </p>
            )}
          </div>

          {/* Show start date only for weekly/yearly budgets */}
          {formData.period !== 'monthly' && (
            <DatePicker
              label={t('startDate')}
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value })}
              required
              dateFormat={dateFormat}
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)'
              }}
            />
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('alertAt')} *</label>
            <input
              type="number"
              value={formData.alertThreshold || ''}
              onChange={(e) =>
                setFormData({ ...formData, alertThreshold: e.target.value === '' ? 0 : parseInt(e.target.value) })
              }
              onBlur={(e) => {
                if (!e.target.value || parseInt(e.target.value) < 1) {
                  setFormData({ ...formData, alertThreshold: 80 });
                }
              }}
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

        {/* Rollover Settings */}
        <div 
          className="border rounded-lg p-3"
          style={{ 
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                🔄 {t('rolloverBudget') || 'Rollover Budget'}
              </label>
              <span 
                className="text-xs px-2 py-0.5 rounded"
                style={{ 
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent-primary)'
                }}
              >
                {t('optional') || 'Optional'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showRolloverSettings}
                onChange={(e) => {
                  setShowRolloverSettings(e.target.checked);
                  setFormData({ 
                    ...formData, 
                    rolloverEnabled: e.target.checked,
                    rolloverPercentage: e.target.checked ? (formData.rolloverPercentage || 100) : undefined,
                    rolloverCap: e.target.checked ? formData.rolloverCap : undefined,
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('rolloverDescription') || 'Carry unused budget to the next period'}
          </p>

          {showRolloverSettings && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('rolloverPercentage') || 'Rollover %'}
                </label>
                <select
                  value={formData.rolloverPercentage || 100}
                  onChange={(e) => setFormData({ ...formData, rolloverPercentage: parseInt(e.target.value) })}
                  className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value={100}>{t('fullRollover') || '100% (Full)'}</option>
                  <option value={75}>75%</option>
                  <option value={50}>50%</option>
                  <option value={25}>25%</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('rolloverCap') || 'Max Rollover ($)'}
                </label>
                <input
                  type="number"
                  value={formData.rolloverCap || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    rolloverCap: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder={t('noLimit') || 'No limit'}
                  min="0"
                  step="0.01"
                  className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseForm>
  );
};

export default BudgetForm;