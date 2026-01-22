import React from 'react';
import { DateFormat } from '../../types';

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
  dateFormat?: DateFormat; // Display format for the date (not used with native input)
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
  const inputId = React.useId();

  return (
    <div className="date-picker-wrapper">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
          {required && ' *'}
        </label>
      )}
      <div className="date-picker-container">
        <div className="date-picker-input-group">
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
            style={style}
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

        /* Style the native date picker calendar icon */
        .date-picker-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(var(--icon-invert, 0));
        }
      `}</style>
    </div>
  );
};

export default DatePicker;
