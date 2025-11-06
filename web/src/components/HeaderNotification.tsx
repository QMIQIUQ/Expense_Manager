import React from 'react';
import { useNotification, Notification } from '../contexts/NotificationContext';

const HeaderNotification: React.FC = () => {
  const { notifications, hideNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  const getNotificationClasses = (type: Notification['type']) => {
    const baseClasses = 'flex items-center justify-between p-3 sm:p-4 rounded-lg text-white shadow-lg animate-slideIn gap-3';
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-600`;
      case 'error':
        return `${baseClasses} bg-red-600`;
      case 'info':
        return `${baseClasses} bg-blue-600`;
      case 'pending':
        return `${baseClasses} bg-orange-600`;
      default:
        return `${baseClasses} bg-gray-600`;
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
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-full w-full sm:max-w-md px-4 sm:px-0">
      {notifications.map((notification) => (
        <div key={notification.id} className={getNotificationClasses(notification.type)}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xl font-bold flex-shrink-0">{getIcon(notification.type)}</span>
            <span className="text-sm leading-relaxed break-words">{notification.message}</span>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            {notification.actions?.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  hideNotification(notification.id);
                }}
                className="px-3 py-1.5 bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded text-xs font-medium hover:bg-opacity-30 transition-colors"
              >
                {action.label}
              </button>
            ))}
            <button
              onClick={() => hideNotification(notification.id)}
              className="p-1 sm:p-2 bg-transparent text-white border-none text-base cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
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

export default HeaderNotification;
