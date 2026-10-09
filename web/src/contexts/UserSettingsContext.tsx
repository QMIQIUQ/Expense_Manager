import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { userSettingsService } from '../services/userSettingsService';
import { UserSettings, TimeFormat, DateFormat, DateShortcut, CurrencyCode } from '../types';

interface UserSettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  useStepByStepForm: boolean;
  dateShortcuts?: DateShortcut[];
  displayCurrency: CurrencyCode;
  displayCurrencyReady: boolean;
  setTimeFormat: (format: TimeFormat) => Promise<void>;
  setDateFormat: (format: DateFormat) => Promise<void>;
  setUseStepByStepForm: (value: boolean) => Promise<void>;
  setDateShortcuts: (shortcuts: DateShortcut[]) => Promise<void>;
  setDisplayCurrency: (currency: CurrencyCode) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within UserSettingsProvider');
  }
  return context;
};

interface UserSettingsProviderProps {
  children: ReactNode;
}

export const UserSettingsProvider: React.FC<UserSettingsProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid ?? null;
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const latestUserIdRef = useRef(userId);
  const currencyWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const currencyWriteIdRef = useRef(0);
  latestUserIdRef.current = userId;

  useEffect(() => {
    let cancelled = false;
    setSettings(null);
    setLoading(Boolean(userId));

    if (!userId) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    userSettingsService.getOrCreate(userId, true)
      .then((userSettings) => {
        if (!cancelled) setSettings(userSettings);
      })
      .catch((error) => {
        console.error('Error loading user settings:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const displayCurrencyReady = Boolean(
    userId && !loading && settings && (settings.userId === userId || settings.id === userId)
  );

  const loadSettings = async (forceRefresh: boolean = false) => {
    if (!userId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userSettings = await userSettingsService.getOrCreate(userId, forceRefresh);
      if (latestUserIdRef.current === userId) setSettings(userSettings);
    } catch (error) {
      console.error('Error loading user settings:', error);
      throw error;
    } finally {
      if (latestUserIdRef.current === userId) setLoading(false);
    }
  };

  const setTimeFormat = async (format: TimeFormat) => {
    if (!currentUser || !settings) return;

    try {
      await userSettingsService.update(currentUser.uid, { timeFormat: format });
      setSettings(prev => prev ? { ...prev, timeFormat: format } : null);
    } catch (error) {
      console.error('Error updating time format:', error);
      throw error;
    }
  };

  const setDateFormat = async (format: DateFormat) => {
    if (!currentUser || !settings) return;

    try {
      await userSettingsService.update(currentUser.uid, { dateFormat: format });
      setSettings(prev => prev ? { ...prev, dateFormat: format } : null);
    } catch (error) {
      console.error('Error updating date format:', error);
      throw error;
    }
  };

  const setUseStepByStepForm = async (value: boolean) => {
    if (!currentUser || !settings) return;

    // Optimistic update - set local state immediately
    setSettings(prev => prev ? { ...prev, useStepByStepForm: value } : null);
    
    try {
      await userSettingsService.update(currentUser.uid, { useStepByStepForm: value });
    } catch (error) {
      // Rollback on error
      setSettings(prev => prev ? { ...prev, useStepByStepForm: !value } : null);
      console.error('Error updating step-by-step form setting:', error);
      throw error;
    }
  };

  const setDateShortcuts = async (shortcuts: DateShortcut[]) => {
    if (!currentUser || !settings) return;

    // Capture previous value before optimistic update to allow accurate rollback
    const previousShortcuts = settings.dateShortcuts;

    // Optimistic update
    setSettings(prev => prev ? { ...prev, dateShortcuts: shortcuts } : null);

    try {
      await userSettingsService.update(currentUser.uid, { dateShortcuts: shortcuts });
    } catch (error) {
      // Rollback to the captured previous value
      setSettings(prev => prev ? { ...prev, dateShortcuts: previousShortcuts } : null);
      console.error('Error updating date shortcuts:', error);
      throw error;
    }
  };

  const setDisplayCurrency = async (currency: CurrencyCode) => {
    if (!userId) throw new Error('A signed-in user is required to save display currency');
    if (!displayCurrencyReady || !settings) throw new Error('User settings are not ready');

    const uid = userId;
    const previousCurrency = settings.displayCurrency || 'MYR';
    const requestId = ++currencyWriteIdRef.current;
    setSettings((prev) => prev ? { ...prev, displayCurrency: currency } : null);

    const write = currencyWriteQueueRef.current
      .catch(() => undefined)
      .then(() => userSettingsService.update(uid, { displayCurrency: currency }));
    currencyWriteQueueRef.current = write.catch(() => undefined);

    try {
      await write;
    } catch (error) {
      if (currencyWriteIdRef.current === requestId && latestUserIdRef.current === uid) {
        setSettings((prev) => prev && (prev.userId === uid || prev.id === uid)
          ? { ...prev, displayCurrency: previousCurrency }
          : prev);
      }
      console.error('Error updating display currency:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    await loadSettings(true); // Force refresh from server
  };

  const value: UserSettingsContextType = {
    settings,
    loading,
    timeFormat: settings?.timeFormat || '24h',
    dateFormat: settings?.dateFormat || 'YYYY-MM-DD',
    useStepByStepForm: settings?.useStepByStepForm ?? false,
    dateShortcuts: settings?.dateShortcuts,
    displayCurrency: settings?.displayCurrency || 'MYR',
    displayCurrencyReady,
    setTimeFormat,
    setDateFormat,
    setUseStepByStepForm,
    setDateShortcuts,
    setDisplayCurrency,
    refreshSettings,
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};
