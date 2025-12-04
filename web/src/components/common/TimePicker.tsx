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

/**
 * TimePicker - 简洁的时间选择器
 * 
 * 设计原则（参考 UI_STYLE_GUIDE.md）：
 * - 使用 CSS 变量保持主题一致性
 * - 紧凑布局，减少高度占用
 * - 滑动条用于快速选择小时
 * - 支持 12h/24h 格式
 */
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
  const [hoursInput, setHoursInput] = useState(''); // Temporary input value
  const [minutesInput, setMinutesInput] = useState(''); // Temporary input value
  const [isEditingHours, setIsEditingHours] = useState(false); // Track if user is editing
  const [isEditingMinutes, setIsEditingMinutes] = useState(false); // Track if user is editing
  const [isDragging, setIsDragging] = useState(false);
  const [isAM, setIsAM] = useState(initialHours < 12);
  const sliderTrackRef = useRef<HTMLDivElement>(null);

  // Use refs to track editing state for useEffect
  const isEditingHoursRef = useRef(false);
  const isEditingMinutesRef = useRef(false);
  isEditingHoursRef.current = isEditingHours;
  isEditingMinutesRef.current = isEditingMinutes;

  useEffect(() => {
    const { hours: h, minutes: m } = parseTime(value);
    setHours(h);
    setMinutes(m);
    setIsAM(h < 12);
    // Only reset input values if not currently editing
    if (!isEditingHoursRef.current) {
      setHoursInput('');
    }
    if (!isEditingMinutesRef.current) {
      setMinutesInput('');
    }
  }, [value]);

  const to12Hour = (h: number): number => {
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  const to24Hour = (h: number, am: boolean): number => {
    if (am) return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  };

  const formatTime = (h: number, m: number): string => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Slider covers 12 hours (0-719 minutes = 0:00 to 11:59)
  // User uses AM/PM button to select morning or afternoon
  const getSliderMinutes = (): number => {
    // Get hours in 12-hour format (0-11)
    const h12 = hours % 12;
    return h12 * 60 + minutes;
  };
  const getSliderPosition = (): number => (getSliderMinutes() / 719) * 100;

  // Use ref to track current AM state for drag handler
  const isAMRef = useRef(isAM);
  isAMRef.current = isAM;

  const handleDrag = useCallback((clientX: number) => {
    if (!sliderTrackRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    // Convert position to minutes within 12-hour range (0-719)
    const sliderMinutes = Math.round(position * 719);
    const h12 = Math.floor(sliderMinutes / 60); // 0-11
    const newMinutes = sliderMinutes % 60;
    // Convert to 24-hour based on current AM/PM setting
    const newHours = isAMRef.current ? h12 : (h12 + 12);
    setHours(newHours);
    setMinutes(newMinutes);
    onChange(formatTime(newHours, newMinutes));
  }, [onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    handleDrag(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => handleDrag(e.clientX);
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDrag]);

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

  const handleAMPMToggle = () => {
    if (disabled) return;
    const newIsAM = !isAM;
    setIsAM(newIsAM);
    const newHours = to24Hour(to12Hour(hours), newIsAM);
    setHours(newHours);
    onChange(formatTime(newHours, minutes));
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    
    // Allow any input including empty - user can fully clear and retype
    setMinutesInput(inputVal);
    
    // Only update state when we have a valid number
    if (inputVal !== '') {
      const parsed = parseInt(inputVal);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 59) {
        setMinutes(parsed);
        onChange(formatTime(hours, parsed));
      }
    }
  };

  const handleMinutesBlur = () => {
    setIsEditingMinutes(false);
    // On blur, validate and reset display
    const parsed = parseInt(minutesInput);
    if (minutesInput === '' || isNaN(parsed) || parsed < 0 || parsed > 59) {
      // Invalid input, keep current minutes value
      setMinutesInput('');
    } else {
      // Valid input, update and clear temp input
      setMinutes(parsed);
      onChange(formatTime(hours, parsed));
      setMinutesInput('');
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    
    // Allow any input including empty - user can fully clear and retype
    setHoursInput(inputVal);
    
    // Only update state when we have a valid number
    if (inputVal !== '') {
      const parsed = parseInt(inputVal);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        const newHours = to24Hour(parsed, isAM);
        setHours(newHours);
        onChange(formatTime(newHours, minutes));
      }
    }
  };

  const handleHoursBlur = () => {
    setIsEditingHours(false);
    // On blur, validate and reset display
    const parsed = parseInt(hoursInput);
    if (hoursInput === '' || isNaN(parsed) || parsed < 1 || parsed > 12) {
      // Invalid input, keep current hours value
      setHoursInput('');
    } else {
      // Valid input, update and clear temp input
      const newHours = to24Hour(parsed, isAM);
      setHours(newHours);
      onChange(formatTime(newHours, minutes));
      setHoursInput('');
    }
  };

  return (
    <div className={`time-picker ${className}`} style={style}>
      {label && <label className="tp-label">{label}</label>}
      
      <div className={`tp-row ${disabled ? 'disabled' : ''}`}>
        {/* Time inputs */}
        <div className="tp-inputs">
          {/* Always show AM/PM toggle for slider control */}
          <span className="tp-period" onClick={handleAMPMToggle}>
            {isAM ? 'AM' : 'PM'}
          </span>
          <input
            type="text"
            inputMode="numeric"
            name={name ? `${name}-hours` : undefined}
            value={isEditingHours ? hoursInput : String(to12Hour(hours)).padStart(2, '0')}
            onChange={handleHoursChange}
            onBlur={handleHoursBlur}
            onFocus={(e) => {
              setIsEditingHours(true);
              setHoursInput(String(to12Hour(hours)));
              setTimeout(() => e.target.select(), 0);
            }}
            disabled={disabled}
            className="tp-input"
            aria-label="Hours"
          />
          <span className="tp-sep">:</span>
          <input
            type="text"
            inputMode="numeric"
            name={name ? `${name}-minutes` : undefined}
            value={isEditingMinutes ? minutesInput : String(minutes).padStart(2, '0')}
            onChange={handleMinutesChange}
            onBlur={handleMinutesBlur}
            onFocus={(e) => {
              setIsEditingMinutes(true);
              setMinutesInput(String(minutes));
              setTimeout(() => e.target.select(), 0);
            }}
            disabled={disabled}
            className="tp-input"
            aria-label="Minutes"
          />
        </div>

        {/* Compact slider - thin track */}
        <div
          ref={sliderTrackRef}
          className="tp-slider"
          style={{ '--slider-progress': `${getSliderPosition()}%` } as React.CSSProperties}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          <div className={`tp-thumb ${isDragging ? 'active' : ''}`} style={{ left: `${getSliderPosition()}%` }} />
        </div>
      </div>

      <style>{`
        .time-picker {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tp-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .tp-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .tp-row.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .tp-inputs {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }

        .tp-period {
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--accent-light);
          color: var(--accent-primary);
          user-select: none;
          margin-right: 4px;
        }

        .tp-input {
          width: 28px;
          padding: 0;
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          border: none;
          background: transparent;
          color: var(--text-primary);
          -moz-appearance: textfield;
        }

        .tp-input::-webkit-outer-spin-button,
        .tp-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .tp-input:focus {
          outline: none;
        }

        .tp-sep {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .tp-slider {
          flex: 1;
          height: 6px;
          min-width: 60px;
          border-radius: 3px;
          position: relative;
          cursor: pointer;
          touch-action: none;
          background: var(--border-color);
        }

        .tp-slider::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: var(--slider-progress, 0%);
          border-radius: 3px;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
        }

        .tp-thumb {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--accent-primary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: grab;
          user-select: none;
          transition: transform 0.1s ease;
        }

        .tp-thumb.active {
          cursor: grabbing;
          transform: translate(-50%, -50%) scale(1.15);
        }
      `}</style>
    </div>
  );
};

export default TimePicker;
