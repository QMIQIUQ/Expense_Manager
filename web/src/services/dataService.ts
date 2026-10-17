/**
 * Data Service
 * Unified service for data operations with caching and offline support
 */

import { expenseService } from './expenseService';
import { categoryService } from './categoryService';
import { budgetService } from './budgetService';
import { recurringExpenseService } from './recurringExpenseService';
import { incomeService } from './incomeService';
import { cardService } from './cardService';
import { ewalletService } from './ewalletService';
import { bankService } from './bankService';
import { repaymentService } from './repaymentService';
import { sessionCache, CacheableEntity } from '../utils/sessionCache';
import { networkStatus } from '../utils/networkStatus';
import { offlineQueue } from '../utils/offlineQueue';
import { applyPendingOperations } from '../utils/pendingOperations';
import { 
  Expense, 
  Category, 
  Budget, 
  RecurringExpense, 
  Income, 
  Card, 
  EWallet, 
  Bank, 
  Repayment,
  ScheduledPayment,
  ScheduledPaymentRecord
} from '../types';

type EntityData = 
  | Expense[]
  | Category[]
  | Budget[]
  | RecurringExpense[]
  | Income[]
  | Card[]
  | EWallet[]
  | Bank[]
  | Repayment[]
  | ScheduledPayment[]
  | ScheduledPaymentRecord[]
  | unknown[];
let localRevision = 0;

export const dataService = {
  get localRevision(): number { return localRevision; },
  /**
   * Get expenses with caching
   */
  async getExpenses(userId: string, forceRefresh = false): Promise<Expense[]> {
    return this.getData('expenses', userId, forceRefresh, () => expenseService.getAll(userId)) as Promise<Expense[]>;
  },

  /**
   * Get categories with caching
   */
  async getCategories(userId: string, forceRefresh = false): Promise<Category[]> {
    return this.getData('categories', userId, forceRefresh, () => categoryService.getAll(userId)) as Promise<Category[]>;
  },

  /**
   * Get budgets with caching
   */
  async getBudgets(userId: string, forceRefresh = false): Promise<Budget[]> {
    return this.getData('budgets', userId, forceRefresh, () => budgetService.getAll(userId)) as Promise<Budget[]>;
  },

  /**
   * Get recurring expenses with caching
   */
  async getRecurringExpenses(userId: string, forceRefresh = false): Promise<RecurringExpense[]> {
    return this.getData('recurring', userId, forceRefresh, () => recurringExpenseService.getAll(userId)) as Promise<RecurringExpense[]>;
  },

  /**
   * Get incomes with caching
   */
  async getIncomes(userId: string, forceRefresh = false): Promise<Income[]> {
    return this.getData('incomes', userId, forceRefresh, () => incomeService.getAll(userId)) as Promise<Income[]>;
  },

  /**
   * Get cards with caching
   */
  async getCards(userId: string, forceRefresh = false): Promise<Card[]> {
    return this.getData('cards', userId, forceRefresh, () => cardService.getAll(userId)) as Promise<Card[]>;
  },

  /**
   * Get ewallets with caching
   */
  async getEWallets(userId: string, forceRefresh = false): Promise<EWallet[]> {
    return this.getData('ewallets', userId, forceRefresh, () => ewalletService.getAll(userId)) as Promise<EWallet[]>;
  },

  /**
   * Get banks with caching
   */
  async getBanks(userId: string, forceRefresh = false): Promise<Bank[]> {
    return this.getData('banks', userId, forceRefresh, () => bankService.getAll(userId)) as Promise<Bank[]>;
  },

  /**
   * Get repayments with caching
   */
  async getRepayments(userId: string, forceRefresh = false): Promise<Repayment[]> {
    return this.getData('repayments', userId, forceRefresh, () => repaymentService.getAll(userId)) as Promise<Repayment[]>;
  },

  /**
   * Generic method to get data with caching
   * Implements Stale-While-Revalidate strategy for better UX
   */
  async getData<T extends EntityData>(
    entity: CacheableEntity,
    userId: string,
    forceRefresh: boolean,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // If offline, always use cache
    if (!networkStatus.isOnline) {
      const cached = sessionCache.get<T>(entity, userId);
      if (cached) {
        console.log(`Using cached ${entity} (offline mode)`);
        return applyPendingOperations(entity, userId, cached);
      }
      // No cache available and offline - return empty array
      console.warn(`No cached ${entity} available in offline mode`);
      return applyPendingOperations(entity, userId, [] as unknown as T);
    }

    // If force refresh or no cache, fetch from server
    if (forceRefresh || !sessionCache.has(entity, userId)) {
      try {
        console.log(`Fetching ${entity} from server...`);
        const revision = offlineQueue.revision + localRevision;
        const fetched = await fetchFn();
        // A response started before a local write may predate its server commit.
        const data = applyPendingOperations(entity, userId, revision === offlineQueue.revision + localRevision
          ? fetched : sessionCache.get<T>(entity, userId) ?? fetched);
        // Cache the data
        sessionCache.set(entity, userId, data);
        return data;
      } catch (error) {
        console.error(`Error fetching ${entity}:`, error);
        // If fetch fails, try to use cache as fallback
        const cached = sessionCache.get<T>(entity, userId);
        if (cached) {
          console.log(`Using cached ${entity} as fallback`);
          return applyPendingOperations(entity, userId, cached);
        }
        // No cache and fetch failed - re-throw error
        throw error;
      }
    }

    // Use cached data
    console.log(`Using cached ${entity}`);
    const cached = sessionCache.get<T>(entity, userId);
    return applyPendingOperations(entity, userId, cached || ([] as unknown as T));
  },

  /**
   * Compare two data arrays for equality (efficient comparison)
   * Uses id and updatedAt for quick comparison to avoid expensive JSON.stringify
   */
  areDataEqual<T extends EntityData>(data1: T, data2: T): boolean {
    // Categories have no updatedAt; field changes and ordering must also be compared.
    return JSON.stringify(data1) === JSON.stringify(data2);
  },

  /**
   * Get data with Stale-While-Revalidate strategy
   * Returns cached data immediately, then updates in background
   * Optimized to prevent unnecessary re-renders by comparing data efficiently
   */
  async getDataWithRevalidate<T extends EntityData>(
    entity: CacheableEntity,
    userId: string,
    fetchFn: () => Promise<T>,
    onUpdate?: (data: T) => void
  ): Promise<T> {
    const cached = sessionCache.get<T>(entity, userId);
    
    // If we have cached data and we're online, return it immediately
    // and fetch fresh data in the background
    if (cached && networkStatus.isOnline) {
      console.log(`Using cached ${entity}, revalidating in background...`);
      const revision = offlineQueue.revision + localRevision;
      
      // Fetch fresh data in background (non-blocking)
      fetchFn()
        .then((freshData) => {
          if (revision !== offlineQueue.revision + localRevision) return;
          const reconciled = applyPendingOperations(entity, userId, freshData);
          // Only update if data actually changed (prevents unnecessary re-renders)
          if (!this.areDataEqual(sessionCache.get<T>(entity, userId) ?? cached, reconciled)) {
            sessionCache.set(entity, userId, reconciled);
            console.log(`Background revalidation complete for ${entity} (data changed)`);
            if (onUpdate) {
              onUpdate(reconciled);
            }
          } else {
            console.log(`Background revalidation complete for ${entity} (no changes)`);
          }
        })
        .catch((error) => {
          console.warn(`Background revalidation failed for ${entity}:`, error);
        });
      
      return applyPendingOperations(entity, userId, cached);
    }
    
    // No cache or offline - use regular getData
    return this.getData(entity, userId, false, fetchFn);
  },

  /**
   * Update cache after local modification
   */
  updateCache<T extends EntityData>(entity: CacheableEntity, userId: string, updater: (data: T) => T): void {
    localRevision++;
    const cached = sessionCache.get<T>(entity, userId) ?? [] as unknown as T;
    const updated = updater(cached);
    sessionCache.set(entity, userId, updated);
  },

  /**
   * Invalidate cache for an entity
   */
  invalidateCache(entity: CacheableEntity, userId: string): void {
    sessionCache.remove(entity, userId);
  },

  /**
   * Clear all caches for a user
   */
  clearUserCache(userId: string): void {
    sessionCache.clearUser(userId);
  },
};
