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

  const formatCurrency = (amount: number): string => {
    return `$${(amount / 100).toFixed(2)}`;
  };

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

      {/* Swipe Hint */}
      <div style={styles.swipeHint}>
        👆 {t('select')} | 👈👉 Swipe
      </div>

      {/* Summary (if totalAmount provided) */}
      {totalAmount !== undefined && (
        <div style={styles.summary}>
          <span style={styles.summaryLabel}>
            {viewMode === 'day' ? t('today') : t('expenses')}
          </span>
          <span style={styles.summaryAmount}>{formatCurrency(totalAmount)}</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'white',
    padding: '24px',
    borderRadius: '0 0 16px 16px',
  },
  viewModeContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    padding: '4px',
  },
  viewModeBtn: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  viewModeBtnActive: {
    background: 'white',
    color: 'var(--accent-primary)',
  },
  dateScrollWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navArrow: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
    padding: '8px 12px',
    borderRadius: '8px',
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
    gap: '12px',
    padding: '8px 0',
  },
  dateItem: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '70px',
  },
  dateItemToday: {
    background: 'white',
  },
  dateItemInactive: {
    background: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.6,
  },
  dateDay: {
    fontSize: '11px',
    marginBottom: '4px',
    fontWeight: '500',
  },
  dateNumber: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '2px',
  },
  todayLabel: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 8px',
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '8px',
    marginTop: '4px',
    color: 'var(--accent-primary)',
  },
  swipeHint: {
    textAlign: 'center',
    marginTop: '12px',
    fontSize: '12px',
    opacity: 0.7,
  },
  summary: {
    marginTop: '16px',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '14px',
    opacity: 0.9,
  },
  summaryAmount: {
    fontSize: '24px',
    fontWeight: '700',
  },
};

export default DateNavigator;
