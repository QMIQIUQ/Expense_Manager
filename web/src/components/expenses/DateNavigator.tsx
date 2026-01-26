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

// Helper to format month/year for display
const formatMonthYear = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('default', { month: 'short', year: 'numeric' }).format(date);
};

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
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <div style={styles.container}>
      {/* Header Row: Month/Year display + View Mode Toggle */}
      <div style={styles.headerRow}>
        {/* Month/Year Display - Clickable to open date picker */}
        <button 
          onClick={() => setShowDatePicker(true)} 
          style={styles.monthYearBtn}
          aria-label="Select date"
        >
          {formatMonthYear(selectedDate)}
        </button>
        
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
                    background: isSelectedDate ? 'var(--accent-light, #e8f0fe)' : 'transparent',
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

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div style={styles.datePickerOverlay} onClick={() => setShowDatePicker(false)}>
          <div style={styles.datePickerModal} onClick={(e) => e.stopPropagation()}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                onDateChange(e.target.value);
                setShowDatePicker(false);
              }}
              style={styles.datePickerInput}
              autoFocus
            />
            <button onClick={() => setShowDatePicker(false)} style={styles.datePickerClose}>
              {t('close') || 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
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
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  monthYearBtn: {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--accent-primary)',
    background: 'var(--accent-light, #e8f0fe)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  viewModeContainer: {
    display: 'flex',
    gap: '2px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '6px',
    padding: '2px',
    flex: 1,
  },
  viewModeBtn: {
    flex: 1,
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
  },
  navArrow: {
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
  },
  dateScroll: {
    display: 'flex',
    gap: '4px',
    padding: '2px 0',
    justifyContent: 'center',
  },
  dateItem: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '40px',
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
  datePickerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  datePickerModal: {
    background: 'var(--card-bg, white)',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '280px',
  },
  datePickerInput: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  datePickerClose: {
    padding: '10px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    background: 'var(--bg-secondary, #f8f9fa)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
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
