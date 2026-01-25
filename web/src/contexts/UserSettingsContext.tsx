import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { userSettingsService } from '../services/userSettingsService';
import { UserSettings, TimeFormat, DateFormat } from '../types';

interface UserSettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  useStepByStepForm: boolean;
  setTimeFormat: (format: TimeFormat) => Promise<void>;
  setDateFormat: (format: DateFormat) => Promise<void>;
  setUseStepByStepForm: (value: boolean) => Promise<void>;
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
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    if (!currentUser) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const userSettings = await userSettingsService.getOrCreate(currentUser.uid);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

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

    try {
      await userSettingsService.update(currentUser.uid, { useStepByStepForm: value });
      setSettings(prev => prev ? { ...prev, useStepByStepForm: value } : null);
    } catch (error) {
      console.error('Error updating step-by-step form setting:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  const value: UserSettingsContextType = {
    settings,
    loading,
    timeFormat: settings?.timeFormat || '24h',
    dateFormat: settings?.dateFormat || 'YYYY-MM-DD',
    useStepByStepForm: settings?.useStepByStepForm || false,
    setTimeFormat,
    setDateFormat,
    setUseStepByStepForm,
    refreshSettings,
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};
