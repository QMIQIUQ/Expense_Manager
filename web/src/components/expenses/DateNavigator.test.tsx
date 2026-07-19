import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import DateNavigator from './DateNavigator';
import type { ExpensePeriodSelection } from '../../types/expensePeriod';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

const renderNavigator = (value: ExpensePeriodSelection, onChange = vi.fn()) => render(
  <DateNavigator value={value} onChange={onChange} />
);

describe('DateNavigator', () => {
  test('opens the in-app date picker without relying on a native date input', () => {
    const onChange = vi.fn();
    renderNavigator({ mode: 'day', anchorDate: '2024-07-19' }, onChange);

    expect(document.querySelector('input[type="date"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'selectPeriod' }));
    expect(screen.getByRole('dialog', { name: 'selectPeriod' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'July 8, 2024' }));

    expect(onChange).toHaveBeenCalledWith({ mode: 'day', anchorDate: '2024-07-08' });
    expect(screen.queryByRole('dialog', { name: 'selectPeriod' })).not.toBeInTheDocument();
  });

  test('selects a specific month and year from the month picker', () => {
    const onChange = vi.fn();
    renderNavigator({ mode: 'month', anchorDate: '2024-07-19' }, onChange);

    fireEvent.click(screen.getByRole('button', { name: 'selectPeriod' }));
    fireEvent.click(screen.getByRole('button', { name: 'previousYear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jan' }));
    expect(onChange).toHaveBeenCalledWith({ mode: 'month', anchorDate: '2023-01-01' });
  });

  test('closes with Escape and restores focus to the period button', async () => {
    renderNavigator({ mode: 'day', anchorDate: '2024-07-19' });
    const trigger = screen.getByRole('button', { name: 'selectPeriod' });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'selectPeriod' })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  test('selects a year from the year grid', () => {
    const onChange = vi.fn();
    renderNavigator({ mode: 'year', anchorDate: '2024-07-19' }, onChange);
    fireEvent.click(screen.getByRole('button', { name: 'selectPeriod' }));
    fireEvent.click(screen.getByRole('button', { name: '2023' }));
    expect(onChange).toHaveBeenCalledWith({ mode: 'year', anchorDate: '2023-01-01' });
  });

  test('moves by the active period and clamps leap-day boundaries', () => {
    const onChange = vi.fn();
    const { rerender } = renderNavigator({ mode: 'month', anchorDate: '2024-01-31' }, onChange);
    fireEvent.click(screen.getByRole('button', { name: 'nextPeriod' }));
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'month', anchorDate: '2024-02-29' });

    rerender(<DateNavigator value={{ mode: 'year', anchorDate: '2024-02-29' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'nextPeriod' }));
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'year', anchorDate: '2025-02-28' });
  });

  test('selects and confirms an inclusive custom range', () => {
    const onChange = vi.fn();
    renderNavigator({
      mode: 'range',
      anchorDate: '2024-07-19',
      startDate: '2024-07-01',
      endDate: '2024-07-19',
    }, onChange);

    fireEvent.click(screen.getByRole('button', { name: 'selectPeriod' }));
    fireEvent.click(screen.getByRole('button', { name: 'July 10, 2024' }));
    fireEvent.click(screen.getByRole('button', { name: 'July 15, 2024' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    expect(onChange).toHaveBeenCalledWith({
      mode: 'range',
      anchorDate: '2024-07-15',
      startDate: '2024-07-10',
      endDate: '2024-07-15',
    });
  });

  test('hides period arrows and the daily strip in all mode', () => {
    renderNavigator({ mode: 'all', anchorDate: '2024-07-19' });
    expect(screen.queryByRole('button', { name: 'previousPeriod' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'nextPeriod' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2024-07-19' })).not.toBeInTheDocument();
  });
});
