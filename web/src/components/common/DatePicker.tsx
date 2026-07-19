import React, { useEffect, useRef, useState } from 'react';
import { CalendarIcon } from '../icons';
import type { DateFormat } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodPickerModal, { type PeriodPickerMode } from '../expenses/PeriodPickerModal';
import { getTodayLocal } from '../../utils/dateUtils';

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
  dateFormat?: DateFormat;
}

const DAY_ONLY: PeriodPickerMode[] = ['day'];

const formatForDisplay = (isoDate: string, dateFormat: DateFormat): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (dateFormat === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (dateFormat === 'YYYY/MM/DD') return `${year}/${month}/${day}`;
  return isoDate;
};

const parseDisplayDate = (displayDate: string, dateFormat: DateFormat): string | null => {
  if (!displayDate) return null;
  const separator = displayDate.includes('/') ? '/' : '-';
  const parts = displayDate.split(separator);
  if (parts.length !== 3) return null;

  let year: string;
  let month: string;
  let day: string;
  if (separator === '-') {
    [year, month, day] = parts;
  } else if (dateFormat === 'DD/MM/YYYY') {
    [day, month, year] = parts;
  } else if (dateFormat === 'MM/DD/YYYY') {
    [month, day, year] = parts;
  } else if (dateFormat === 'YYYY/MM/DD') {
    [year, month, day] = parts;
  } else {
    return null;
  }

  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (!Number.isInteger(yearNumber) || yearNumber < 1900 || yearNumber > 2100) return null;
  const candidate = new Date(yearNumber, monthNumber - 1, dayNumber);
  if (
    candidate.getFullYear() !== yearNumber
    || candidate.getMonth() !== monthNumber - 1
    || candidate.getDate() !== dayNumber
  ) return null;

  return `${String(yearNumber).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
};

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  max,
  min,
  required = false,
  error = false,
  disabled = false,
  className = '',
  style,
  label,
  errorMessage,
  name,
  dateFormat = 'YYYY-MM-DD',
}) => {
  const { t } = useLanguage();
  const inputId = React.useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isTouchLayout, setIsTouchLayout] = useState(false);
  const [inputValue, setInputValue] = useState(() => formatForDisplay(value, dateFormat));

  useEffect(() => {
    setInputValue(formatForDisplay(value, dateFormat));
  }, [dateFormat, value]);

  useEffect(() => {
    const updateLayout = () => {
      setIsTouchLayout((navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && window.innerWidth <= 768);
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const closePicker = () => {
    setIsOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitTypedValue = () => {
    const parsed = parseDisplayDate(inputValue, dateFormat);
    if (parsed && (!min || parsed >= min) && (!max || parsed <= max)) {
      if (parsed !== value) onChange(parsed);
      setInputValue(formatForDisplay(parsed, dateFormat));
      return;
    }
    setInputValue(formatForDisplay(value, dateFormat));
  };

  return (
    <>
      <div className="date-picker-wrapper">
        {label && <label htmlFor={inputId}>{label}{required && ' *'}</label>}
        <div className="date-picker-input-group">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            name={name}
            value={inputValue}
            onChange={(event) => !isTouchLayout && setInputValue(event.target.value)}
            onBlur={() => !isTouchLayout && commitTypedValue()}
            onClick={() => isTouchLayout && !disabled && setIsOpen(true)}
            placeholder={dateFormat}
            required={required}
            disabled={disabled}
            readOnly={isTouchLayout}
            className={`date-picker-input ${error ? 'error' : ''} ${className}`}
            style={style}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          />
          <button
            type="button"
            className="date-picker-icon-btn"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            aria-label={t('openCalendar')}
          >
            <CalendarIcon size={20} />
          </button>
        </div>
        {errorMessage && <span className="date-picker-error">{errorMessage}</span>}
      </div>

      <PeriodPickerModal
        isOpen={isOpen}
        value={{ mode: 'day', anchorDate: value || getTodayLocal() }}
        allowedModes={DAY_ONLY}
        min={min}
        max={max}
        onClose={closePicker}
        onSelect={(selection) => {
          onChange(selection.anchorDate);
          setInputValue(formatForDisplay(selection.anchorDate, dateFormat));
        }}
      />
    </>
  );
};

export default DatePicker;
