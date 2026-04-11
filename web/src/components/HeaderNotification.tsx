import React from 'react';
import { useNotification, Notification } from '../contexts/NotificationContext';

const HeaderNotification: React.FC = () => {
  const { notifications, hideNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  const getNotificationStyle = (type: Notification['type']) => {
    const baseStyle = {
      ...styles.notification,
    };

    // Use theme-aware backgrounds with proper contrast
    switch (type) {
      case 'success':
        return { 
          ...baseStyle, 
          backgroundColor: 'var(--success-text)',
          color: '#ffffff',
        };
      case 'error':
        return { 
          ...baseStyle, 
          backgroundColor: 'var(--error-text)',
          color: '#ffffff',
        };
      case 'info':
        return { 
          ...baseStyle, 
          backgroundColor: 'var(--info-text)',
          color: '#ffffff',
        };
      case 'pending':
        return { 
          ...baseStyle, 
          backgroundColor: 'var(--warning-text)',
          color: '#ffffff',
        };
      default:
        return baseStyle;
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      case 'pending':
        return '⟳';
      default:
        return '';
    }
  };

  return (
    <div style={styles.container}>
      {notifications.map((notification) => (
        <div key={notification.id} style={getNotificationStyle(notification.type)}>
          <div style={styles.content}>
            <span style={styles.icon}>{getIcon(notification.type)}</span>
            <span style={styles.message}>{notification.message}</span>
          </div>
          <div style={styles.actions}>
            {notification.actions?.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  hideNotification(notification.id);
                }}
                style={styles.actionButton}
              >
                {action.label}
              </button>
            ))}
            <button
              onClick={() => hideNotification(notification.id)}
              style={styles.closeButton}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    maxWidth: '400px',
    width: '100%',
  },
  notification: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: '8px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.3s ease-out',
    gap: '12px',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  icon: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
  },
  message: {
    fontSize: '14px',
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  closeButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0.8,
    transition: 'opacity 0.2s',
  },
};

export default HeaderNotification;
