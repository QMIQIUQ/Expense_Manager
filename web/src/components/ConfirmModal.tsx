import React from 'react';
import { CloseIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  variant?: 'default' | 'danger' | 'warning'; // Added variant prop
}

/**
 * ConfirmModal - A confirmation dialog using the standardized popup UI pattern
 * 
 * Layout structure:
 * ————————————
 * 標題                 x（關閉）
 * ————————————
 * 訊息内容
 * ————————————
 * [確認 80%] [取消 20%]
 * ————————————
 * 
 * Button layout uses 80/20 ratio: confirm action button takes 80%, cancel takes 20%
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  danger = false,
  variant = 'default',
}) => {
  const { t } = useLanguage();
  // Determine button style based on variant or danger prop
  const isDanger = danger || variant === 'danger';
  const isWarning = variant === 'warning';

  const handleConfirm = () => {
    onCancel(); // Close modal immediately
    setTimeout(() => onConfirm(), 0); // Execute in background
  };

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button 
            onClick={onCancel} 
            style={styles.closeButton}
            aria-label={t('close') || 'Close'}
            type="button"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Content */}
        <div style={styles.content}>
          <p style={styles.message}>{message}</p>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Footer - 80/20 button split */}
        <div style={styles.footer}>
          <button
            onClick={handleConfirm}
            style={
              isDanger
                ? { ...styles.confirmButton, ...styles.dangerButton }
                : isWarning
                ? { ...styles.confirmButton, ...styles.warningButton }
                : styles.confirmButton
            }
          >
            {confirmText || t('confirm') || 'Confirm'}
          </button>
          <button onClick={onCancel} style={styles.cancelButton}>
            {cancelText || t('cancel') || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--modal-overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'var(--modal-bg)',
    borderRadius: '16px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 8px 32px var(--shadow-md)',
    border: '1px solid var(--border-color)',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    minHeight: '64px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s ease',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
  },
  content: {
    padding: '24px',
  },
  message: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
  },
  confirmButton: {
    flex: 8,
    padding: '12px 24px',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  },
  cancelButton: {
    flex: 2,
    padding: '12px 16px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  },
  dangerButton: {
    backgroundColor: 'var(--error-text)',
    color: 'white',
  },
  warningButton: {
    backgroundColor: 'var(--warning-text)',
    color: 'white',
  },
};

export default ConfirmModal;
