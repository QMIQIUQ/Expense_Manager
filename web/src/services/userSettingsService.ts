import { db } from '../config/firebase';
import { deleteField, doc, getDoc, getDocFromServer, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { BudgetPeriod, OverallBudgetLimits, UserSettings, TimeFormat, DateFormat, CurrencyCode } from '../types';
import { COLLECTIONS } from '../constants/collections';
import { validateOverallBudgetLimit } from '../utils/budgetAllocation';
import { runBudgetMutationTransaction } from '../utils/budgetMutationTransaction';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
import { networkStatus } from '../utils/networkStatus';
import { offlineQueue } from '../utils/offlineQueue';

export const userSettingsService = {
  async get(userId: string, forceRefresh: boolean = false, requireServer: boolean = false): Promise<UserSettings | null> {
    const revision = offlineQueue.revision;
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
    // Force refresh from server to bypass Firestore cache
    // Fall back to cached read if server fetch fails (e.g., offline)
    let docSnap;
    if (forceRefresh) {
      try {
        docSnap = await getDocFromServer(docRef);
      } catch (error) {
        if (requireServer) throw error;
        // Fallback to cached read if server fetch fails (offline, network error, etc.)
        docSnap = await getDoc(docRef);
      }
    } else {
      docSnap = await getDoc(docRef);
    }
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    
    const settings: UserSettings = {
      id: docSnap.id,
      userId: data.userId,
      billingCycleDay: data.billingCycleDay || 1,
      timeFormat: (data.timeFormat as TimeFormat) || '24h',
      dateFormat: (data.dateFormat as DateFormat) || 'YYYY-MM-DD',
      useStepByStepForm: data.useStepByStepForm ?? false,
      displayCurrency: (data.displayCurrency as CurrencyCode) || 'MYR',
      dateShortcuts: data.dateShortcuts,
      overallBudgetLimits: (data.overallBudgetLimits as OverallBudgetLimits | undefined) || undefined,
      defaultCategoryMigrationVersion: data.defaultCategoryMigrationVersion ?? 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
    if (requireServer) return settings;
    const local = applyPendingOperations('userSettings', userId, revision === offlineQueue.revision
      ? settings : sessionCache.get<UserSettings>('userSettings', userId) ?? settings);
    sessionCache.set('userSettings', userId, local);
    return local;
  },

  async create(settings: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, settings.userId);
    await setDoc(docRef, {
      ...settings,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  async update(userId: string, updates: Partial<UserSettings>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
    const cached = sessionCache.get<UserSettings>('userSettings', userId);
    if (cached) sessionCache.set('userSettings', userId, { ...cached, ...updates });
  },

  async setOverallBudgetLimit(userId: string, period: BudgetPeriod, amount?: number): Promise<void> {
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      throw new Error('Overall budget limit must be a non-negative number');
    }

    await runBudgetMutationTransaction(userId, async (transaction, snapshot, settingsRef) => {
      if (!snapshot.hasSettingsDocument) throw new Error('user-settings-not-found');
      if (amount !== undefined) {
        const validation = validateOverallBudgetLimit(snapshot.budgets, period, amount);
        if (!validation.valid) throw new Error(validation.reason);
      }

      transaction.update(settingsRef, {
        [`overallBudgetLimits.${period}`]: amount === undefined ? deleteField() : amount,
        updatedAt: Timestamp.now(),
        budgetAllocationRevision: snapshot.budgetAllocationRevision + 1,
      });
    });
  },

  async getOrCreate(userId: string, forceRefresh: boolean = false): Promise<UserSettings> {
    const cached = sessionCache.get<UserSettings>('userSettings', userId);
    if (cached && (!forceRefresh || !networkStatus.isOnline)) return applyPendingOperations('userSettings', userId, cached);
    const existing = await this.get(userId, forceRefresh);
    
    if (existing) {
      return existing;
    }
    
    // Create default settings
    const defaultSettings: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      billingCycleDay: 1, // Default to 1st of month
      timeFormat: '24h', // Default to 24-hour format
      dateFormat: 'YYYY-MM-DD', // Default date format
      useStepByStepForm: false, // Default to traditional form
      displayCurrency: 'MYR',
      defaultCategoryMigrationVersion: 0,
    };
    
    await this.create(defaultSettings);
    
    // Return the created settings
    const created: UserSettings = {
      id: userId,
      ...defaultSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    sessionCache.set('userSettings', userId, created);
    return created;
  },
};
