import React, { useState } from 'react';
import { Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { BaseForm } from '../common/BaseForm';

interface BankFormProps {
  onSubmit: (bank: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  initialData?: Bank;
  title?: string;
}

const BankForm: React.FC<BankFormProps> = ({ onSubmit, onCancel, initialData, title }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    country: initialData?.country || '',
    code: initialData?.code || '',
    balance: initialData?.balance?.toString() || '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = t('pleaseFillField') || 'Please fill in';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    
    // Build payload with optional balance
    const payload: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      name: formData.name,
      country: formData.country,
      code: formData.code,
    };
    
    // Include balance if provided
    const balanceValue = parseFloat(formData.balance);
    if (!isNaN(balanceValue)) {
      payload.balance = balanceValue;
    }
    
    onSubmit(payload);
    if (onCancel) onCancel();
  };

  return (
    <BaseForm
      title={title || (initialData ? t('editBank') || 'Edit Bank' : t('addBank') || 'Add Bank')}
      onSubmit={handleSubmit}
      onCancel={onCancel || (() => {})}
      submitLabel={initialData ? t('update') : t('add')}
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('bankName')} *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: errors.name ? '#ef4444' : 'var(--border-color)' }}
        />
        {errors.name && (<span className="text-xs text-red-600">{errors.name}</span>)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('country')}</label>
          <input name="country" value={formData.country} onChange={handleChange} className="px-3 py-2 border rounded focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('bankCode')}</label>
          <input name="code" value={formData.code} onChange={handleChange} className="px-3 py-2 border rounded focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }} />
        </div>
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
          placeholder="0.00"
          step="0.01"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
        />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('setInitialBalance')}</p>
      </div>

      {/* Footer removed - handled by BaseForm */}
    </BaseForm>
  );
};

export default BankForm;
