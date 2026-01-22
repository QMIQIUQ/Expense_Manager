import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon } from '../icons';
import { DateFormat } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface DatePickerProps {
  value: string; // Always YYYY-MM-DD format internally
  onChange: (value: string) => void; // Always returns YYYY-MM-DD format
  max?: string;
  min?: string;
  required?: boolean;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  errorMessage?: string;
  name?: string;
  dateFormat?: DateFormat; // Display format for the date
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  max,
  min,
  required = false,
  error = false,
  disabled = false,
  className = '',
  style = {},
  label,
  errorMessage,
  name,
  dateFormat = 'YYYY-MM-DD',
}) => {
  const { t } = useLanguage();
  const inputId = React.useId();
  
  // Detect if we're on a mobile device
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if device is mobile based on screen size and touch capability
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };
    
    // Debounce resize handler to avoid excessive re-renders
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkMobile, 150);
    };
    
    checkMobile();
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    if (value) {
      return new Date(value + 'T00:00:00');
    }
    return new Date();
  });
  const [inputValue, setInputValue] = useState(''); // Display value in user's format
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const calendarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format date from YYYY-MM-DD to display format
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    switch (dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY/MM/DD':
        return `${year}/${month}/${day}`;
      case 'YYYY-MM-DD':
      default:
        return isoDate;
    }
  };

  // Parse display format back to YYYY-MM-DD
  const parseDisplayDate = (displayDate: string): string | null => {
    if (!displayDate) return null;
    
    let year: string, month: string, day: string;
    
    // Try to parse based on the current format
    const dashParts = displayDate.split('-');
    const slashParts = displayDate.split('/');
    
    if (dashParts.length === 3) {
      // Assume YYYY-MM-DD format for dash-separated
      [year, month, day] = dashParts;
    } else if (slashParts.length === 3) {
      switch (dateFormat) {
        case 'DD/MM/YYYY':
          [day, month, year] = slashParts;
          break;
        case 'MM/DD/YYYY':
          [month, day, year] = slashParts;
          break;
        case 'YYYY/MM/DD':
          [year, month, day] = slashParts;
          break;
        default:
          return null;
      }
    } else {
      return null;
    }
    
    // Validate parsed values
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    if (
      isNaN(yearNum) || yearNum < 1900 || yearNum > 2100 ||
      isNaN(monthNum) || monthNum < 1 || monthNum > 12 ||
      isNaN(dayNum) || dayNum < 1 || dayNum > 31
    ) {
      return null;
    }
    
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Get placeholder based on format
  const getPlaceholder = (): string => {
    switch (dateFormat) {
      case 'DD/MM/YYYY':
        return 'DD/MM/YYYY';
      case 'MM/DD/YYYY':
        return 'MM/DD/YYYY';
      case 'YYYY/MM/DD':
        return 'YYYY/MM/DD';
      case 'YYYY-MM-DD':
      default:
        return 'YYYY-MM-DD';
    }
  };

  // Update input value when value or format changes
  useEffect(() => {
    setInputValue(formatDateForDisplay(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, dateFormat]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current && 
        !calendarRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
        setViewMode('days'); // Reset view mode when closing
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Determine if calendar should open upward (when near bottom of screen)
  const [openUpward, setOpenUpward] = useState(false);
  
  useEffect(() => {
    if (showCalendar && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const calendarHeight = 380;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      setOpenUpward(spaceBelow < calendarHeight && spaceAbove > spaceBelow);
    }
  }, [showCalendar]);

  // Update selected month when value changes
  useEffect(() => {
    if (value) {
      setSelectedMonth(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  const handleDateSelect = (date: string) => {
    onChange(date);
    setInputValue(formatDateForDisplay(date));
    setShowCalendar(false);
    setViewMode('days'); // Reset view mode when selecting
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value;
    setInputValue(newDisplayValue);
    
    // Try to parse the input and update the actual value
    const parsedDate = parseDisplayDate(newDisplayValue);
    if (parsedDate) {
      onChange(parsedDate);
    }
  };

  const handleInputBlur = () => {
    // On blur, if parsing fails, revert to the current value's display
    const parsedDate = parseDisplayDate(inputValue);
    if (!parsedDate && value) {
      setInputValue(formatDateForDisplay(value));
    } else if (parsedDate && parsedDate !== value) {
      onChange(parsedDate);
    }
  };

  const handleCalendarClick = () => {
    if (!disabled) {
      if (showCalendar) {
        setShowCalendar(false);
        setViewMode('days'); // Reset view mode when closing
      } else {
        setShowCalendar(true);
      }
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number): string => {
    const paddedMonth = String(month + 1).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  };

  const isDateDisabled = (dateStr: string): boolean => {
    if (max && dateStr > max) return true;
    if (min && dateStr < min) return true;
    return false;
  };

  const isToday = (year: number, month: number, day: number): boolean => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const isSelected = (year: number, month: number, day: number): boolean => {
    if (!value) return false;
    const dateStr = formatDate(year, month, day);
    return value === dateStr;
  };

  const prevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const prevYear = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear() - 1, selectedMonth.getMonth()));
  };

  const nextYear = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear() + 1, selectedMonth.getMonth()));
  };

  const prevYearRange = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear() - 12, selectedMonth.getMonth()));
  };

  const nextYearRange = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear() + 12, selectedMonth.getMonth()));
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), month));
    setViewMode('days');
  };

  const handleYearSelect = (year: number) => {
    setSelectedMonth(new Date(year, selectedMonth.getMonth()));
    setViewMode('months');
  };

  const handleHeaderClick = () => {
    if (viewMode === 'days') {
      setViewMode('months');
    } else if (viewMode === 'months') {
      setViewMode('years');
    }
  };

  const renderMonthsView = () => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthIndex = selectedMonth.getMonth();

    return (
      <div className="calendar-months-grid">
        {months.map((month, index) => {
          const isCurrentMonth = index === currentMonth && selectedYear === currentYear;
          const isSelectedMonth = index === selectedMonthIndex;
          
          return (
            <button
              key={month}
              type="button"
              onClick={() => handleMonthSelect(index)}
              className={`calendar-month-btn ${isCurrentMonth ? 'current' : ''} ${isSelectedMonth ? 'selected' : ''}`}
            >
              {month}
            </button>
          );
        })}
      </div>
    );
  };

  const renderYearsView = () => {
    const currentYear = new Date().getFullYear();
    const selectedYear = selectedMonth.getFullYear();
    const startYear = Math.floor(selectedYear / 12) * 12;
    const years: number[] = [];
    
    for (let i = 0; i < 12; i++) {
      years.push(startYear + i);
    }

    return (
      <div className="calendar-years-grid">
        {years.map((year) => {
          const isCurrentYear = year === currentYear;
          const isSelectedYear = year === selectedYear;
          
          return (
            <button
              key={year}
              type="button"
              onClick={() => handleYearSelect(year)}
              className={`calendar-year-btn ${isCurrentYear ? 'current' : ''} ${isSelectedYear ? 'selected' : ''}`}
            >
              {year}
            </button>
          );
        })}
      </div>
    );
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    const days: JSX.Element[] = [];

    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const disabled = isDateDisabled(dateStr);
      const today = isToday(year, month, day);
      const selected = isSelected(year, month, day);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => !disabled && handleDateSelect(dateStr)}
          disabled={disabled}
          className={`calendar-day ${today ? 'today' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const monthName = selectedMonth.toLocaleString('default', { month: 'long' });
  const yearName = selectedMonth.getFullYear();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get header text and navigation based on view mode
  const getHeaderText = () => {
    if (viewMode === 'days') {
      return `${monthName} ${yearName}`;
    } else if (viewMode === 'months') {
      return `${yearName}`;
    } else {
      const startYear = Math.floor(yearName / 12) * 12;
      return `${startYear} - ${startYear + 11}`;
    }
  };

  const handlePrevClick = () => {
    if (viewMode === 'days') {
      prevMonth();
    } else if (viewMode === 'months') {
      prevYear();
    } else {
      prevYearRange();
    }
  };

  const handleNextClick = () => {
    if (viewMode === 'days') {
      nextMonth();
    } else if (viewMode === 'months') {
      nextYear();
    } else {
      nextYearRange();
    }
  };

  // On mobile, use native date input for better UX
  if (isMobile) {
    return (
      <div className="date-picker-wrapper">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}
            {required && ' *'}
          </label>
        )}
        <div className="date-picker-container">
          <div className="date-picker-input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id={inputId}
              type="date"
              name={name}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              max={max}
              min={min}
              required={required}
              disabled={disabled}
              className={`date-picker-input ${error ? 'error' : ''} ${className}`}
              style={{
                ...style,
                paddingRight: '12px',
              }}
            />
          </div>
        </div>
        {errorMessage && <span className="text-xs text-red-600">{errorMessage}</span>}
        
        <style>{`
          .date-picker-wrapper {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .date-picker-container {
            position: relative;
          }

          .date-picker-input-group {
            position: relative;
            display: flex;
            align-items: center;
          }

          .date-picker-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 14px;
            background-color: var(--input-bg);
            color: var(--text-primary);
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .date-picker-input::placeholder {
            color: var(--text-secondary);
            opacity: 0.7;
          }

          .date-picker-input:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }

          .date-picker-input.error {
            border-color: #ef4444;
          }

          .date-picker-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }
  
  // Desktop: use custom calendar picker
  return (
    <div className="date-picker-wrapper">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
          {required && ' *'}
        </label>
      )}
      <div className="date-picker-container" ref={containerRef}>
        <div className="date-picker-input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            name={name}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={getPlaceholder()}
            required={required}
            disabled={disabled}
            className={`date-picker-input ${error ? 'error' : ''} ${className}`}
            style={{
              ...style,
              paddingRight: '40px',
            }}
          />
          <button
            type="button"
            onClick={handleCalendarClick}
            disabled={disabled}
            className="date-picker-icon-btn"
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              borderRadius: '4px',
              zIndex: 2,
            }}
            aria-label={t('openCalendar') || 'Open calendar'}
          >
            <CalendarIcon size={20} />
          </button>
        </div>

        {showCalendar && (
          <div 
            ref={calendarRef}
            className={`date-picker-calendar ${openUpward ? 'open-upward' : ''}`}
          >
            {/* Calendar Header */}
            <div className="calendar-header">
              <button type="button" onClick={handlePrevClick} className="calendar-nav-btn">
                ‹
              </button>
              <button 
                type="button" 
                onClick={handleHeaderClick} 
                className="calendar-month-year-btn"
                disabled={viewMode === 'years'}
              >
                {getHeaderText()}
              </button>
              <button type="button" onClick={handleNextClick} className="calendar-nav-btn">
                ›
              </button>
            </div>

            {/* Days View */}
            {viewMode === 'days' && (
              <>
                {/* Week Days */}
                <div className="calendar-weekdays">
                  {weekDays.map((day) => (
                    <div key={day} className="calendar-weekday">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="calendar-days">{renderCalendar()}</div>
              </>
            )}

            {/* Months View */}
            {viewMode === 'months' && renderMonthsView()}

            {/* Years View */}
            {viewMode === 'years' && renderYearsView()}

            {/* Today Button - only show in days view */}
            {viewMode === 'days' && (
              <div className="calendar-footer">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const todayStr = formatDate(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate()
                    );
                    if (!isDateDisabled(todayStr)) {
                      handleDateSelect(todayStr);
                    }
                  }}
                  className="calendar-today-btn"
                >
                  Today
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {errorMessage && <span className="text-xs text-red-600">{errorMessage}</span>}

      <style>{`
        .date-picker-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .date-picker-container {
          position: relative;
        }

        .date-picker-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .date-picker-input {
          flex: 1;
          padding: 8px 40px 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
          background-color: var(--input-bg);
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .date-picker-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.7;
        }

        .date-picker-input:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .date-picker-input.error {
          border-color: #ef4444;
        }

        .date-picker-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .date-picker-icon-btn {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: color 0.2s;
          border-radius: 4px;
          z-index: 1;
        }

        .date-picker-icon-btn:hover:not(:disabled) {
          color: var(--primary-color);
          background-color: var(--bg-secondary);
        }

        .date-picker-icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .date-picker-calendar {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 8px 24px var(--shadow);
          padding: 16px;
          z-index: 10000;
          min-width: 280px;
          max-width: calc(100vw - 32px);
        }

        .date-picker-calendar.open-upward {
          top: auto;
          bottom: 100%;
          margin-top: 0;
          margin-bottom: 4px;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .calendar-month-year-btn {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .calendar-month-year-btn:hover:not(:disabled) {
          background-color: var(--bg-secondary);
        }

        .calendar-month-year-btn:disabled {
          cursor: default;
        }

        .calendar-month {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }

        .calendar-nav-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 20px;
          color: var(--text-primary);
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .calendar-nav-btn:hover {
          background-color: var(--bg-secondary);
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }

        .calendar-weekday {
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 4px;
        }

        .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-primary);
          border-radius: 4px;
          transition: all 0.2s;
        }

        .calendar-day.empty {
          cursor: default;
        }

        .calendar-day:not(.empty):not(.disabled):hover {
          background-color: var(--bg-secondary);
        }

        .calendar-day.today {
          border: 2px solid var(--primary-color);
        }

        .calendar-day.selected {
          background-color: var(--primary-color);
          color: white;
          font-weight: 600;
        }

        .calendar-day.disabled {
          color: var(--text-disabled);
          cursor: not-allowed;
          opacity: 0.4;
        }

        .calendar-footer {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }

        .calendar-today-btn {
          width: 100%;
          padding: 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-primary);
          transition: all 0.2s;
        }

        .calendar-today-btn:hover {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        /* Months Grid */
        .calendar-months-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .calendar-month-btn {
          padding: 12px 8px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-primary);
          border-radius: 6px;
          transition: all 0.2s;
        }

        .calendar-month-btn:hover {
          background-color: var(--bg-secondary);
        }

        .calendar-month-btn.current {
          border: 2px solid var(--primary-color);
        }

        .calendar-month-btn.selected {
          background-color: var(--primary-color);
          color: white;
          font-weight: 600;
        }

        /* Years Grid */
        .calendar-years-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .calendar-year-btn {
          padding: 12px 8px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-primary);
          border-radius: 6px;
          transition: all 0.2s;
        }

        .calendar-year-btn:hover {
          background-color: var(--bg-secondary);
        }

        .calendar-year-btn.current {
          border: 2px solid var(--primary-color);
        }

        .calendar-year-btn.selected {
          background-color: var(--primary-color);
          color: white;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default DatePicker;
