import React from 'react';

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

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  variant = 'default',
}) => {
  // Determine button style based on variant or danger prop
  const isDanger = danger || variant === 'danger';
  const isWarning = variant === 'warning';
  if (!isOpen) return null;

  const handleConfirm = () => {
    onCancel(); // Close modal immediately
    setTimeout(() => onConfirm(), 0); // Execute in background
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <button onClick={onCancel} style={styles.cancelButton}>
            {cancelText}
          </button>
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
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#333',
  },
  message: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap' as const,
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
};

export default ConfirmModal;
