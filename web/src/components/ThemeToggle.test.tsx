import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ThemeToggle from './ThemeToggle';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';

const renderPicker = () => render(
  <ThemeProvider>
    <LanguageProvider>
      <ThemeToggle />
    </LanguageProvider>
  </ThemeProvider>
);

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark', 'theme-cat');
});

afterEach(() => {
  document.documentElement.classList.remove('dark', 'theme-cat');
  vi.restoreAllMocks();
});

describe('theme picker', () => {
  test('keeps Warm Kitty selected across a remount and switches back cleanly', async () => {
    const view = renderPicker();

    fireEvent.click(screen.getByRole('button', { name: 'Warm Kitty' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('theme-cat'));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('cat');

    view.unmount();
    renderPicker();
    expect(screen.getByRole('button', { name: 'Warm Kitty' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(document.documentElement).not.toHaveClass('theme-cat');

    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
    expect(localStorage.getItem('theme')).toBe('light');
  });

  test('system mode still follows a dark system preference', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderPicker();
    expect(screen.getByRole('button', { name: 'Follow system' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(document.documentElement).not.toHaveClass('theme-cat');
  });
});
