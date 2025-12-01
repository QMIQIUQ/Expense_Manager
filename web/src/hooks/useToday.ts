import { useMemo } from 'react';
import { getTodayLocal } from '../utils/dateUtils';

/**
 * Hook to get today's date in local timezone
 * Returns a memoized date string in YYYY-MM-DD format
 * Safe to use as max attribute on date inputs
 */
export const useToday = (): string => {
  return useMemo(() => getTodayLocal(), []);
};
