import React, { useState } from 'react';
import { EWallet } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface EWalletFormProps {
  onSubmit: (ewallet: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  initialData?: EWallet;
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

const EWalletForm: React.FC<EWalletFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    icon: initialData?.icon || '💳',
    color: initialData?.color || '#4285F4',
    provider: initialData?.provider || '',
    accountNumber: initialData?.accountNumber || '',
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
      await onSubmit({
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
        provider: formData.provider.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined,
      });
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('eWalletNameLabel')} *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder={t('eWalletNamePlaceholder2')}
          className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
      </div>

      {/* Provider */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('provider')} ({t('optional')})
        </label>
        <input
          type="text"
          name="provider"
          value={formData.provider}
          onChange={handleChange}
          placeholder={t('providerPlaceholder')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
      </div>

      {/* Account Number */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('accountNumber')} ({t('optional')})
        </label>
        <input
          type="text"
          name="accountNumber"
          value={formData.accountNumber}
          onChange={handleChange}
          placeholder={t('accountNumberPlaceholder')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
          maxLength={20}
        />
        <p className="text-xs text-gray-500">{t('accountNumberHelp')}</p>
      </div>

      {/* Icon Picker */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('categoryIcon')} *
        </label>
        <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-md max-h-40 overflow-y-auto">
          {EWALLET_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, icon }));
                if (errors.icon) setErrors((prev) => ({ ...prev, icon: '' }));
              }}
              className={`text-2xl p-2 rounded hover:bg-gray-100 transition-colors ${
                formData.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : ''
              }`}
              disabled={isSubmitting}
            >
              {icon}
            </button>
          ))}
        </div>
        {errors.icon && <span className="text-xs text-red-600">{errors.icon}</span>}
      </div>

      {/* Color Picker */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('categoryColor')} *
        </label>
        <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-md">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, color }));
                if (errors.color) setErrors((prev) => ({ ...prev, color: '' }));
              }}
              className={`w-8 h-8 rounded-full transition-all ${
                formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
              disabled={isSubmitting}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, color: e.target.value }));
              if (errors.color) setErrors((prev) => ({ ...prev, color: '' }));
            }}
            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>
        {errors.color && <span className="text-xs text-red-600">{errors.color}</span>}
      </div>

      {/* Preview */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{t('preview')}</label>
        <div
          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
          style={{ borderColor: formData.color }}
        >
          <span className="text-3xl">{formData.icon}</span>
          <div>
            <div className="font-semibold text-gray-900">
              {formData.name || t('eWalletNameLabel')}
            </div>
            {formData.provider && (
              <div className="text-sm text-gray-500">{formData.provider}</div>
            )}
            {formData.accountNumber && (
              <div className="text-xs text-gray-400">···· {formData.accountNumber}</div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('saving') : initialData ? t('update') : t('add')}
        </button>
      </div>
    </form>
  );
};

export default EWalletForm;
