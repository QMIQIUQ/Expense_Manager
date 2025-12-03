import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon } from '../icons';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
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
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    if (value) {
      return new Date(value + 'T00:00:00');
    }
    return new Date();
  });
  const calendarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Update selected month when value changes
  useEffect(() => {
    if (value) {
      setSelectedMonth(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  const handleDateSelect = (date: string) => {
    onChange(date);
    setShowCalendar(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleCalendarClick = () => {
    if (!disabled) {
      setShowCalendar(!showCalendar);
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

  const monthName = selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="date-picker-wrapper">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
          {required && ' *'}
        </label>
      )}
      <div className="date-picker-container" ref={calendarRef}>
        <div className="date-picker-input-group">
          <input
            ref={inputRef}
            type="date"
            name={name}
            value={value}
            onChange={handleInputChange}
            max={max}
            min={min}
            required={required}
            disabled={disabled}
            className={`date-picker-input ${error ? 'error' : ''} ${className}`}
            style={style}
          />
          <button
            type="button"
            onClick={handleCalendarClick}
            disabled={disabled}
            className="date-picker-icon-btn"
            aria-label="Open calendar"
          >
            <CalendarIcon size={20} />
          </button>
        </div>

        {showCalendar && (
          <div className="date-picker-calendar">
            {/* Calendar Header */}
            <div className="calendar-header">
              <button type="button" onClick={prevMonth} className="calendar-nav-btn">
                ‹
              </button>
              <div className="calendar-month">{monthName}</div>
              <button type="button" onClick={nextMonth} className="calendar-nav-btn">
                ›
              </button>
            </div>

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

            {/* Today Button */}
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
          box-shadow: 0 4px 12px var(--shadow);
          padding: 16px;
          z-index: 1000;
          min-width: 280px;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
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

        /* Mobile: Hide calendar icon, use native date picker */
        @media (max-width: 768px) {
          .date-picker-icon-btn {
            display: none;
          }

          .date-picker-input {
            padding: 8px 12px;
          }

          .date-picker-calendar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default DatePicker;
