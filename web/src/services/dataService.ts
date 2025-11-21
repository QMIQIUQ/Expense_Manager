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
import { 
  Expense, 
  Category, 
  Budget, 
  RecurringExpense, 
  Income, 
  Card, 
  EWallet, 
  Bank, 
  Repayment 
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
  | Repayment[];

export const dataService = {
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
        return cached;
      }
      // No cache available and offline - return empty array
      console.warn(`No cached ${entity} available in offline mode`);
      return [] as T;
    }

    // If force refresh or no cache, fetch from server
    if (forceRefresh || !sessionCache.has(entity, userId)) {
      try {
        console.log(`Fetching ${entity} from server...`);
        const data = await fetchFn();
        // Cache the data
        sessionCache.set(entity, userId, data);
        return data;
      } catch (error) {
        console.error(`Error fetching ${entity}:`, error);
        // If fetch fails, try to use cache as fallback
        const cached = sessionCache.get<T>(entity, userId);
        if (cached) {
          console.log(`Using cached ${entity} as fallback`);
          return cached;
        }
        // No cache and fetch failed - re-throw error
        throw error;
      }
    }

    // Use cached data
    console.log(`Using cached ${entity}`);
    const cached = sessionCache.get<T>(entity, userId);
    return cached || ([] as T);
  },

  /**
   * Update cache after local modification
   */
  updateCache<T>(entity: CacheableEntity, userId: string, updater: (data: T) => T): void {
    const cached = sessionCache.get<T>(entity, userId);
    if (cached) {
      const updated = updater(cached);
      sessionCache.set(entity, userId, updated);
    }
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
