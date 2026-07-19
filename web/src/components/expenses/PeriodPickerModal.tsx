import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../icons';
import type { ExpensePeriodMode, ExpensePeriodSelection } from '../../types/expensePeriod';

export type PeriodPickerMode = Exclude<ExpensePeriodMode, 'all'>;
const DEFAULT_ALLOWED_MODES: PeriodPickerMode[] = ['day', 'month', 'year', 'range'];

interface PeriodPickerModalProps {
  isOpen: boolean;
  value: ExpensePeriodSelection;
  onClose: () => void;
  onSelect: (value: ExpensePeriodSelection) => void;
  allowedModes?: PeriodPickerMode[];
  min?: string;
  max?: string;
}

const getLocale = (language: string): string => {
  if (language === 'zh-CN') return 'zh-CN';
  if (language === 'zh') return 'zh-TW';
  return 'en';
};

const formatDateValue = (year: number, month: number, day: number): string => (
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
);

const parseDateValue = (value: string): Date => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const PeriodPickerModal: React.FC<PeriodPickerModalProps> = ({
  isOpen,
  value,
  onClose,
  onSelect,
  allowedModes = DEFAULT_ALLOWED_MODES,
  min,
  max,
}) => {
  const { t, language } = useLanguage();
  const selectedDate = useMemo(() => parseDateValue(value.anchorDate), [value.anchorDate]);
  const [activeMode, setActiveMode] = useState<PeriodPickerMode>('day');
  const [calendarYear, setCalendarYear] = useState(selectedDate.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(selectedDate.getMonth());
  const [monthYear, setMonthYear] = useState(selectedDate.getFullYear());
  const [yearPageStart, setYearPageStart] = useState(Math.floor(selectedDate.getFullYear() / 12) * 12);
  const [rangeStart, setRangeStart] = useState(value.startDate || value.anchorDate);
  const [rangeEnd, setRangeEnd] = useState(value.endDate || '');
  const dialogRef = useRef<HTMLDivElement>(null);
  const locale = getLocale(language);

  useEffect(() => {
    if (!isOpen) return;
    const requestedMode = value.mode === 'all' ? 'day' : value.mode;
    const mode = allowedModes.includes(requestedMode) ? requestedMode : allowedModes[0];
    const year = selectedDate.getFullYear();
    setActiveMode(mode);
    setCalendarYear(year);
    setCalendarMonth(selectedDate.getMonth());
    setMonthYear(year);
    setYearPageStart(Math.floor(year / 12) * 12);
    setRangeStart(value.startDate || value.anchorDate);
    setRangeEnd(value.endDate || '');
  }, [allowedModes, isOpen, selectedDate, value.anchorDate, value.endDate, value.mode, value.startDate]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const preferred = dialogRef.current?.querySelector<HTMLElement>('[data-period-picker-autofocus="true"]');
      const fallback = dialogRef.current?.querySelector<HTMLElement>('button');
      (preferred || fallback)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, month) => (
      new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2024, month, 1))
    )),
    [locale]
  );

  const weekdayNames = useMemo(
    () => Array.from({ length: 7 }, (_, day) => (
      new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 7 + day))
    )),
    [locale]
  );

  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const cells: Array<number | null> = Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth, calendarYear]);

  const changeCalendarMonth = (offset: number) => {
    const next = new Date(calendarYear, calendarMonth + offset, 1);
    setCalendarYear(next.getFullYear());
    setCalendarMonth(next.getMonth());
  };

  const selectValue = (date: string, mode: Exclude<PeriodPickerMode, 'range'>) => {
    onSelect({ mode, anchorDate: date });
    onClose();
  };

  const handleRangeDateClick = (date: string) => {
    if (!rangeStart || rangeEnd || date < rangeStart) {
      setRangeStart(date);
      setRangeEnd('');
      return;
    }
    setRangeEnd(date);
  };

  const confirmRange = () => {
    if (!rangeStart || !rangeEnd) return;
    onSelect({ mode: 'range', anchorDate: rangeEnd, startDate: rangeStart, endDate: rangeEnd });
    onClose();
  };

  if (!isOpen) return null;

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const selectedDay = selectedDate.getDate();
  const yearOptions = Array.from({ length: 12 }, (_, index) => yearPageStart + index);
  const calendarHeading = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' })
    .format(new Date(calendarYear, calendarMonth, 1));

  const modal = (
    <div
      className="period-picker-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="period-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('selectPeriod')}
      >
        <div className="period-picker-header">
          <h3>{t('selectPeriod')}</h3>
          <button type="button" className="period-picker-icon-button" onClick={onClose} aria-label={t('close')}>
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="period-picker-tabs" role="tablist" aria-label={t('selectPeriod')}>
          {allowedModes.map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={activeMode === mode}
              className={activeMode === mode ? 'active' : ''}
              onClick={() => setActiveMode(mode)}
            >
              {t(mode === 'day' ? 'date' : mode === 'range' ? 'customRange' : mode)}
            </button>
          ))}
        </div>

        <div className="period-picker-content">
          {(activeMode === 'day' || activeMode === 'range') && (
            <>
              <div className="period-picker-navigation">
                <button type="button" onClick={() => changeCalendarMonth(-1)} aria-label={t('previousMonth')}>
                  <ChevronLeftIcon size={20} />
                </button>
                <strong>{calendarHeading}</strong>
                <button type="button" onClick={() => changeCalendarMonth(1)} aria-label={t('nextMonth')}>
                  <ChevronRightIcon size={20} />
                </button>
              </div>
              <div className="period-picker-calendar" role="grid">
                {weekdayNames.map((weekday, index) => (
                  <span key={`${weekday}-${index}`} className="period-picker-weekday" aria-hidden="true">{weekday}</span>
                ))}
                {calendarDays.map((day, index) => {
                  if (day === null) return <span key={`empty-${index}`} className="period-picker-empty" />;
                  const isSelected = calendarYear === selectedYear && calendarMonth === selectedMonth && day === selectedDay;
                  const dateValue = formatDateValue(calendarYear, calendarMonth, day);
                  const isDisabled = (!!min && dateValue < min) || (!!max && dateValue > max);
                  const isRangeBoundary = activeMode === 'range' && (dateValue === rangeStart || dateValue === rangeEnd);
                  const isInRange = activeMode === 'range' && !!rangeStart && !!rangeEnd && dateValue > rangeStart && dateValue < rangeEnd;
                  return (
                    <button
                      key={dateValue}
                      type="button"
                      className={`${activeMode === 'day' && isSelected ? 'selected' : ''} ${isRangeBoundary ? 'selected' : ''} ${isInRange ? 'in-range' : ''}`}
                      aria-pressed={activeMode === 'day' ? isSelected : isRangeBoundary}
                      disabled={isDisabled}
                      aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(calendarYear, calendarMonth, day))}
                      data-period-picker-autofocus={isSelected ? 'true' : undefined}
                      onClick={() => activeMode === 'range' ? handleRangeDateClick(dateValue) : selectValue(dateValue, 'day')}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {activeMode === 'range' && (
                <div className="period-picker-range-footer">
                  <span>{rangeStart || '—'} → {rangeEnd || t('selectEndDate')}</span>
                  <button type="button" className="period-picker-confirm" onClick={confirmRange} disabled={!rangeStart || !rangeEnd}>
                    {t('confirm')}
                  </button>
                </div>
              )}
            </>
          )}

          {activeMode === 'month' && (
            <>
              <div className="period-picker-navigation">
                <button type="button" onClick={() => setMonthYear((year) => year - 1)} aria-label={t('previousYear')}>
                  <ChevronLeftIcon size={20} />
                </button>
                <strong>{monthYear}</strong>
                <button type="button" onClick={() => setMonthYear((year) => year + 1)} aria-label={t('nextYear')}>
                  <ChevronRightIcon size={20} />
                </button>
              </div>
              <div className="period-picker-month-grid">
                {monthNames.map((monthName, month) => {
                  const isSelected = monthYear === selectedYear && month === selectedMonth;
                  return (
                    <button
                      key={monthName}
                      type="button"
                      className={isSelected ? 'selected' : ''}
                      aria-pressed={isSelected}
                      data-period-picker-autofocus={isSelected ? 'true' : undefined}
                      onClick={() => selectValue(formatDateValue(monthYear, month, 1), 'month')}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeMode === 'year' && (
            <>
              <div className="period-picker-navigation">
                <button type="button" onClick={() => setYearPageStart((year) => year - 12)} aria-label={t('previousYears')}>
                  <ChevronLeftIcon size={20} />
                </button>
                <strong>{yearPageStart}–{yearPageStart + 11}</strong>
                <button type="button" onClick={() => setYearPageStart((year) => year + 12)} aria-label={t('nextYears')}>
                  <ChevronRightIcon size={20} />
                </button>
              </div>
              <div className="period-picker-year-grid">
                {yearOptions.map((year) => {
                  const isSelected = year === selectedYear;
                  return (
                    <button
                      key={year}
                      type="button"
                      className={isSelected ? 'selected' : ''}
                      aria-pressed={isSelected}
                      data-period-picker-autofocus={isSelected ? 'true' : undefined}
                      onClick={() => selectValue(formatDateValue(year, 0, 1), 'year')}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PeriodPickerModal;
