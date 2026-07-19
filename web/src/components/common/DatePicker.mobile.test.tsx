import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import DatePicker from './DatePicker';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

describe('DatePicker mobile behavior', () => {
  const originalWidth = window.innerWidth;
  const originalTouchPoints = navigator.maxTouchPoints;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 1 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: originalTouchPoints });
  });

  test('opens the shared in-app picker instead of an iPhone native date input', async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2024-07-19" onChange={onChange} label="Date" />);

    await waitFor(() => expect(document.querySelector('input[type="date"]')).toBeNull());
    fireEvent.click(screen.getByDisplayValue('2024-07-19'));
    expect(screen.getByRole('dialog', { name: 'selectPeriod' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'July 8, 2024' }));
    expect(onChange).toHaveBeenCalledWith('2024-07-08');
  });
});
