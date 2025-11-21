/**
 * Session Cache Utility
 * Provides caching of Firestore data in sessionStorage for offline access
 */

const CACHE_PREFIX = 'expense_cache_';
const CACHE_TIMESTAMP_PREFIX = 'expense_cache_ts_';

export type CacheableEntity = 
  | 'expenses'
  | 'categories'
  | 'budgets'
  | 'recurring'
  | 'incomes'
  | 'cards'
  | 'banks'
  | 'ewallets'
  | 'repayments'
  | 'featureSettings'
  | 'userSettings';

export interface CacheMetadata {
  timestamp: number;
  userId: string;
}

export const sessionCache = {
  /**
   * Save data to sessionStorage
   */
  set<T>(entity: CacheableEntity, userId: string, data: T): void {
    try {
      const key = `${CACHE_PREFIX}${entity}_${userId}`;
      const timestampKey = `${CACHE_TIMESTAMP_PREFIX}${entity}_${userId}`;
      
      sessionStorage.setItem(key, JSON.stringify(data));
      sessionStorage.setItem(timestampKey, JSON.stringify({
        timestamp: Date.now(),
        userId,
      }));
    } catch (error) {
      console.error(`Error saving ${entity} to cache:`, error);
      // If sessionStorage is full, try to clear old caches
      this.clearOldCaches();
    }
  },

  /**
   * Get data from sessionStorage
   */
  get<T>(entity: CacheableEntity, userId: string): T | null {
    try {
      const key = `${CACHE_PREFIX}${entity}_${userId}`;
      const data = sessionStorage.getItem(key);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error reading ${entity} from cache:`, error);
      return null;
    }
  },

  /**
   * Get cache metadata (timestamp, userId)
   */
  getMetadata(entity: CacheableEntity, userId: string): CacheMetadata | null {
    try {
      const timestampKey = `${CACHE_TIMESTAMP_PREFIX}${entity}_${userId}`;
      const data = sessionStorage.getItem(timestampKey);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as CacheMetadata;
    } catch (error) {
      console.error(`Error reading cache metadata for ${entity}:`, error);
      return null;
    }
  },

  /**
   * Check if cache exists and is valid
   */
  has(entity: CacheableEntity, userId: string): boolean {
    const key = `${CACHE_PREFIX}${entity}_${userId}`;
    return sessionStorage.getItem(key) !== null;
  },

  /**
   * Remove specific cache entry
   */
  remove(entity: CacheableEntity, userId: string): void {
    const key = `${CACHE_PREFIX}${entity}_${userId}`;
    const timestampKey = `${CACHE_TIMESTAMP_PREFIX}${entity}_${userId}`;
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(timestampKey);
  },

  /**
   * Clear all caches for a user
   */
  clearUser(userId: string): void {
    // Import here to avoid circular dependency
    const { CACHEABLE_ENTITIES } = require('../constants/cacheEntities');
    
    CACHEABLE_ENTITIES.forEach((entity: CacheableEntity) => {
      this.remove(entity, userId);
    });
  },

  /**
   * Clear all caches
   */
  clearAll(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_TIMESTAMP_PREFIX))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing all caches:', error);
    }
  },

  /**
   * Clear old caches (older than 1 hour)
   */
  clearOldCaches(): void {
    try {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_TIMESTAMP_PREFIX)) {
          const data = sessionStorage.getItem(key);
          if (data) {
            const metadata = JSON.parse(data) as CacheMetadata;
            if (metadata.timestamp < oneHourAgo) {
              keysToRemove.push(key);
              // Also remove the corresponding cache entry
              const cacheKey = key.replace(CACHE_TIMESTAMP_PREFIX, CACHE_PREFIX);
              keysToRemove.push(cacheKey);
            }
          }
        }
      }
      
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing old caches:', error);
    }
  },

  /**
   * Get cache size in bytes (approximate)
   */
  getCacheSize(): number {
    let size = 0;
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_TIMESTAMP_PREFIX))) {
          const value = sessionStorage.getItem(key);
          if (value) {
            size += key.length + value.length;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating cache size:', error);
    }
    return size;
  },
};
