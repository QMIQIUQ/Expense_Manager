import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'pending';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // 0 for persistent, milliseconds otherwise
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (
    type: NotificationType,
    message: string,
    options?: {
      duration?: number;
      actions?: Array<{ label: string; onClick: () => void }>;
      id?: string;
    }
  ) => string;
  hideNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (
      type: NotificationType,
      message: string,
      options?: {
        duration?: number;
        actions?: Array<{ label: string; onClick: () => void }>;
        id?: string;
      }
    ) => {
      const id = options?.id || `notification-${Date.now()}-${Math.random()}`;
      const duration = options?.duration !== undefined ? options.duration : 5000; // Default 5s

      const notification: Notification = {
        id,
        type,
        message,
        duration,
        actions: options?.actions,
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-dismiss if duration > 0
      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const updated = { ...n, ...updates };
          // If duration changed to > 0, set auto-dismiss
          if (updates.duration !== undefined && updates.duration > 0) {
            setTimeout(() => {
              setNotifications((curr) => curr.filter((notif) => notif.id !== id));
            }, updates.duration);
          }
          return updated;
        }
        return n;
      })
    );
  }, []);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    hideNotification,
    updateNotification,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
