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
  submitDisabled?: boolean;
}

/**
 * BaseForm - A shared inline form component with standardized UI layout
 * 
 * Layout structure:
 * ————————————
 * 標題                 x（關閉）
 * ————————————
 * 内容區域
 * ————————————
 * [確認/保存 80%] [取消 20%]
 * ————————————
 * 
 * Button layout uses 80/20 ratio: primary action button takes 80%, cancel takes 20%
 */
export const BaseForm: React.FC<BaseFormProps> = ({
  title,
  onSubmit,
  onCancel,
  onClose,
  submitLabel,
  cancelLabel,
  children,
  className = '',
  submitDisabled = false,
}) => {
  const { t } = useLanguage();

  return (
    <div className={`flex flex-col ${className}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <button 
          onClick={onClose || onCancel} 
          style={styles.closeButton}
          aria-label={t('close') || 'Close'}
          type="button"
        >
          <CloseIcon size={20} />
        </button>
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Form Body */}
      <form onSubmit={onSubmit} noValidate style={styles.form}>
        <div style={styles.content}>
          {children}
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Form Actions - 80/20 split */}
        <div style={styles.footer}>
          <button
            type="submit"
            disabled={submitDisabled}
            style={{
              ...styles.primaryButton,
              ...(submitDisabled ? styles.disabledButton : {}),
            }}
          >
            {submitLabel || t('save')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={styles.secondaryButton}
          >
            {cancelLabel || t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    minHeight: '56px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s ease',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
  },
  primaryButton: {
    flex: 8,
    padding: '10px 20px',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '42px',
  },
  secondaryButton: {
    flex: 2,
    padding: '10px 16px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '42px',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
