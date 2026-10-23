import { dataEqual } from '../utils/dataEquality';
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
export type DataReadSource = 'cached' | 'server';
let localRevision = 0;
const generations = new Map<string, number>();
const inFlight = new Map<string, Promise<EntityData>>();
const dataKey = (entity: CacheableEntity, userId: string) => userId + ':' + entity;
const generationFor = (entity: CacheableEntity, userId: string) => generations.get(dataKey(entity, userId)) ?? 0;
const notifyReadFailure = (entity: CacheableEntity, userId: string) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('data-revalidation-failed', { detail: { entity, userId } }));
};
const fetchShared = <T extends EntityData>(entity: CacheableEntity, userId: string, fetch: () => Promise<T>, queryScope = 'collection'): Promise<T> => {
  const key = dataKey(entity, userId) + ':' + queryScope + ':' + generationFor(entity, userId);
  const running = inFlight.get(key);
  if (running) return running as Promise<T>;
  const pending = Promise.resolve().then(fetch).finally(() => { if (inFlight.get(key) === pending) inFlight.delete(key); });
  inFlight.set(key, pending);
  return pending;
};

export const dataService = {
  generation(entity: CacheableEntity, userId: string): number { return generationFor(entity, userId); },
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
    fetchFn: () => Promise<T>,
    onCommit?: () => void,
    queryScope = 'collection',
    onSource?: (source: DataReadSource) => void,
  ): Promise<T> {
    // If offline, always use cache
    if (!networkStatus.isOnline) {
      const cached = sessionCache.get<T>(entity, userId);
      if (cached) {
        console.log(`Using cached ${entity} (offline mode)`);
        onSource?.('cached');
        return applyPendingOperations(entity, userId, cached);
      }
      // No cache available and offline - return empty array
      console.warn(`No cached ${entity} available in offline mode`);
      onSource?.('cached');
      return applyPendingOperations(entity, userId, [] as unknown as T);
    }

    // If force refresh or no cache, fetch from server
    if (forceRefresh || !sessionCache.has(entity, userId)) {
      try {
        console.log(`Fetching ${entity} from server...`);
        const revision = generationFor(entity, userId);
        const fetched = await fetchShared(entity, userId, fetchFn, queryScope);
        if (revision !== generationFor(entity, userId)) {
          const current = sessionCache.get<T>(entity, userId);
          if (current) { onSource?.('cached'); return applyPendingOperations(entity, userId, current); }
          throw Object.assign(new Error('Read was superseded by a newer mutation'), { code: 'stale-read' });
        }
        const data = applyPendingOperations(entity, userId, fetched);
        // Cache the data
        sessionCache.set(entity, userId, data, { coverage: queryScope === 'collection' ? undefined : queryScope });
        if (revision === generationFor(entity, userId)) onCommit?.();
        onSource?.('server');
        return data;
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'stale-read') throw error;
        notifyReadFailure(entity, userId);
        console.error(`Error fetching ${entity}:`, error);
        // If fetch fails, try to use cache as fallback
        const cached = sessionCache.get<T>(entity, userId);
        if (cached) {
          console.log(`Using cached ${entity} as fallback`);
          onSource?.('cached');
          return applyPendingOperations(entity, userId, cached);
        }
        // No cache and fetch failed - re-throw error
        throw error;
      }
    }

    // Use cached data
    console.log(`Using cached ${entity}`);
    const cached = sessionCache.get<T>(entity, userId);
    onSource?.('cached');
    return applyPendingOperations(entity, userId, cached || ([] as unknown as T));
  },

  /**
   * Compare two data arrays for equality (efficient comparison)
   * Uses id and updatedAt for quick comparison to avoid expensive JSON.stringify
   */
  areDataEqual<T extends EntityData>(data1: T, data2: T): boolean {
    // Categories have no updatedAt; field changes and ordering must also be compared.
    return dataEqual(data1, data2);
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
    onUpdate?: (data: T) => void,
    onCommit?: () => void,
    queryScope = 'collection',
    onSource?: (source: DataReadSource) => void,
  ): Promise<T> {
    const cached = sessionCache.get<T>(entity, userId);
    
    // If we have cached data and we're online, return it immediately
    // and fetch fresh data in the background
    if (cached && networkStatus.isOnline) {
      console.log(`Using cached ${entity}, revalidating in background...`);
      onSource?.('cached');
      const revision = generationFor(entity, userId);
      
      // Fetch fresh data in background (non-blocking)
      fetchShared(entity, userId, fetchFn, queryScope)
        .then((freshData) => {
          if (revision !== generationFor(entity, userId)) return;
          const reconciled = applyPendingOperations(entity, userId, freshData);
          const previous = sessionCache.get<T>(entity, userId) ?? cached;
          const stable = this.areDataEqual(previous, reconciled) ? previous : reconciled;
          sessionCache.set(entity, userId, stable, { coverage: queryScope === 'collection' ? undefined : queryScope });
          onUpdate?.(stable);
          onCommit?.();
        })
        .catch((error) => {
          notifyReadFailure(entity, userId);
          console.warn(`Background revalidation failed for ${entity}:`, error);
        });
      
      return applyPendingOperations(entity, userId, cached);
    }
    
    // No cache or offline - use regular getData
    return this.getData(entity, userId, false, fetchFn, onCommit, queryScope, onSource);
  },

  /**
   * Update cache after local modification
   */
  updateCache<T extends EntityData>(entity: CacheableEntity, userId: string, updater: (data: T) => T): void {
    this.markStale(entity, userId);
    const cached = sessionCache.get<T>(entity, userId) ?? [] as unknown as T;
    const updated = updater(cached);
    sessionCache.set(entity, userId, updated);
  },

  /**
   * Invalidate cache for an entity
   */
  markStale(entity: CacheableEntity, userId: string): void {
    localRevision++;
    const key = dataKey(entity, userId);
    generations.set(key, generationFor(entity, userId) + 1);
  },

  invalidateCache(entity: CacheableEntity, userId: string): void {
    this.markStale(entity, userId);
    sessionCache.remove(entity, userId);
  },

  /**
   * Clear all caches for a user
   */
  clearUserCache(userId: string): void {
    for (const entity of ['expenses', 'incomes', 'categories', 'budgets', 'banks', 'ewallets', 'cards', 'repayments', 'transfers', 'scheduledPayments', 'scheduledPaymentRecords'] as CacheableEntity[]) this.markStale(entity, userId);
    sessionCache.clearUser(userId);
  },
};
