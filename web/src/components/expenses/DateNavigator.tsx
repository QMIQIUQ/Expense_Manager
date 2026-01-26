import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTodayLocal, formatDateLocal } from '../../utils/dateUtils';

export type ViewMode = 'all' | 'day' | 'month' | 'year';

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateChange: (date: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalAmount?: number; // Optional: total amount for selected date/period
}

const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  totalAmount,
}) => {
  const { t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  const [dates, setDates] = useState<Date[]>([]);

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
    if (scrollContainerRef.current && todayRef.current) {
      const container = scrollContainerRef.current;
      const todayElement = todayRef.current;
      
      // Calculate position to center the selected date
      const containerWidth = container.offsetWidth;
      const todayLeft = todayElement.offsetLeft;
      const todayWidth = todayElement.offsetWidth;
      
      container.scrollLeft = todayLeft - (containerWidth / 2) + (todayWidth / 2);
    }
  }, [dates, selectedDate]);

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateLocal(date);
    onDateChange(dateStr);
  };

  const handlePrevDay = () => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() - 1);
    onDateChange(formatDateLocal(current));
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + 1);
    onDateChange(formatDateLocal(current));
  };

  const isToday = (date: Date): boolean => {
    const today = getTodayLocal();
    return formatDateLocal(date) === today;
  };

  const isSelected = (date: Date): boolean => {
    return formatDateLocal(date) === selectedDate;
  };

  const getWeekdayShort = (date: Date): string => {
    return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date);
  };

  // Note: totalAmount is kept for API compatibility but not displayed per user request
  void totalAmount;

  return (
    <div style={styles.container}>
      {/* View Mode Toggle */}
      <div style={styles.viewModeContainer}>
        <button
          onClick={() => onViewModeChange('all')}
          style={{
            ...styles.viewModeBtn,
            ...(viewMode === 'all' ? styles.viewModeBtnActive : {}),
          }}
        >
          {t('allBudgets')}
        </button>
        <button
          onClick={() => onViewModeChange('day')}
          style={{
            ...styles.viewModeBtn,
            ...(viewMode === 'day' ? styles.viewModeBtnActive : {}),
          }}
        >
          {t('date')}
        </button>
        <button
          onClick={() => onViewModeChange('month')}
          style={{
            ...styles.viewModeBtn,
            ...(viewMode === 'month' ? styles.viewModeBtnActive : {}),
          }}
        >
          {t('month')}
        </button>
        <button
          onClick={() => onViewModeChange('year')}
          style={{
            ...styles.viewModeBtn,
            ...(viewMode === 'year' ? styles.viewModeBtnActive : {}),
          }}
        >
          {t('year')}
        </button>
      </div>

      {/* Horizontal Date Scroll */}
      <div style={styles.dateScrollWrapper}>
        <button onClick={handlePrevDay} style={styles.navArrow} aria-label="Previous day">
          ‹
        </button>
        
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
                  onClick={() => handleDateClick(date)}
                  style={{
                    ...styles.dateItem,
                    ...(isSelectedDate ? styles.dateItemToday : styles.dateItemInactive),
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                  aria-label={`${isTodayDate ? t('today') + ' ' : ''}${dateStr}`}
                  aria-pressed={isSelectedDate}
                >
                  <div style={styles.dateDay}>{getWeekdayShort(date)}</div>
                  <div style={styles.dateNumber}>{date.getDate()}</div>
                  {isTodayDate && (
                    <div style={styles.todayLabel}>{t('today')}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <button onClick={handleNextDay} style={styles.navArrow} aria-label="Next day">
          ›
        </button>
      </div>

      {/* Summary removed - user requested to not show expense total in date navigator */}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--card-bg, white)',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-color, #e9ecef)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  viewModeContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    padding: '3px',
  },
  viewModeBtn: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid var(--border-color, #e9ecef)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
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
    gap: '8px',
  },
  navArrow: {
    background: 'var(--bg-secondary, #f8f9fa)',
    border: '1px solid var(--border-color, #e9ecef)',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '6px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dateScrollContainer: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    flex: 1,
  },
  dateScroll: {
    display: 'flex',
    gap: '8px',
    padding: '4px 0',
    justifyContent: 'center',
  },
  dateItem: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '50px',
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
    fontSize: '10px',
    marginBottom: '2px',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  dateNumber: {
    fontSize: '18px',
    fontWeight: '600',
  },
  todayLabel: {
    fontSize: '9px',
    fontWeight: '600',
    padding: '2px 6px',
    background: 'var(--accent-light, #e8f0fe)',
    borderRadius: '4px',
    marginTop: '2px',
    color: 'var(--accent-primary)',
  },
  swipeHint: {
    display: 'none', // Hide swipe hint for cleaner design
  },
  summary: {
    marginTop: '12px',
    padding: '10px 12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  summaryAmount: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
};

export default DateNavigator;
