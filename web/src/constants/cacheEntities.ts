/**
 * Shared constants for cacheable entities
 */

import { CacheableEntity } from '../utils/sessionCache';

/**
 * List of all entities that can be cached
 */
export const CACHEABLE_ENTITIES: CacheableEntity[] = [
  'expenses',
  'categories',
  'budgets',
  'recurring',
  'incomes',
  'cards',
  'banks',
  'ewallets',
  'repayments',
  'featureSettings',
  'userSettings',
];

/**
 * List of entities that are synced via offline queue
 */
export const SYNCABLE_ENTITIES: CacheableEntity[] = [
  'expenses',
  'categories',
  'budgets',
  'recurring',
  'incomes',
  'cards',
  'banks',
  'ewallets',
  'repayments',
];
