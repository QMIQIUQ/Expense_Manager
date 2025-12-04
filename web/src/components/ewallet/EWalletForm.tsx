import React, { useState } from 'react';
import { EWallet } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { BaseForm } from '../common/BaseForm';

interface EWalletFormProps {
  onSubmit: (ewallet: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  initialData?: EWallet;
  title?: string;
}

// Common e-wallet icons
const EWALLET_ICONS = [
  '💳', '📱', '💰', '🏦', '💵', '💴', '💶', '💷',
  '🅰️', '🍎', '🔵', '🟢', '🟡', '🟣', '🔴', '⚪',
  '📲', '💻', '🖥️', '⌚', '📞', '☎️', '💸', '💹',
];

// Preset colors
const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#95A5A6', '#003087', '#000000',
  '#4285F4', '#1677FF', '#07C160', '#FF9500', '#5856D6',
];

const EWalletForm: React.FC<EWalletFormProps> = ({ onSubmit, onCancel, initialData, title }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    icon: initialData?.icon || '💳',
    color: initialData?.color || '#4285F4',
    provider: initialData?.provider || '',
    accountNumber: initialData?.accountNumber || '',
    balance: initialData?.balance?.toString() || '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = t('pleaseFillField');
    }
    if (!formData.icon) {
      newErrors.icon = t('pleaseFillField');
    }
    if (!formData.color) {
      newErrors.color = t('pleaseFillField');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
      };

      const trimmedProvider = formData.provider.trim();
      if (trimmedProvider) {
        payload.provider = trimmedProvider;
      }

      const trimmedAccount = formData.accountNumber.trim();
      if (trimmedAccount) {
        payload.accountNumber = trimmedAccount;
      }

      // Include balance if provided
      const balanceValue = parseFloat(formData.balance);
      if (!isNaN(balanceValue)) {
        payload.balance = balanceValue;
      }

      await onSubmit(payload);
    } catch (error) {
      console.error('Error submitting e-wallet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseForm
      title={title || (initialData ? t('editEWallet') : t('addEWallet') || 'Add E-Wallet')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={isSubmitting ? t('saving') : initialData ? t('update') : t('add')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('eWalletNameLabel')} *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder={t('eWalletNamePlaceholder2')}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.name ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: errors.name ? undefined : 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
            disabled={isSubmitting}
          />
          {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('provider')} ({t('optional')})
          </label>
          <input
            type="text"
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder={t('providerPlaceholder')}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('accountNumber')} ({t('optional')})
        </label>
        <input
          type="text"
          name="accountNumber"
          value={formData.accountNumber}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder={t('accountNumberPlaceholder')}
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
          disabled={isSubmitting}
          maxLength={20}
        />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('accountNumberHelp')}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('initialBalance')} ({t('optional')})
        </label>
        <input
          type="number"
          name="balance"
          value={formData.balance}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="0.00"
          step="0.01"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
          disabled={isSubmitting}
        />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('setInitialBalance')}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('categoryIcon')} *</label>
        <div 
          className="flex flex-wrap gap-2 border rounded-lg p-3 max-h-48 overflow-y-auto"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {EWALLET_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, icon }));
                if (errors.icon) setErrors((prev) => ({ ...prev, icon: '' }));
              }}
              className={`text-2xl p-2 border rounded transition-colors ${
                formData.icon === icon ? 'border-primary' : 'border-transparent'
              }`}
              style={{
                backgroundColor: formData.icon === icon ? 'var(--accent-light)' : 'transparent',
              }}
              disabled={isSubmitting}
            >
              {icon}
            </button>
          ))}
        </div>
        {errors.icon && <span className="text-xs text-red-600">{errors.icon}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('categoryColor')} *</label>
        <div 
          className="flex flex-wrap gap-2 border rounded-lg p-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, color }));
                if (errors.color) setErrors((prev) => ({ ...prev, color: '' }));
              }}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                formData.color === color ? 'border-primary shadow-md' : 'border-transparent'
              }`}
              style={{
                backgroundColor: color,
              }}
              disabled={isSubmitting}
            />
          ))}
        </div>
        <div className="flex gap-3 items-center mt-2">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, color: e.target.value }));
              if (errors.color) setErrors((prev) => ({ ...prev, color: '' }));
            }}
            className="w-12 h-10 border rounded cursor-pointer"
            style={{ borderColor: 'var(--border-color)' }}
            disabled={isSubmitting}
          />
          <input
            type="text"
            value={formData.color}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, color: e.target.value }));
              if (errors.color) setErrors((prev) => ({ ...prev, color: '' }));
            }}
            placeholder="#000000"
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
            disabled={isSubmitting}
          />
        </div>
        {errors.color && <span className="text-xs text-red-600">{errors.color}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('preview')}</label>
        <div 
          className="flex gap-3 border rounded-lg p-3 items-center"
          style={{
            borderColor: formData.color,
            backgroundColor: 'var(--card-bg)',
          }}
        >
          <span className="text-3xl">{formData.icon}</span>
          <div>
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formData.name || t('eWalletNameLabel')}
            </div>
            {formData.provider && (
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {formData.provider}
              </div>
            )}
            {formData.accountNumber && (
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                ···· {formData.accountNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer removed - handled by BaseForm */}
    </BaseForm>
  );
};

export default EWalletForm;
