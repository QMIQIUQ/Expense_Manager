import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { DateShortcut, DateShortcutType } from '../../types';

interface RadialDateMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  position: { x: number; y: number };
  customShortcuts?: DateShortcut[]; // Optional custom shortcuts
}

interface DateOption {
  label: string;
  date: string;
  angle: number;
  icon: string;
  type: DateShortcutType;
}

// Default shortcuts configuration
const DEFAULT_SHORTCUTS: DateShortcut[] = [
  { type: 'today', enabled: true, angle: 0 },
  { type: 'yesterday', enabled: true, angle: 45 },
  { type: '3days', enabled: true, angle: 90 },
  { type: 'lastWeek', enabled: true, angle: 135 },
  { type: 'lastMonth', enabled: true, angle: 180 },
  { type: 'monthStart', enabled: true, angle: 225 },
  { type: 'lastMonthStart', enabled: true, angle: 270 },
  { type: 'yearStart', enabled: true, angle: 315 },
];

/**
 * RadialDateMenu - Joystick-like radial menu for quick date selection
 * Displays date shortcuts in a circular pattern around the activation point
 */
const RadialDateMenu: React.FC<RadialDateMenuProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  position,
  customShortcuts,
}) => {
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState<DateShortcutType | null>(null);

  // Get shortcut configuration (use custom or default)
  const shortcuts = customShortcuts || DEFAULT_SHORTCUTS;

  // Generate date options based on configuration
  const getDateOptions = (): DateOption[] => {
    const today = new Date();
    const options: DateOption[] = [];

    // Helper to format date as YYYY-MM-DD
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Filter enabled shortcuts and create date options
    shortcuts
      .filter(shortcut => shortcut.enabled)
      .forEach((shortcut) => {
        let date: Date;
        let label: string;
        let icon: string;

        switch (shortcut.type) {
          case 'today':
            date = today;
            label = t('today') || 'Today';
            icon = '📅';
            break;
          case 'yesterday':
            date = new Date(today);
            date.setDate(today.getDate() - 1);
            label = t('yesterday') || 'Yesterday';
            icon = '⏮️';
            break;
          case '3days':
            date = new Date(today);
            date.setDate(today.getDate() - 3);
            label = '3 ' + (t('daysAgo') || 'days ago');
            icon = '📆';
            break;
          case 'lastWeek':
            date = new Date(today);
            date.setDate(today.getDate() - 7);
            label = t('lastWeek') || 'Last week';
            icon = '📋';
            break;
          case 'lastMonth': {
            // Safely subtract one month: use the 1st of last month to avoid day-overflow
            // (e.g., Mar 31 → subtracting a month naively gives Mar 2/3 due to Feb length)
            const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            // Use the same day of month if it exists, otherwise clamp to last day of that month
            const targetDay = today.getDate();
            const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
            lastMonthDate.setDate(Math.min(targetDay, lastDayOfLastMonth));
            date = lastMonthDate;
            label = t('lastMonth') || 'Last month';
            icon = '📊';
            break;
          }
          case 'monthStart':
            date = new Date(today.getFullYear(), today.getMonth(), 1);
            label = t('monthStart') || 'Month start';
            icon = '🗓️';
            break;
          case 'lastMonthStart':
            date = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            label = t('lastMonthStart') || 'Last month start';
            icon = '📖';
            break;
          case 'yearStart':
            date = new Date(today.getFullYear(), 0, 1);
            label = t('yearStart') || 'Year start';
            icon = '🎯';
            break;
          default:
            return;
        }

        options.push({
          label,
          date: formatDate(date),
          angle: shortcut.angle ?? 0,
          icon,
          type: shortcut.type,
        });
      });

    // Sort by angle to maintain consistent visual ordering
    return options.sort((a, b) => a.angle - b.angle);
  };

  const dateOptions = getDateOptions();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const radius = 120; // Distance from center to options

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleBackdropClick}
    >
      {/* Center point indicator */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Central button */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--tab-active-bg)',
            border: '3px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          📅
        </div>

        {/* Radial options */}
        {dateOptions.map((option) => {
          const angleRad = (option.angle * Math.PI) / 180;
          const x = Math.sin(angleRad) * radius;
          const y = -Math.cos(angleRad) * radius;

          return (
            <button
              key={option.type}
              onClick={() => {
                onSelectDate(option.date);
                onClose();
              }}
              onMouseEnter={() => setSelectedType(option.type)}
              onMouseLeave={() => setSelectedType(null)}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: selectedType === option.type
                  ? 'var(--tab-active-bg)'
                  : 'var(--card-bg)',
                border: `2px solid ${selectedType === option.type ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600,
                gap: '4px',
                boxShadow: selectedType === option.type
                  ? '0 8px 20px var(--shadow-lg)'
                  : '0 4px 12px var(--shadow-md)',
                transition: 'all 0.2s ease',
                zIndex: 1,
                padding: '4px',
              }}
              aria-label={option.label}
            >
              <span style={{ fontSize: '20px' }}>{option.icon}</span>
              <span
                style={{
                  textAlign: 'center',
                  lineHeight: '1.2',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {option.label}
              </span>
            </button>
          );
        })}

        {/* Connecting lines (optional, for visual guide) */}
        <svg
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: radius * 2.5,
            height: radius * 2.5,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {dateOptions.map((option) => {
            const angleRad = (option.angle * Math.PI) / 180;
            const x1 = radius * 1.25;
            const y1 = radius * 1.25;
            const x2 = x1 + Math.sin(angleRad) * 35;
            const y2 = y1 - Math.cos(angleRad) * 35;
            const x3 = x1 + Math.sin(angleRad) * (radius - 40);
            const y3 = y1 - Math.cos(angleRad) * (radius - 40);

            return (
              <line
                key={option.type}
                x1={x2}
                y1={y2}
                x2={x3}
                y2={y3}
                stroke={selectedType === option.type ? 'var(--accent-primary)' : 'var(--border-color)'}
                strokeWidth={selectedType === option.type ? '2' : '1'}
                opacity={0.3}
              />
            );
          })}
        </svg>
      </div>

      {/* Instructions text */}
      <div
        style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          padding: '12px 24px',
          borderRadius: '24px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
        }}
      >
        {t('selectDateOrTapOutside') || 'Select a date or tap outside to cancel'}
      </div>
    </div>
  );
};

export default RadialDateMenu;
export { DEFAULT_SHORTCUTS };
