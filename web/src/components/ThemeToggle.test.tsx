import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  document.documentElement.classList.remove('dark', 'theme-cat', 'theme-cat-dark');
  document.documentElement.style.removeProperty('--font-family-base');
  document.documentElement.style.fontSize = '';
});

afterEach(() => {
  document.documentElement.classList.remove('dark', 'theme-cat', 'theme-cat-dark');
  document.documentElement.style.removeProperty('--font-family-base');
  document.documentElement.style.fontSize = '';
  vi.restoreAllMocks();
});

describe('theme picker', () => {
  test('shows three theme choices with brightness controls above them', () => {
    renderPicker();

    expect(screen.getByRole('switch', { name: 'Brightness' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Warm Kitty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Follow system' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getAllByRole('switch')).toHaveLength(1);
  });

  test('maps brightness controls to Warm Kitty themes and preserves selection across remounts', async () => {
    const view = renderPicker();

    fireEvent.click(screen.getByRole('button', { name: 'Warm Kitty' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('theme-cat'));
    expect(localStorage.getItem('theme')).toBe('cat');

    fireEvent.click(screen.getByRole('switch', { name: 'Brightness' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark', 'theme-cat', 'theme-cat-dark'));
    expect(localStorage.getItem('theme')).toBe('cat-dark');

    view.unmount();
    renderPicker();
    expect(screen.getByRole('button', { name: 'Warm Kitty' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('switch', { name: 'Brightness' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('switch', { name: 'Brightness' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('theme-cat'));
    expect(document.documentElement).not.toHaveClass('dark', 'theme-cat-dark');
    expect(localStorage.getItem('theme')).toBe('cat');
  });

  test('switching theme families retains the currently effective brightness', async () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Default' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Brightness' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    fireEvent.click(screen.getByRole('button', { name: 'Warm Kitty' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark', 'theme-cat', 'theme-cat-dark'));
    expect(localStorage.getItem('theme')).toBe('cat-dark');

    fireEvent.click(screen.getByRole('button', { name: 'Default' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(document.documentElement).not.toHaveClass('theme-cat');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  test('Follow system reflects the system setting and disables manual brightness', async () => {
    let prefersDark = true;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)' && prefersDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_type, listener) => {
        if (typeof listener === 'function') listeners.add(listener as (event: MediaQueryListEvent) => void);
      }),
      removeEventListener: vi.fn((_type, listener) => {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      }),
      dispatchEvent: vi.fn(),
    } as MediaQueryList));

    renderPicker();
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(screen.getByRole('switch', { name: 'Brightness' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Brightness' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Warm Kitty' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('theme-cat', 'theme-cat-dark'));
    expect(localStorage.getItem('theme')).toBe('cat-dark');

    fireEvent.click(screen.getByRole('button', { name: 'Follow system' }));
    prefersDark = false;
    act(() => listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent)));
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
    expect(document.documentElement).not.toHaveClass('theme-cat');
  });

  test('keeps saved cat-dark and independent font settings', async () => {
    localStorage.setItem('theme', 'cat-dark');
    localStorage.setItem('fontFamily', 'serif');
    localStorage.setItem('fontScale', 'large');

    renderPicker();
    await waitFor(() => expect(document.documentElement).toHaveClass('dark', 'theme-cat', 'theme-cat-dark'));
    expect(screen.getByRole('button', { name: 'Warm Kitty' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.style.getPropertyValue('--font-family-base')).toContain('ui-serif');
    expect(document.documentElement.style.fontSize).toBe('18px');
  });

  test('shows the new choices in all supported locales', () => {
    const english = renderPicker();
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument();
    english.unmount();

    localStorage.setItem('language', 'zh');
    const traditional = renderPicker();
    expect(screen.getByRole('button', { name: '預設' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '暖心小貓' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '明暗模式' })).toBeInTheDocument();
    traditional.unmount();

    localStorage.setItem('language', 'zh-CN');
    renderPicker();
    expect(screen.getByRole('button', { name: '默认' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '暖心小猫' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '明暗模式' })).toBeInTheDocument();
  });
});
