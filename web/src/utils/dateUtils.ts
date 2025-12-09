/**
 * Date utility functions
 * Handles date operations with proper timezone support
 */

import { DateFormat } from '../types';

/**
 * Get today's date in local timezone formatted as YYYY-MM-DD
 * This is safer than new Date().toISOString().split('T')[0] which uses UTC
 */
export const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current time in local timezone formatted as HH:MM
 */
export const getCurrentTimeLocal = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format a date string or Date object to YYYY-MM-DD in local timezone
 */
export const formatDateLocal = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// English month abbreviations
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a date string (YYYY-MM-DD) or Date object according to user's date format preference
 * @param date - Date string in YYYY-MM-DD format or Date object
 * @param format - User's preferred date format
 * @returns Formatted date string
 */
export const formatDateWithUserFormat = (date: Date | string, format: DateFormat): string => {
  if (!date) return '';
  
  let year: string, month: string, day: string, monthIndex: number;
  
  if (typeof date === 'string') {
    // Parse YYYY-MM-DD format
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    [year, month, day] = parts;
    monthIndex = parseInt(month, 10) - 1;
  } else {
    year = String(date.getFullYear());
    monthIndex = date.getMonth();
    month = String(monthIndex + 1).padStart(2, '0');
    day = String(date.getDate()).padStart(2, '0');
  }
  
  const monthName = MONTH_NAMES[monthIndex] || month;
  const dayNum = String(parseInt(day, 10)).padStart(2, '0');
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY/MM/DD':
      return `${year}/${month}/${day}`;
    case 'MMM DD, YYYY':
      return `${monthName} ${dayNum}, ${year}`;
    case 'DD MMM YYYY':
      return `${dayNum} ${monthName} ${year}`;
    case 'YYYY-MM-DD':
    default:
      return `${year}-${month}-${day}`;
  }
};

/**
 * Format a date range (e.g., for budget periods) according to user's date format
 * Shows abbreviated format: DD/MM or MM/DD depending on preference
 * @param startDate - Start date string in YYYY-MM-DD format
 * @param endDate - End date string in YYYY-MM-DD format
 * @param format - User's preferred date format
 * @returns Formatted date range string
 */
export const formatDateRangeShort = (startDate: string, endDate: string, format: DateFormat): string => {
  if (!startDate || !endDate) return '';
  
  const [, startMonth, startDay] = startDate.split('-');
  const [, endMonth, endDay] = endDate.split('-');
  
  const startMonthIndex = parseInt(startMonth, 10) - 1;
  const endMonthIndex = parseInt(endMonth, 10) - 1;
  const startMonthName = MONTH_NAMES[startMonthIndex];
  const endMonthName = MONTH_NAMES[endMonthIndex];
  
  // Use appropriate format based on preference
  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD MMM YYYY':
      if (format === 'DD MMM YYYY') {
        return `${parseInt(startDay)} ${startMonthName} - ${parseInt(endDay)} ${endMonthName}`;
      }
      return `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
    case 'MMM DD, YYYY':
      return `${startMonthName} ${parseInt(startDay)} - ${endMonthName} ${parseInt(endDay)}`;
    default:
      return `${startMonth}/${startDay} - ${endMonth}/${endDay}`;
  }
};

/**
 * Format a date for short display (e.g., for charts) according to user's date format
 * Shows abbreviated format: DD/MM or MM/DD depending on preference
 * @param date - Date string in YYYY-MM-DD format or Date object
 * @param format - User's preferred date format
 * @returns Formatted short date string
 */
export const formatDateShort = (date: Date | string, format: DateFormat): string => {
  if (!date) return '';
  
  let month: string, day: string, monthIndex: number;
  
  if (typeof date === 'string') {
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    [, month, day] = parts;
    monthIndex = parseInt(month, 10) - 1;
  } else {
    monthIndex = date.getMonth();
    month = String(monthIndex + 1).padStart(2, '0');
    day = String(date.getDate()).padStart(2, '0');
  }
  
  const monthName = MONTH_NAMES[monthIndex];
  const dayNum = parseInt(day, 10);
  
  // Use appropriate format based on preference
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}`;
    case 'DD MMM YYYY':
      return `${dayNum} ${monthName}`;
    case 'MMM DD, YYYY':
      return `${monthName} ${dayNum}`;
    default:
      return `${month}/${day}`;
  }
};
