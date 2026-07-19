import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import DateNavigator, { ViewMode } from './DateNavigator';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

const renderNavigator = (
  viewMode: ViewMode,
  selectedDate: string,
  onDateChange = vi.fn(),
  onViewModeChange = vi.fn()
) => render(
  <DateNavigator
    selectedDate={selectedDate}
    onDateChange={onDateChange}
    viewMode={viewMode}
    onViewModeChange={onViewModeChange}
  />
);

describe('DateNavigator', () => {
  test('opens the in-app date picker without relying on a native date input', () => {
    const onDateChange = vi.fn();
    const onViewModeChange = vi.fn();
    renderNavigator('day', '2024-07-19', onDateChange, onViewModeChange);

    expect(document.querySelector('input[type="date"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'selectPeriod' }));

    expect(screen.getByRole('dialog', { name: 'selectPeriod' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'July 8, 2024' }));

    expect(onDateChange).toHaveBeenCalledWith('2024-07-08');
    expect(onViewModeChange).toHaveBeenCalledWith('day');
    expect(screen.queryByRole('dialog', { name: 'selectPeriod' })).not.toBeInTheDocument();
  });

  test('selects a specific month and year from the month picker', () => {
    const onDateChange = vi.fn();
    const onViewModeChange = vi.fn();
    renderNavigator('month', '2024-07-19', onDateChange, onViewModeChange);

    fireEvent.click(screen.getByRole('button', { name: 'selectPeriod' }));
    fireEvent.click(screen.getByRole('button', { name: 'previousYear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jan' }));

    expect(onDateChange).toHaveBeenCalledWith('2023-01-01');
    expect(onViewModeChange).toHaveBeenCalledWith('month');
  });

  test('closes with Escape and restores focus to the period button', async () => {
    renderNavigator('day', '2024-07-19');
    const trigger = screen.getByRole('button', { name: 'selectPeriod' });

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'selectPeriod' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'selectPeriod' })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  test('selects a year from the year grid', () => {
    const onDateChange = vi.fn();
    const onViewModeChange = vi.fn();
    renderNavigator('year', '2024-07-19', onDateChange, onViewModeChange);

    fireEvent.click(screen.getByRole('button', { name: 'selectPeriod' }));
    fireEvent.click(screen.getByRole('button', { name: '2023' }));

    expect(onDateChange).toHaveBeenCalledWith('2023-01-01');
    expect(onViewModeChange).toHaveBeenCalledWith('year');
  });

  test('moves by the active period and clamps leap-day boundaries', () => {
    const onDateChange = vi.fn();
    const { rerender } = renderNavigator('month', '2024-01-31', onDateChange);

    fireEvent.click(screen.getByRole('button', { name: 'nextPeriod' }));
    expect(onDateChange).toHaveBeenLastCalledWith('2024-02-29');

    rerender(
      <DateNavigator
        selectedDate="2024-02-29"
        onDateChange={onDateChange}
        viewMode="year"
        onViewModeChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'nextPeriod' }));
    expect(onDateChange).toHaveBeenLastCalledWith('2025-02-28');
  });

  test('hides period arrows and the daily strip in all mode', () => {
    renderNavigator('all', '2024-07-19');

    expect(screen.queryByRole('button', { name: 'previousPeriod' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'nextPeriod' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2024-07-19' })).not.toBeInTheDocument();
  });
});
