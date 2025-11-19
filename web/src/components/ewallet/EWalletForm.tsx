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

const responsiveStyles = `
  .form-row {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  @media (min-width: 640px) {
    .form-row {
      flex-direction: row;
    }
  }
`;

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
    <form onSubmit={handleSubmit} style={styles.form}>
      <style>{responsiveStyles}</style>
      <div className="form-row">
        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>{t('eWalletNameLabel')} *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={t('eWalletNamePlaceholder2')}
            style={{
              ...styles.input,
              borderColor: errors.name ? '#f87171' : '#d1d5db',
            }}
            disabled={isSubmitting}
          />
          {errors.name && <span style={styles.errorText}>{errors.name}</span>}
        </div>

        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>
            {t('provider')} ({t('optional')})
          </label>
          <input
            type="text"
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            placeholder={t('providerPlaceholder')}
            style={styles.input}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          {t('accountNumber')} ({t('optional')})
        </label>
        <input
          type="text"
          name="accountNumber"
          value={formData.accountNumber}
          onChange={handleChange}
          placeholder={t('accountNumberPlaceholder')}
          style={styles.input}
          disabled={isSubmitting}
          maxLength={20}
        />
        <p style={styles.helpText}>{t('accountNumberHelp')}</p>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>{t('categoryIcon')} *</label>
        <div style={styles.iconGrid}>
          {EWALLET_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, icon }));
                if (errors.icon) setErrors((prev) => ({ ...prev, icon: '' }));
              }}
              style={{
                ...styles.iconChoice,
                ...(formData.icon === icon ? styles.iconChoiceActive : {}),
              }}
              disabled={isSubmitting}
            >
              {icon}
            </button>
          ))}
        </div>
        {errors.icon && <span style={styles.errorText}>{errors.icon}</span>}
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>{t('categoryColor')} *</label>
        <div style={styles.colorGrid}>
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, color }));
                if (errors.color) setErrors((prev) => ({ ...prev, color: '' }));
              }}
              style={{
                ...styles.colorSwatch,
                backgroundColor: color,
                ...(formData.color === color ? styles.colorSwatchActive : {}),
              }}
              disabled={isSubmitting}
            />
          ))}
        </div>
        <div style={styles.colorInputs}>
          <input
            type="color"
            value={formData.color}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, color: e.target.value }));
              if (errors.color) setErrors((prev) => ({ ...prev, color: '' }));
            }}
            style={styles.colorPicker}
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
            style={styles.input}
            disabled={isSubmitting}
          />
        </div>
        {errors.color && <span style={styles.errorText}>{errors.color}</span>}
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>{t('preview')}</label>
        <div style={{
          ...styles.previewCard,
          borderColor: formData.color,
        }}>
          <span style={styles.previewIcon}>{formData.icon}</span>
          <div>
            <div style={styles.previewName}>{formData.name || t('eWalletNameLabel')}</div>
            {formData.provider && <div style={styles.previewProvider}>{formData.provider}</div>}
            {formData.accountNumber && (
              <div style={styles.previewAccount}>···· {formData.accountNumber}</div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          style={styles.cancelButton}
          disabled={isSubmitting}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          style={{
            ...styles.submitButton,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? t('saving') : initialData ? t('update') : t('add')}
        </button>
      </div>
    </form>
  );
};

export default EWalletForm;

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600 as const,
    color: '#374151',
  },
  input: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  helpText: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  errorText: {
    fontSize: '12px',
    color: '#ef4444',
  },
  iconGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px',
    maxHeight: '180px',
    overflowY: 'auto' as const,
  },
  iconChoice: {
    fontSize: '24px',
    padding: '8px',
    border: '1px solid transparent',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  iconChoiceActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  colorGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px',
  },
  colorSwatch: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
  },
  colorSwatchActive: {
    borderColor: '#6366f1',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
  },
  colorInputs: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  colorPicker: {
    width: '48px',
    height: '40px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: 0,
  },
  previewCard: {
    display: 'flex',
    gap: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px',
    alignItems: 'center',
  },
  previewIcon: {
    fontSize: '32px',
  },
  previewName: {
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  previewProvider: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  previewAccount: {
    color: '#9ca3af',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    color: '#374151',
    fontWeight: 600 as const,
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#6366f1',
    color: '#fff',
    fontWeight: 600 as const,
  },
};
