/**
 * Session Cache Utility
 * Provides caching of Firestore data in sessionStorage for offline access
 */

const CACHE_PREFIX = 'expense_cache_';
const CACHE_TIMESTAMP_PREFIX = 'expense_cache_ts_';
// Persistent (cross-session) storage keys
const PERSIST_PREFIX = 'expense_persist_';
const PERSIST_TIMESTAMP_PREFIX = 'expense_persist_ts_';
// Persistent TTL (24h)
const PERSIST_TTL_MS = 24 * 60 * 60 * 1000;

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
  | 'transfers'
  | 'scheduledPayments'
  | 'scheduledPaymentRecords'
  | 'featureSettings'
  | 'userSettings'
  | 'dashboardLayout';

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
      const now = Date.now();
      const key = `${CACHE_PREFIX}${entity}_${userId}`;
      const timestampKey = `${CACHE_TIMESTAMP_PREFIX}${entity}_${userId}`;
      const persistKey = `${PERSIST_PREFIX}${entity}_${userId}`;
      const persistTimestampKey = `${PERSIST_TIMESTAMP_PREFIX}${entity}_${userId}`;
      
      const payload = JSON.stringify(data);
      const meta = JSON.stringify({ timestamp: now, userId });
      // Session (fast, cleared on tab close)
      sessionStorage.setItem(key, payload);
      sessionStorage.setItem(timestampKey, meta);
      // Persistent (available next visit)
      try {
        localStorage.setItem(persistKey, payload);
        localStorage.setItem(persistTimestampKey, meta);
      } catch (e) {
        // Ignore quota errors silently
      }
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
      if (data) return JSON.parse(data) as T;

      // Fallback to persistent localStorage (cross-session)
      const persistKey = `${PERSIST_PREFIX}${entity}_${userId}`;
      const persistTsKey = `${PERSIST_TIMESTAMP_PREFIX}${entity}_${userId}`;
      const persistData = localStorage.getItem(persistKey);
      const persistMetaRaw = localStorage.getItem(persistTsKey);
      if (persistData && persistMetaRaw) {
        try {
          const meta = JSON.parse(persistMetaRaw) as CacheMetadata;
          if (Date.now() - meta.timestamp < PERSIST_TTL_MS) {
            // Promote to session cache for faster subsequent access
            sessionStorage.setItem(key, persistData);
            sessionStorage.setItem(`${CACHE_TIMESTAMP_PREFIX}${entity}_${userId}`, persistMetaRaw);
            return JSON.parse(persistData) as T;
          } else {
            // Expired persistent cache
            localStorage.removeItem(persistKey);
            localStorage.removeItem(persistTsKey);
          }
        } catch (e) {
          // Corrupt metadata -> clear
          localStorage.removeItem(persistKey);
          localStorage.removeItem(persistTsKey);
        }
      }
      return null;
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
    // Also remove persistent copies
    localStorage.removeItem(`${PERSIST_PREFIX}${entity}_${userId}`);
    localStorage.removeItem(`${PERSIST_TIMESTAMP_PREFIX}${entity}_${userId}`);
  },

  /**
   * Clear all caches for a user
   */
  clearUser(userId: string): void {
    // Define entities directly to avoid import issues
    const entities: CacheableEntity[] = [
      'expenses',
      'categories',
      'budgets',
      'recurring',
      'incomes',
      'cards',
      'banks',
      'ewallets',
      'repayments',
      'transfers',
      'scheduledPayments',
      'scheduledPaymentRecords',
      'featureSettings',
      'userSettings'
    ];
    
    entities.forEach((entity: CacheableEntity) => {
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
