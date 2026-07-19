import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTodayLocal, formatDateLocal } from '../../utils/dateUtils';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';
import PeriodPickerModal from './PeriodPickerModal';
import type { ExpensePeriodMode, ExpensePeriodSelection } from '../../types/expensePeriod';

// Debounce helper function
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export type ViewMode = ExpensePeriodMode;
export type { ExpensePeriodSelection };

interface DateNavigatorProps {
  value: ExpensePeriodSelection;
  onChange: (value: ExpensePeriodSelection) => void;
  totalAmount?: number; // Optional: total amount for selected date/period
}

const getLocale = (language: string): string => {
  if (language === 'zh-CN') return 'zh-CN';
  if (language === 'zh') return 'zh-TW';
  return 'en';
};

const formatPeriodLabel = (
  dateStr: string,
  viewMode: ViewMode,
  language: string,
  allDatesLabel: string,
  range?: { startDate?: string; endDate?: string },
): string => {
  if (viewMode === 'all') return allDatesLabel;
  if (viewMode === 'range' && range?.startDate && range.endDate) {
    const locale = getLocale(language);
    const formatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    return `${formatter.format(new Date(`${range.startDate}T00:00:00`))} – ${formatter.format(new Date(`${range.endDate}T00:00:00`))}`;
  }
  const date = new Date(dateStr + 'T00:00:00');
  const locale = getLocale(language);
  if (viewMode === 'year') return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
};

const shiftMonthClamped = (date: Date, offset: number): Date => {
  const day = date.getDate();
  const shifted = new Date(date);
  shifted.setDate(1);
  shifted.setMonth(shifted.getMonth() + offset);
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return shifted;
};

const shiftYearClamped = (date: Date, offset: number): Date => {
  const month = date.getMonth();
  const day = date.getDate();
  const shifted = new Date(date);
  shifted.setDate(1);
  shifted.setFullYear(shifted.getFullYear() + offset);
  shifted.setMonth(month);
  const lastDay = new Date(shifted.getFullYear(), month + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return shifted;
};

const DateNavigator: React.FC<DateNavigatorProps> = ({
  value,
  onChange,
  totalAmount,
}) => {
  const selectedDate = value.anchorDate;
  const viewMode = value.mode;
  const { t, language } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  const periodButtonRef = useRef<HTMLButtonElement>(null);
  const [dates, setDates] = useState<Date[]>([]);
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);

  // Generate array of dates (7 days before and after selected date)
  useEffect(() => {
    const generateDates = () => {
      const selected = new Date(selectedDate + 'T00:00:00');
      const datesArray: Date[] = [];
      
      for (let i = -7; i <= 7; i++) {
        const date = new Date(selected);
        date.setDate(selected.getDate() + i);
        datesArray.push(date);
      }
      
      setDates(datesArray);
    };

    generateDates();
  }, [selectedDate]);

  // Auto-scroll to center selected date
  useEffect(() => {
    if (todayRef.current) {
      // Use scrollIntoView with 'center' alignment for reliable centering
      setTimeout(() => {
        todayRef.current?.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'center'
        });
      }, 50);
    }
  }, [dates, selectedDate]);

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateLocal(date);
    onChange({ mode: 'day', anchorDate: dateStr });
  };

  const handlePeriodShift = (direction: -1 | 1) => {
    if (viewMode === 'all') return;
    if (viewMode === 'range') {
      const start = new Date(`${value.startDate || selectedDate}T00:00:00`);
      const end = new Date(`${value.endDate || value.startDate || selectedDate}T00:00:00`);
      const dayCount = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
      start.setDate(start.getDate() + direction * dayCount);
      end.setDate(end.getDate() + direction * dayCount);
      onChange({
        mode: 'range',
        anchorDate: formatDateLocal(end),
        startDate: formatDateLocal(start),
        endDate: formatDateLocal(end),
      });
      return;
    }
    const current = new Date(selectedDate + 'T00:00:00');
    if (viewMode === 'day') {
      current.setDate(current.getDate() + direction);
      onChange({ mode: 'day', anchorDate: formatDateLocal(current) });
      return;
    }
    onChange({ mode: viewMode, anchorDate: formatDateLocal(
      viewMode === 'month'
        ? shiftMonthClamped(current, direction)
        : shiftYearClamped(current, direction)
    ) });
  };

  const isToday = (date: Date): boolean => {
    const today = getTodayLocal();
    return formatDateLocal(date) === today;
  };

  const isSelected = (date: Date): boolean => {
    return formatDateLocal(date) === selectedDate;
  };

  const getWeekdayShort = (date: Date): string => {
    const locale =
      typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : undefined;
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  };

  // Note: totalAmount is kept for API compatibility but not displayed per user request
  void totalAmount;
  
  // Track if scrolling is programmatic (from click) vs user-initiated
  const isUserScrolling = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  // Handle scroll end - auto-select the date closest to center
  const handleScrollEnd = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !isUserScrolling.current) return;
    
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    
    // Find the date item closest to center
    const dateItems = container.querySelectorAll('[data-date]');
    let closestDate: string | null = null;
    let minDistance = Infinity;
    
    dateItems.forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenterX = itemRect.left + itemRect.width / 2;
      const distance = Math.abs(itemCenterX - centerX);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestDate = (item as HTMLElement).dataset.date || null;
      }
    });
    
    // Select the closest date if it's different from current
    if (closestDate && closestDate !== selectedDate) {
      onChange({ mode: 'day', anchorDate: closestDate });
    }
    
    isUserScrolling.current = false;
  }, [selectedDate, onChange]);
  
  // Debounced scroll handler
  const debouncedScrollEndRef = useRef(debounce(() => handleScrollEnd(), 150));

  useEffect(() => {
    debouncedScrollEndRef.current = debounce(() => handleScrollEnd(), 150);
  }, [handleScrollEnd]);
  
  // Handle scroll events
  const handleScroll = useCallback(() => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Mark as user scrolling after a short delay (to distinguish from programmatic scroll)
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrolling.current = true;
    }, 50);
    
    // Call debounced scroll end
    debouncedScrollEndRef.current();
  }, []);
  
  // Add scroll event listener
  useEffect(() => {
    if (viewMode !== 'day') return;
    const container = scrollContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, viewMode]);
  
  const closePeriodPicker = () => {
    setIsPeriodPickerOpen(false);
    window.setTimeout(() => periodButtonRef.current?.focus(), 0);
  };

  const handleModeChange = (mode: ViewMode) => {
    if (mode === 'range') {
      const end = new Date(`${selectedDate}T00:00:00`);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      onChange({
        mode,
        anchorDate: selectedDate,
        startDate: value.startDate || formatDateLocal(start),
        endDate: value.endDate || selectedDate,
      });
      return;
    }
    onChange({ mode, anchorDate: selectedDate });
  };

  return (
    <>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div style={styles.periodNavigation}>
            {viewMode !== 'all' && (
              <button
                type="button"
                onClick={() => handlePeriodShift(-1)}
                style={styles.navArrow}
                aria-label={t('previousPeriod')}
              >
                <ChevronLeftIcon size={18} />
              </button>
            )}
            <button
              ref={periodButtonRef}
              type="button"
              onClick={() => setIsPeriodPickerOpen(true)}
              style={styles.monthYearBtn}
              aria-label={t('selectPeriod')}
              aria-haspopup="dialog"
              aria-expanded={isPeriodPickerOpen}
            >
              {formatPeriodLabel(selectedDate, viewMode, language, t('allDates'), value)}
            </button>
            {viewMode !== 'all' && (
              <button
                type="button"
                onClick={() => handlePeriodShift(1)}
                style={styles.navArrow}
                aria-label={t('nextPeriod')}
              >
                <ChevronRightIcon size={18} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange({ mode: 'day', anchorDate: getTodayLocal() });
            }}
            style={{
              ...styles.todayBtn,
              ...(selectedDate === getTodayLocal() && viewMode === 'day' ? styles.todayBtnActive : {}),
            }}
            aria-label={t('today')}
          >
            📅 {t('today')}
          </button>

          <div style={styles.viewModeContainer}>
            {(['all', 'day', 'month', 'year', 'range'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                style={{
                  ...styles.viewModeBtn,
                  ...(viewMode === mode ? styles.viewModeBtnActive : {}),
                }}
                aria-pressed={viewMode === mode}
              >
                {t(mode === 'all' ? 'allBudgets' : mode === 'day' ? 'date' : mode === 'range' ? 'customRange' : mode)}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'day' && (
          <div style={styles.dateScrollWrapper}>
            <div ref={scrollContainerRef} style={styles.dateScrollContainer}>
              <div style={styles.dateScroll}>
                {dates.map((date) => {
                  const dateStr = formatDateLocal(date);
                  const isTodayDate = isToday(date);
                  const isSelectedDate = isSelected(date);

                  return (
                    <button
                      type="button"
                      key={dateStr}
                      ref={isSelectedDate ? todayRef : null}
                      data-date={dateStr}
                      onClick={() => handleDateClick(date)}
                      style={{
                        ...styles.dateItem,
                        ...(isSelectedDate ? styles.dateItemToday : styles.dateItemInactive),
                        border: 'none',
                        background: isSelectedDate ? 'var(--accent-light, #e8f0fe)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      aria-label={`${isTodayDate ? t('today') + ' ' : ''}${dateStr}`}
                      aria-pressed={isSelectedDate}
                    >
                      <div style={styles.dateDay}>{getWeekdayShort(date)}</div>
                      <div style={styles.dateNumber}>{date.getDate()}</div>
                      {isTodayDate && <div style={styles.todayLabel}>{t('today')}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <PeriodPickerModal
        isOpen={isPeriodPickerOpen}
        value={value}
        onClose={closePeriodPicker}
        onSelect={onChange}
      />
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--card-bg, white)',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid var(--border-color, #e9ecef)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    width: '100%',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  periodNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  monthYearBtn: {
    minHeight: '44px',
    padding: '6px 10px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--accent-primary)',
    background: 'var(--accent-light, #e8f0fe)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  todayBtn: {
    minHeight: '44px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    background: 'var(--bg-secondary, #f8f9fa)',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  todayBtnActive: {
    color: 'var(--success-text, #28a745)',
    background: 'var(--success-bg, #d4edda)',
    border: '1px solid var(--success-text, #28a745)',
  },
  viewModeContainer: {
    display: 'flex',
    gap: '2px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '6px',
    padding: '2px',
    flexBasis: '100%',
  },
  viewModeBtn: {
    flex: 1,
    minHeight: '38px',
    padding: '4px 6px',
    border: '1px solid var(--border-color, #e9ecef)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  viewModeBtnActive: {
    background: 'var(--card-bg, white)',
    color: 'var(--text-primary)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  dateScrollWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '8px',
  },
  navArrow: {
    minWidth: '44px',
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-secondary, #f8f9fa)',
    border: '1px solid var(--border-color, #e9ecef)',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  dateScrollContainer: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    flex: 1,
    minWidth: 0,
    scrollSnapType: 'x mandatory',  // Enable scroll snapping
  },
  dateScroll: {
    display: 'flex',
    gap: '4px',
    padding: '2px 50%',  // Large padding on both sides to allow scrollIntoView to center any item
    width: 'max-content',
  },
  dateItem: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '40px',
    minHeight: '58px',  // Fixed height to ensure consistency with/without today label
    scrollSnapAlign: 'center',  // Snap to center of item
  },
  dateItemToday: {
    background: 'var(--accent-light, #e8f0fe)',
    color: 'var(--accent-primary)',
  },
  dateItemInactive: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  dateDay: {
    fontSize: '9px',
    marginBottom: '1px',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  dateNumber: {
    fontSize: '14px',
    fontWeight: '600',
  },
  todayLabel: {
    fontSize: '8px',
    fontWeight: '600',
    padding: '1px 4px',
    background: 'var(--accent-light, #e8f0fe)',
    borderRadius: '3px',
    marginTop: '1px',
    color: 'var(--accent-primary)',
  },
};

export default DateNavigator;
