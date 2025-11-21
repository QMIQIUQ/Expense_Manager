/**
 * Data Cache Service - Manages offline data caching using sessionStorage
 * This service provides a fallback mechanism when the user is offline
 */

import { Expense, Category, Budget, RecurringExpense, Income, Card, EWallet, Bank, Repayment } from '../types';

interface CacheMetadata {
  lastSync: number;
  isStale: boolean;
  userId: string;
}

interface CachedData {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  recurringExpenses: RecurringExpense[];
  incomes: Income[];
  cards: Card[];
  ewallets: EWallet[];
  banks: Bank[];
  repayments: Repayment[];
  metadata: CacheMetadata;
}

const CACHE_KEY_PREFIX = 'expense_manager_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const dataCacheService = {
  /**
   * Initialize cache with data from Firebase
   */
  initCache(userId: string, data: Omit<CachedData, 'metadata'>): void {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
      const cachedData: CachedData = {
        ...data,
        metadata: {
          lastSync: Date.now(),
          isStale: false,
          userId,
        },
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cachedData));
      console.log('✅ Data cache initialized for user:', userId);
    } catch (error) {
      console.error('Error initializing cache:', error);
    }
  },

  /**
   * Get cached data for a user
   */
  getCache(userId: string): CachedData | null {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;

      const data: CachedData = JSON.parse(cached);
      
      // Check if cache is expired
      const age = Date.now() - data.metadata.lastSync;
      if (age > CACHE_EXPIRY_MS) {
        console.warn('⚠️ Cache expired, clearing...');
        this.clearCache(userId);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  },

  /**
   * Update a specific entity in the cache
   */
  updateCacheEntity<T extends keyof Omit<CachedData, 'metadata'>>(
    userId: string,
    entity: T,
    data: CachedData[T]
  ): void {
    try {
      const cached = this.getCache(userId);
      if (!cached) {
        console.warn('⚠️ No cache found to update');
        return;
      }

      cached[entity] = data;
      cached.metadata.lastSync = Date.now();
      
      const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.error('Error updating cache entity:', error);
    }
  },

  /**
   * Add an item to a cached entity array
   */
  addToCacheEntity<T extends keyof Omit<CachedData, 'metadata'>>(
    userId: string,
    entity: T,
    item: CachedData[T] extends Array<infer U> ? U : never
  ): void {
    try {
      const cached = this.getCache(userId);
      if (!cached) return;

      const entityData = cached[entity];
      if (Array.isArray(entityData)) {
        (entityData as unknown[]).push(item);
        this.updateCacheEntity(userId, entity, entityData as CachedData[T]);
      }
    } catch (error) {
      console.error('Error adding to cache entity:', error);
    }
  },

  /**
   * Update an item in a cached entity array by id
   */
  updateInCacheEntity<T extends keyof Omit<CachedData, 'metadata'>>(
    userId: string,
    entity: T,
    itemId: string,
    updates: Partial<CachedData[T] extends Array<infer U> ? U : never>
  ): void {
    try {
      const cached = this.getCache(userId);
      if (!cached) return;

      const entityData = cached[entity];
      if (Array.isArray(entityData)) {
        const index = (entityData as Array<{ id?: string }>).findIndex(item => item.id === itemId);
        if (index !== -1) {
          (entityData as Array<{ id?: string }>)[index] = {
            ...(entityData as Array<{ id?: string }>)[index],
            ...updates,
          };
          this.updateCacheEntity(userId, entity, entityData as CachedData[T]);
        }
      }
    } catch (error) {
      console.error('Error updating item in cache entity:', error);
    }
  },

  /**
   * Remove an item from a cached entity array by id
   */
  removeFromCacheEntity<T extends keyof Omit<CachedData, 'metadata'>>(
    userId: string,
    entity: T,
    itemId: string
  ): void {
    try {
      const cached = this.getCache(userId);
      if (!cached) return;

      const entityData = cached[entity];
      if (Array.isArray(entityData)) {
        const filtered = (entityData as Array<{ id?: string }>).filter(item => item.id !== itemId);
        this.updateCacheEntity(userId, entity, filtered as CachedData[T]);
      }
    } catch (error) {
      console.error('Error removing from cache entity:', error);
    }
  },

  /**
   * Mark cache as stale (needs refresh)
   */
  markStale(userId: string): void {
    try {
      const cached = this.getCache(userId);
      if (!cached) return;

      cached.metadata.isStale = true;
      const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.error('Error marking cache as stale:', error);
    }
  },

  /**
   * Clear cache for a user
   */
  clearCache(userId: string): void {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
      sessionStorage.removeItem(cacheKey);
      console.log('🗑️ Cache cleared for user:', userId);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  /**
   * Check if cache exists and is valid
   */
  hasCacheAvailable(userId: string): boolean {
    const cached = this.getCache(userId);
    return cached !== null && !cached.metadata.isStale;
  },
};
