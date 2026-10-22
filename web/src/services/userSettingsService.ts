import { hasFinancialReceipt, runFinancialTransaction, type FinancialOperation } from './financialMutation';
import { db } from '../config/firebase';
import { deleteField, doc, getDoc, getDocFromServer, Timestamp } from 'firebase/firestore';
import { BudgetPeriod, IncomeLinkedBudgetSettings, OverallBudgetLimits, UserSettings, TimeFormat, DateFormat, CurrencyCode } from '../types';
import { COLLECTIONS } from '../constants/collections';
import { validateOverallBudgetLimit } from '../utils/budgetAllocation';
import { runBudgetMutationTransaction } from '../utils/budgetMutationTransaction';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
import { networkStatus } from '../utils/networkStatus';
import { offlineQueue } from '../utils/offlineQueue';
import { incomeLinkEnabled, validIncomeLink } from '../utils/incomeLinkedBudget';

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
      incomeLinkedBudget: data.incomeLinkedBudget as IncomeLinkedBudgetSettings | undefined,
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
    await runFinancialTransaction(db, undefined, async (transaction) => {
      const current = await transaction.get(docRef);
      if (!current.exists()) transaction.set(docRef, { ...settings, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    });
  },

  async update(userId: string, updates: Partial<UserSettings>, operation?: FinancialOperation): Promise<void> {
    if ('incomeLinkedBudget' in updates || 'overallBudgetLimits' in updates) throw new Error('Use the dedicated budget settings command');
    if (await hasFinancialReceipt(operation)) return;
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
    await runFinancialTransaction(db, operation, async (transaction) => {
      const current = await transaction.get(docRef);
      if (!current.exists() || current.data().userId !== userId) throw new Error('User settings are missing or owned by another user');
      transaction.update(docRef, { ...updates, updatedAt: Timestamp.now() });
    });
    const cached = sessionCache.get<UserSettings>('userSettings', userId);
    if (cached) sessionCache.set('userSettings', userId, { ...cached, ...updates });
  },

  async setOverallBudgetLimit(userId: string, period: BudgetPeriod, amount?: number, operation?: FinancialOperation): Promise<void> {
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      throw new Error('Overall budget limit must be a non-negative number');
    }

    if (await hasFinancialReceipt(operation)) return;
    await runBudgetMutationTransaction(userId, async (transaction, snapshot, settingsRef) => {
      if (!snapshot.hasSettingsDocument) throw new Error('user-settings-not-found');
      if (period === 'monthly' && incomeLinkEnabled(snapshot.incomeLinkedBudget)) throw new Error('income-linked-budget-active');
      if (amount !== undefined) {
        const validation = validateOverallBudgetLimit(snapshot.budgets, period, amount);
        if (!validation.valid) throw new Error(validation.reason);
      }

      transaction.update(settingsRef, {
        [`overallBudgetLimits.${period}`]: amount === undefined ? deleteField() : amount,
        updatedAt: Timestamp.now(),
        budgetAllocationRevision: snapshot.budgetAllocationRevision + 1,
      });
    }, operation);
  },

  async setIncomeLinkedBudget(userId: string, config: IncomeLinkedBudgetSettings, manualMonthlyLimit?: number, operation?: FinancialOperation): Promise<void> {
    if (!validIncomeLink(config)) throw new Error('invalid-income-budget-configuration');
    if (manualMonthlyLimit !== undefined && (config.enabled || !Number.isFinite(manualMonthlyLimit) || manualMonthlyLimit < 0)) {
      throw new Error('invalid-limit');
    }
    if (await hasFinancialReceipt(operation)) return;
    await runBudgetMutationTransaction(userId, async (transaction, snapshot, settingsRef) => {
      if (!snapshot.hasSettingsDocument) throw new Error('user-settings-not-found');
      const updates: Record<string, unknown> = { incomeLinkedBudget: config,
        updatedAt: Timestamp.now(), budgetAllocationRevision: snapshot.budgetAllocationRevision + 1 };
      if (!config.enabled) {
        const amount = manualMonthlyLimit ?? snapshot.overallBudgetLimits?.monthly;
        if (amount !== undefined) {
          const validation = validateOverallBudgetLimit(snapshot.budgets, 'monthly', amount);
          if (!validation.valid) throw new Error(validation.reason);
        }
        if (manualMonthlyLimit !== undefined) updates['overallBudgetLimits.monthly'] = manualMonthlyLimit;
      }
      transaction.update(settingsRef, updates);
    }, operation);
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
      const actual = await this.get(userId, true, true);
      if (actual) return actual;
    
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
