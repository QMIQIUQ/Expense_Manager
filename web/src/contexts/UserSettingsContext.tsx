import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { userSettingsService } from '../services/userSettingsService';
import { UserSettings, TimeFormat, DateFormat, DateShortcut, CurrencyCode, BudgetPeriod, IncomeLinkedBudgetSettings } from '../types';
import { getQueuedWriteId, queueFailedWrite, writeLocalFirst } from '../utils/localFirstMutation';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
import { validIncomeLink } from '../utils/incomeLinkedBudget';

const isRetryableNetworkError = (error: unknown): boolean => {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code).toLowerCase().split('/').pop()
    : '';
  if (['permission-denied', 'invalid-argument', 'failed-precondition'].includes(code || '')) return false;
  return ['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code || '') ||
    (typeof navigator !== 'undefined' && !navigator.onLine);
};

const enqueueSettingsUpdate = async (error: unknown, userId: string, updates: Partial<UserSettings>): Promise<boolean> =>
  (await queueFailedWrite(error, { type: 'update', entity: 'userSettings', payload: { userId, updates } })) !== null;

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
  setOverallBudgetLimit: (period: BudgetPeriod, amount?: number) => Promise<void>;
  setIncomeLinkedBudget: (config: IncomeLinkedBudgetSettings, manualMonthlyLimit?: number) => Promise<void>;
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
  const latestSettingsRef = useRef(settings);
  const currencyWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const currencyWriteIdRef = useRef(0);
  const overallBudgetWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const overallBudgetWriteIdRef = useRef(0);
  const overallBudgetRequestIdsRef = useRef(new Map<BudgetPeriod, number>());
  const incomeBudgetWriteIdRef = useRef(0);
  latestUserIdRef.current = userId;

  useEffect(() => {
    let cancelled = false;
    setSettings(null);
    latestSettingsRef.current = null;
    setLoading(Boolean(userId));

    if (!userId) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    const cached = sessionCache.get<UserSettings>('userSettings', userId);
    if (cached) {
      const local = applyPendingOperations('userSettings', userId, cached);
      latestSettingsRef.current = local;
      setSettings(local);
      setLoading(false);
    }

    userSettingsService.getOrCreate(userId, true)
      .then((userSettings) => {
        if (!cancelled) {
          latestSettingsRef.current = userSettings;
          setSettings(userSettings);
        }
      })
      .catch((error) => {
        console.error('Error loading user settings:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const handleLocalSettings = () => {
      queueMicrotask(() => {
        if (latestUserIdRef.current !== userId || !latestSettingsRef.current) return;
        const cached = sessionCache.get<UserSettings>('userSettings', userId);
        const local = applyPendingOperations('userSettings', userId, cached ?? latestSettingsRef.current);
        latestSettingsRef.current = local;
        setSettings(local);
      });
    };
    const handleSettingsSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string }>).detail;
      if (detail?.entity !== 'userSettings' || detail.userId !== userId) return;
      void userSettingsService.getOrCreate(userId, true).then((syncedSettings) => {
        if (latestUserIdRef.current === userId) {
          latestSettingsRef.current = syncedSettings;
          setSettings(syncedSettings);
        }
      }).catch((error) => console.error('Failed to refresh synced user settings:', error));
    };
    window.addEventListener('offline-operation-synced', handleSettingsSynced);
    window.addEventListener('offline-queue-changed', handleLocalSettings);
    const handleCachedSettings = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string }>).detail;
      if (detail?.userId === userId && detail.entity === 'userSettings') handleLocalSettings();
    };
    window.addEventListener('session-cache-updated', handleCachedSettings);
    return () => {
      window.removeEventListener('offline-operation-synced', handleSettingsSynced);
      window.removeEventListener('offline-queue-changed', handleLocalSettings);
      window.removeEventListener('session-cache-updated', handleCachedSettings);
    };
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
      if (latestUserIdRef.current === userId) {
        latestSettingsRef.current = userSettings;
        setSettings(userSettings);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      throw error;
    } finally {
      if (latestUserIdRef.current === userId) setLoading(false);
    }
  };

  const updateSettingOptimistically = async <K extends keyof UserSettings,>(key: K, value: UserSettings[K]): Promise<void> => {
    if (!userId) return;
    const baseline = latestSettingsRef.current;
    if (!baseline || (baseline.userId !== userId && baseline.id !== userId)) return;
    const optimistic = { ...baseline, [key]: value };
    latestSettingsRef.current = optimistic;
    setSettings(optimistic);
    try {
      await writeLocalFirst({ type: 'update', entity: 'userSettings', payload: { userId, updates: { [key]: value } } },
        () => userSettingsService.update(userId, { [key]: value }));
    } catch (error) {
      if (isRetryableNetworkError(error) && await enqueueSettingsUpdate(error, userId, { [key]: value } as Partial<UserSettings>)) return;
      const latest = latestSettingsRef.current;
      if (latest && latest[key] === value) {
        const restored = { ...latest, [key]: baseline[key] };
        latestSettingsRef.current = restored;
        setSettings(restored);
      }
      throw error;
    }
  };

  const setTimeFormat = async (format: TimeFormat) => {
    if (!currentUser || !settings) return;
    await updateSettingOptimistically('timeFormat', format);
  };

  const setDateFormat = async (format: DateFormat) => {
    if (!currentUser || !settings) return;

    await updateSettingOptimistically('dateFormat', format);
  };

  const setUseStepByStepForm = async (value: boolean) => {
    if (!currentUser || !settings) return;

    await updateSettingOptimistically('useStepByStepForm', value);
  };

  const setDateShortcuts = async (shortcuts: DateShortcut[]) => {
    if (!currentUser || !settings) return;

    await updateSettingOptimistically('dateShortcuts', shortcuts);
  };

  const setDisplayCurrency = async (currency: CurrencyCode) => {
    if (!userId) throw new Error('A signed-in user is required to save display currency');
    if (!displayCurrencyReady || !settings) throw new Error('User settings are not ready');

    const uid = userId;
    const previousCurrency = settings.displayCurrency || 'MYR';
    const requestId = ++currencyWriteIdRef.current;
    const optimisticSettings = { ...settings, displayCurrency: currency };
    latestSettingsRef.current = optimisticSettings;
    setSettings(optimisticSettings);

    const write = currencyWriteQueueRef.current
      .catch(() => undefined)
      .then(() => writeLocalFirst({ type: 'update', entity: 'userSettings', payload: { userId: uid, updates: { displayCurrency: currency } } },
        () => userSettingsService.update(uid, { displayCurrency: currency })));
    currencyWriteQueueRef.current = write.catch(() => undefined);

    try {
      await write;
    } catch (error) {
      if (isRetryableNetworkError(error) && await enqueueSettingsUpdate(error, uid, { displayCurrency: currency })) return;
      if (currencyWriteIdRef.current === requestId && latestUserIdRef.current === uid) {
        const latest = latestSettingsRef.current;
        if (latest && (latest.userId === uid || latest.id === uid)) {
          const restored = { ...latest, displayCurrency: previousCurrency };
          latestSettingsRef.current = restored;
          setSettings(restored);
        }
      }
      console.error('Error updating display currency:', error);
      throw error;
    }
  };

  const setOverallBudgetLimit = async (period: BudgetPeriod, amount?: number) => {
    if (!userId) throw new Error('A signed-in user is required to save an overall budget limit');
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      throw new Error('Overall budget limit must be a non-negative number');
    }

    const uid = userId;
    const currentSettings = latestSettingsRef.current;
    if (!currentSettings || (currentSettings.userId !== uid && currentSettings.id !== uid)) {
      throw new Error('User settings are not ready');
    }
    const previousLimit = currentSettings.overallBudgetLimits?.[period];
    const nextLimits = { ...currentSettings.overallBudgetLimits };
    if (amount === undefined) delete nextLimits[period];
    else nextLimits[period] = amount;
    const requestId = ++overallBudgetWriteIdRef.current;
    overallBudgetRequestIdsRef.current.set(period, requestId);
    const optimisticSettings = { ...currentSettings, overallBudgetLimits: nextLimits };
    latestSettingsRef.current = optimisticSettings;
    setSettings(optimisticSettings);

    const write = overallBudgetWriteQueueRef.current
      .catch(() => undefined)
      .then(() => writeLocalFirst({ type: 'update', entity: 'userSettings', payload: { userId: uid, updates: {}, overallBudgetLimit: { period, amount }, previousOverallBudgetLimit: { period, amount: previousLimit } } }, () => userSettingsService.setOverallBudgetLimit(uid, period, amount)));
    overallBudgetWriteQueueRef.current = write.then(() => undefined, () => undefined);
    try {
      await write;
    } catch (error) {
      if (getQueuedWriteId(error)) return;
      if (latestUserIdRef.current === uid && overallBudgetRequestIdsRef.current.get(period) === requestId) {
        const latest = latestSettingsRef.current;
        if (latest && (latest.userId === uid || latest.id === uid)) {
          const restoredLimits = { ...latest.overallBudgetLimits };
          if (previousLimit === undefined) delete restoredLimits[period];
          else restoredLimits[period] = previousLimit;
          const restored = { ...latest, overallBudgetLimits: restoredLimits };
          latestSettingsRef.current = restored;
          setSettings(restored);
        }
      }
      throw error;
    }
  };

  const setIncomeLinkedBudget = async (config: IncomeLinkedBudgetSettings, manualMonthlyLimit?: number) => {
    const baseline = latestSettingsRef.current;
    if (!userId || !baseline || baseline.userId !== userId) throw new Error('User settings are not ready');
    if (!validIncomeLink(config) || manualMonthlyLimit !== undefined &&
      (config.enabled || !Number.isFinite(manualMonthlyLimit) || manualMonthlyLimit < 0)) throw new Error('invalid-income-budget-configuration');
    const uid = userId;
    const request = ++incomeBudgetWriteIdRef.current;
    const optimistic = { ...baseline, incomeLinkedBudget: config,
      overallBudgetLimits: manualMonthlyLimit === undefined ? baseline.overallBudgetLimits : { ...baseline.overallBudgetLimits, monthly: manualMonthlyLimit } };
    latestSettingsRef.current = optimistic;
    setSettings(optimistic);
    const write = overallBudgetWriteQueueRef.current.catch(() => undefined).then(() => writeLocalFirst({
      type: 'update', entity: 'userSettings', payload: { id: uid, userId: uid, updates: {},
        incomeLinkedBudgetChange: { config, ...(manualMonthlyLimit === undefined ? {} : { manualMonthlyLimit }) } },
    }, () => userSettingsService.setIncomeLinkedBudget(uid, config, manualMonthlyLimit)));
    overallBudgetWriteQueueRef.current = write.catch(() => undefined);
    try { await write; }
    catch (error) {
      if (getQueuedWriteId(error)) return;
      if (latestUserIdRef.current === uid && request === incomeBudgetWriteIdRef.current) {
        const latest = latestSettingsRef.current;
        if (latest) {
          const limits = { ...latest.overallBudgetLimits };
          if (manualMonthlyLimit !== undefined) {
            if (baseline.overallBudgetLimits?.monthly === undefined) delete limits.monthly;
            else limits.monthly = baseline.overallBudgetLimits.monthly;
          }
          const restored = { ...latest, incomeLinkedBudget: baseline.incomeLinkedBudget, overallBudgetLimits: limits };
          latestSettingsRef.current = restored;
          setSettings(restored);
        }
      }
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
    setOverallBudgetLimit,
    setIncomeLinkedBudget,
    refreshSettings,
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};
