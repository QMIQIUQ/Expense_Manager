import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TimePickerProps {
  value: string; // HH:MM format (24h)
  onChange: (value: string) => void;
  timeFormat?: '12h' | '24h';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  name?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  timeFormat = '24h',
  disabled = false,
  className = '',
  style = {},
  label,
  name,
}) => {
  // Parse the initial time value
  const parseTime = (timeStr: string): { hours: number; minutes: number } => {
    if (!timeStr) {
      const now = new Date();
      return { hours: now.getHours(), minutes: now.getMinutes() };
    }
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: isNaN(h) ? 0 : h, minutes: isNaN(m) ? 0 : m };
  };

  const { hours: initialHours, minutes: initialMinutes } = parseTime(value);
  const [hours, setHours] = useState(initialHours);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [isDragging, setIsDragging] = useState(false);
  const [isAM, setIsAM] = useState(initialHours < 12);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderTrackRef = useRef<HTMLDivElement>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    const { hours: h, minutes: m } = parseTime(value);
    setHours(h);
    setMinutes(m);
    setIsAM(h < 12);
  }, [value]);

  // Convert 24h to 12h format
  const to12Hour = (h: number): number => {
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  // Convert 12h to 24h format
  const to24Hour = (h: number, am: boolean): number => {
    if (am) {
      return h === 12 ? 0 : h;
    } else {
      return h === 12 ? 12 : h + 12;
    }
  };

  // Format time string for output
  const formatTime = (h: number, m: number): string => {
    const paddedH = String(h).padStart(2, '0');
    const paddedM = String(m).padStart(2, '0');
    return `${paddedH}:${paddedM}`;
  };

  // Calculate slider position based on hours (0-23 -> 0-100%)
  const getSliderPosition = (): number => {
    return (hours / 23) * 100;
  };

  // Handle slider drag
  const handleDrag = useCallback((clientX: number) => {
    if (!sliderTrackRef.current) return;

    const rect = sliderTrackRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newHours = Math.round(position * 23);
    
    setHours(newHours);
    setIsAM(newHours < 12);
    onChange(formatTime(newHours, minutes));
  }, [minutes, onChange]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    handleDrag(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDrag(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDrag]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleDrag(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleDrag(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Handle AM/PM toggle (for 12h format)
  const handleAMPMToggle = () => {
    if (disabled) return;
    const newIsAM = !isAM;
    setIsAM(newIsAM);
    
    // Convert to 24h and update
    const display12h = to12Hour(hours);
    const newHours = to24Hour(display12h, newIsAM);
    setHours(newHours);
    onChange(formatTime(newHours, minutes));
  };

  // Handle minutes input
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    const newMinutes = Math.max(0, Math.min(59, val));
    setMinutes(newMinutes);
    onChange(formatTime(hours, newMinutes));
  };

  // Handle hours input
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0;
    
    if (timeFormat === '12h') {
      val = Math.max(1, Math.min(12, val));
      const newHours = to24Hour(val, isAM);
      setHours(newHours);
      onChange(formatTime(newHours, minutes));
    } else {
      val = Math.max(0, Math.min(23, val));
      setHours(val);
      onChange(formatTime(val, minutes));
    }
  };

  // Determine if it's day or night for the background gradient
  const isDaytime = hours >= 6 && hours < 18;
  
  // Calculate gradient position based on time
  const gradientPosition = (): string => {
    if (hours < 6) return 'linear-gradient(to right, #1a1a2e 0%, #2d2d44 100%)'; // Night
    if (hours < 12) return 'linear-gradient(to right, #ff9a56 0%, #87ceeb 100%)'; // Morning
    if (hours < 18) return 'linear-gradient(to right, #87ceeb 0%, #ff9a56 100%)'; // Afternoon
    return 'linear-gradient(to right, #ff9a56 0%, #1a1a2e 100%)'; // Evening
  };

  return (
    <div className={`time-picker-wrapper ${className}`} style={style}>
      {label && (
        <label className="time-picker-label" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      
      <div className={`time-picker-container ${disabled ? 'disabled' : ''}`}>
        {/* Time Display Input */}
        <div className="time-picker-display">
          <input
            type="number"
            name={name ? `${name}-hours` : undefined}
            value={timeFormat === '12h' ? to12Hour(hours) : hours}
            onChange={handleHoursChange}
            min={timeFormat === '12h' ? 1 : 0}
            max={timeFormat === '12h' ? 12 : 23}
            disabled={disabled}
            className="time-input hours"
            aria-label="Hours"
          />
          <span className="time-separator">:</span>
          <input
            type="number"
            name={name ? `${name}-minutes` : undefined}
            value={String(minutes).padStart(2, '0')}
            onChange={handleMinutesChange}
            min={0}
            max={59}
            disabled={disabled}
            className="time-input minutes"
            aria-label="Minutes"
          />
        </div>

        {/* Slider Container */}
        <div className="time-picker-slider-container">
          {timeFormat === '24h' ? (
            <>
              {/* Sun emoji for day */}
              <span className="time-emoji sun" role="img" aria-label="Day">☀️</span>
              
              {/* Slider Track */}
              <div
                ref={sliderTrackRef}
                className="time-slider-track"
                style={{ background: gradientPosition() }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Slider Thumb */}
                <div
                  ref={sliderRef}
                  className={`time-slider-thumb ${isDragging ? 'dragging' : ''}`}
                  style={{ left: `${getSliderPosition()}%` }}
                >
                  <div className="thumb-inner">
                    {isDaytime ? '☀️' : '🌙'}
                  </div>
                </div>
              </div>
              
              {/* Moon emoji for night */}
              <span className="time-emoji moon" role="img" aria-label="Night">🌙</span>
            </>
          ) : (
            <>
              {/* Slider Track for 12h format */}
              <div
                ref={sliderTrackRef}
                className="time-slider-track"
                style={{ background: isAM ? 'linear-gradient(to right, #ff9a56, #87ceeb)' : 'linear-gradient(to right, #ff9a56, #1a1a2e)' }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Slider Thumb */}
                <div
                  ref={sliderRef}
                  className={`time-slider-thumb ${isDragging ? 'dragging' : ''}`}
                  style={{ left: `${getSliderPosition()}%` }}
                >
                  <div className="thumb-inner">
                    {isAM ? '☀️' : '🌙'}
                  </div>
                </div>
              </div>
              
              {/* AM/PM Toggle */}
              <button
                type="button"
                className={`ampm-toggle ${isAM ? 'am' : 'pm'}`}
                onClick={handleAMPMToggle}
                disabled={disabled}
                aria-label={isAM ? 'Switch to PM' : 'Switch to AM'}
              >
                <span className="ampm-option am">AM</span>
                <span className="ampm-option pm">PM</span>
                <span className="ampm-slider" />
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .time-picker-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .time-picker-label {
          font-size: 14px;
          font-weight: 500;
        }

        .time-picker-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background-color: var(--input-bg);
        }

        .time-picker-container.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .time-picker-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .time-input {
          width: 48px;
          padding: 8px;
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          -moz-appearance: textfield;
        }

        .time-input::-webkit-outer-spin-button,
        .time-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .time-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .time-separator {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .time-picker-slider-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .time-emoji {
          font-size: 20px;
          flex-shrink: 0;
        }

        .time-slider-track {
          flex: 1;
          height: 28px;
          border-radius: 14px;
          position: relative;
          cursor: pointer;
          touch-action: none;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .time-slider-thumb {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s ease;
        }

        .time-slider-thumb.dragging {
          cursor: grabbing;
          transform: translate(-50%, -50%) scale(1.1);
        }

        .thumb-inner {
          font-size: 18px;
          user-select: none;
        }

        /* AM/PM Toggle */
        .ampm-toggle {
          position: relative;
          width: 80px;
          height: 32px;
          border-radius: 16px;
          background: var(--border-color);
          border: none;
          cursor: pointer;
          padding: 0;
          overflow: hidden;
          flex-shrink: 0;
        }

        .ampm-option {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          font-weight: 600;
          transition: color 0.2s ease;
          z-index: 1;
        }

        .ampm-option.am {
          left: 12px;
          color: var(--text-secondary);
        }

        .ampm-option.pm {
          right: 12px;
          color: var(--text-secondary);
        }

        .ampm-toggle.am .ampm-option.am {
          color: white;
        }

        .ampm-toggle.pm .ampm-option.pm {
          color: white;
        }

        .ampm-slider {
          position: absolute;
          top: 2px;
          width: 38px;
          height: 28px;
          border-radius: 14px;
          background: var(--primary-color);
          transition: left 0.2s ease;
        }

        .ampm-toggle.am .ampm-slider {
          left: 2px;
        }

        .ampm-toggle.pm .ampm-slider {
          left: 40px;
        }

        @media (max-width: 480px) {
          .time-picker-slider-container {
            flex-wrap: wrap;
          }
          
          .time-slider-track {
            min-width: 100%;
            order: 1;
          }
          
          .time-emoji {
            order: 0;
          }
          
          .ampm-toggle {
            order: 2;
            margin-top: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default TimePicker;
