import { describe, it, expect } from 'vitest';
import { getTodayLocal, getCurrentTimeLocal, formatDateLocal } from './dateUtils';

describe('dateUtils', () => {
  describe('getTodayLocal', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const today = getTodayLocal();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns current local date', () => {
      const today = getTodayLocal();
      const expected = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      expect(today).toBe(expected);
    });

    it('formats the date and time from the same local instant around midnight', () => {
      const now = new Date(2026, 9, 24, 23, 59, 45);
      expect(getTodayLocal(now)).toBe('2026-10-24');
      expect(getCurrentTimeLocal(now)).toBe('23:59');
    });
  });

  describe('getCurrentTimeLocal', () => {
    it('returns time in HH:MM format', () => {
      const time = getCurrentTimeLocal();
      expect(time).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatDateLocal', () => {
    it('formats Date objects correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const formatted = formatDateLocal(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formats date strings correctly', () => {
      const formatted = formatDateLocal('2024-01-15');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
