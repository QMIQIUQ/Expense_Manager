import React, { useState } from 'react';
import { Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface BankFormProps {
  onSubmit: (bank: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  initialData?: Bank;
}

const BankForm: React.FC<BankFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    country: initialData?.country || '',
    code: initialData?.code || '',
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
    onSubmit({ ...formData });
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

      <div className="flex gap-3">
        <button type="submit" className="flex-1 px-4 py-3 rounded-lg text-base font-medium transition-colors" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: 600, borderRadius: 8 }}>{initialData ? t('update') : t('add')}</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-6 py-3 rounded-lg text-base font-medium" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 600 }}>{t('cancel')}</button>}
      </div>
    </form>
  );
};

export default BankForm;
