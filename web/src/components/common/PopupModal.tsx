import React from 'react';
import { CloseIcon } from '../icons';
import { useLanguage } from '../../contexts/LanguageContext';

interface PopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  // Footer buttons configuration
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryButtonDisabled?: boolean;
  // For form submission mode
  isForm?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  // Styling options
  maxWidth?: string;
  primaryButtonVariant?: 'default' | 'danger';
  hideFooter?: boolean;
}

/**
 * PopupModal - A shared popup/modal component with standardized UI layout
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
 * Supports both light and dark modes via CSS variables.
 */
const PopupModal: React.FC<PopupModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  primaryButtonLabel,
  secondaryButtonLabel,
  onPrimaryAction,
  onSecondaryAction,
  primaryButtonDisabled = false,
  isForm = false,
  onSubmit,
  maxWidth = '600px',
  primaryButtonVariant = 'default',
  hideFooter = false,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  // Default labels
  const primaryLabel = primaryButtonLabel || t('save') || 'Save';
  const secondaryLabel = secondaryButtonLabel || t('cancel') || 'Cancel';

  // Handle secondary action - default to onClose
  const handleSecondaryClick = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else {
      onClose();
    }
  };

  // Handle primary action
  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    }
  };

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    } else if (onPrimaryAction) {
      onPrimaryAction();
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const content = (
    <>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <button
          onClick={onClose}
          style={styles.closeButton}
          aria-label={t('close') || 'Close'}
          type="button"
        >
          <CloseIcon size={20} />
        </button>
      </div>

      {/* Divider after header */}
      <div style={styles.divider} />

      {/* Content */}
      <div style={styles.content}>
        {children}
      </div>

      {/* Footer with buttons (80/20 split) */}
      {!hideFooter && (
        <>
          {/* Divider before footer */}
          <div style={styles.divider} />

          <div style={styles.footer}>
            <button
              type={isForm ? 'submit' : 'button'}
              onClick={isForm ? undefined : handlePrimaryClick}
              disabled={primaryButtonDisabled}
              style={{
                ...styles.primaryButton,
                ...(primaryButtonVariant === 'danger' ? styles.dangerButton : {}),
                ...(primaryButtonDisabled ? styles.disabledButton : {}),
              }}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={handleSecondaryClick}
              style={styles.secondaryButton}
            >
              {secondaryLabel}
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      {isForm ? (
        <form
          onSubmit={handleFormSubmit}
          style={{ ...styles.modal, maxWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </form>
      ) : (
        <div
          style={{ ...styles.modal, maxWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      )}
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
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'var(--modal-bg)',
    color: 'var(--text-primary)',
    borderRadius: '16px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px var(--shadow-md)',
    border: '1px solid var(--border-color)',
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
    margin: '0',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    flex: '8',
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
  secondaryButton: {
    flex: '2',
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
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default PopupModal;
