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

export interface NotificationHistoryItem {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  notificationHistory: NotificationHistoryItem[];
  unreadCount: number;
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
  markAllRead: () => void;
  clearHistory: () => void;
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
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>([]);

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

      setNotifications((prev) => {
        // If notification with same ID exists, don't add duplicate
        if (prev.some((n) => n.id === id)) {
          return prev;
        }
        return [...prev, notification];
      });

      // Add to history (skip pending updates — only log final states)
      if (type !== 'pending') {
        setNotificationHistory((prev) => {
          // Avoid duplicating entries with the same id
          if (prev.some((n) => n.id === id)) return prev;
          const item: NotificationHistoryItem = {
            id,
            type,
            message,
            timestamp: new Date(),
            read: false,
          };
          // Keep at most 50 history items
          return [item, ...prev].slice(0, 50);
        });
      }

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
          // If the updated notification has a meaningful type (not pending), add/update history
          if (updates.type && updates.type !== 'pending' && updates.message) {
            setNotificationHistory((prev) => {
              const existing = prev.find((h) => h.id === id);
              if (existing) {
                return prev.map((h) =>
                  h.id === id
                    ? { ...h, type: updates.type!, message: updates.message!, timestamp: new Date(), read: false }
                    : h
                );
              }
              const item: NotificationHistoryItem = {
                id,
                type: updates.type!,
                message: updates.message!,
                timestamp: new Date(),
                read: false,
              };
              return [item, ...prev].slice(0, 50);
            });
          }
          return updated;
        }
        return n;
      })
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotificationHistory((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearHistory = useCallback(() => {
    setNotificationHistory([]);
  }, []);

  const unreadCount = notificationHistory.filter((n) => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    notificationHistory,
    unreadCount,
    showNotification,
    hideNotification,
    updateNotification,
    markAllRead,
    clearHistory,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
