import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface RadialDateMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  position: { x: number; y: number };
}

interface DateOption {
  label: string;
  date: string;
  angle: number;
  icon: string;
}

/**
 * RadialDateMenu - Joystick-like radial menu for quick date selection
 * Displays date shortcuts in a circular pattern around the activation point
 */
const RadialDateMenu: React.FC<RadialDateMenuProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  position,
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Generate date options
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

    // Today (top - 0°)
    options.push({
      label: t('today') || 'Today',
      date: formatDate(today),
      angle: 0,
      icon: '📅',
    });

    // Yesterday (right - 45°)
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    options.push({
      label: t('yesterday') || 'Yesterday',
      date: formatDate(yesterday),
      angle: 45,
      icon: '⏮️',
    });

    // 3 days ago (bottom-right - 90°)
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    options.push({
      label: '3 ' + (t('daysAgo') || 'days ago'),
      date: formatDate(threeDaysAgo),
      angle: 90,
      icon: '📆',
    });

    // Last week (bottom - 135°)
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    options.push({
      label: t('lastWeek') || 'Last week',
      date: formatDate(lastWeek),
      angle: 135,
      icon: '📋',
    });

    // Last month (bottom-left - 180°)
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    options.push({
      label: t('lastMonth') || 'Last month',
      date: formatDate(lastMonth),
      angle: 180,
      icon: '📊',
    });

    // First day of current month (left - 225°)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    options.push({
      label: t('monthStart') || 'Month start',
      date: formatDate(firstDayOfMonth),
      angle: 225,
      icon: '🗓️',
    });

    // First day of last month (top-left - 270°)
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    options.push({
      label: t('lastMonthStart') || 'Last month start',
      date: formatDate(firstDayLastMonth),
      angle: 270,
      icon: '📖',
    });

    // First day of year (top-right - 315°)
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    options.push({
      label: t('yearStart') || 'Year start',
      date: formatDate(firstDayOfYear),
      angle: 315,
      icon: '🎯',
    });

    return options;
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
        {dateOptions.map((option, index) => {
          const angleRad = (option.angle * Math.PI) / 180;
          const x = Math.sin(angleRad) * radius;
          const y = -Math.cos(angleRad) * radius;

          return (
            <button
              key={index}
              onClick={() => {
                onSelectDate(option.date);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseLeave={() => setSelectedIndex(null)}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: selectedIndex === index
                  ? 'var(--tab-active-bg)'
                  : 'var(--card-bg)',
                border: `2px solid ${selectedIndex === index ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600,
                gap: '4px',
                boxShadow: selectedIndex === index
                  ? '0 8px 20px rgba(124, 58, 237, 0.4)'
                  : '0 4px 12px rgba(0, 0, 0, 0.2)',
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
          {dateOptions.map((option, index) => {
            const angleRad = (option.angle * Math.PI) / 180;
            const x1 = radius * 1.25;
            const y1 = radius * 1.25;
            const x2 = x1 + Math.sin(angleRad) * 35;
            const y2 = y1 - Math.cos(angleRad) * 35;
            const x3 = x1 + Math.sin(angleRad) * (radius - 40);
            const y3 = y1 - Math.cos(angleRad) * (radius - 40);

            return (
              <line
                key={index}
                x1={x2}
                y1={y2}
                x2={x3}
                y2={y3}
                stroke={selectedIndex === index ? 'var(--accent-primary)' : 'var(--border-color)'}
                strokeWidth={selectedIndex === index ? '2' : '1'}
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
