import React from 'react';
import { CloseIcon } from '../icons';
import { useLanguage } from '../../contexts/LanguageContext';

interface BaseFormProps {
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onClose?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export const BaseForm: React.FC<BaseFormProps> = ({
  title,
  onSubmit,
  onCancel,
  onClose,
  submitLabel,
  cancelLabel,
  children,
  className = '',
}) => {
  const { t } = useLanguage();

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <button 
          onClick={onClose || onCancel} 
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('cancel')}
          type="button"
        >
          <CloseIcon size={20} />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {children}

        {/* Form Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              fontWeight: 600,
              borderRadius: '6px',
              lineHeight: 1.2,
              transition: 'all 0.2s'
            }}
          >
            {submitLabel || t('save')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              borderRadius: '6px',
              lineHeight: 1.2,
              transition: 'all 0.2s'
            }}
          >
            {cancelLabel || t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};
