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

  test('persists Dark Warm Kitty and keeps it dark independently of system changes', async () => {
    let prefersDark = false;
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
    localStorage.setItem('fontFamily', 'serif');
    localStorage.setItem('fontScale', 'large');

    const view = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Dark Warm Kitty' }));
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark', 'theme-cat', 'theme-cat-dark');
    });
    expect(localStorage.getItem('theme')).toBe('cat-dark');
    expect(document.documentElement.style.getPropertyValue('--font-family-base')).toContain('ui-serif');
    expect(document.documentElement.style.fontSize).toBe('18px');

    prefersDark = true;
    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
    expect(document.documentElement).toHaveClass('dark', 'theme-cat', 'theme-cat-dark');

    view.unmount();
    renderPicker();
    expect(screen.getByRole('button', { name: 'Dark Warm Kitty' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveClass('dark', 'theme-cat', 'theme-cat-dark');

    fireEvent.click(screen.getByRole('button', { name: 'Warm Kitty' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('theme-cat'));
    expect(document.documentElement).not.toHaveClass('dark', 'theme-cat-dark');
    expect(document.documentElement.style.getPropertyValue('--font-family-base')).toContain('ui-serif');
    expect(document.documentElement.style.fontSize).toBe('18px');
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

  test('responds to system preference changes while keeping Warm Kitty light', async () => {
    let prefersDark = false;
    const listeners = new Set<() => void>();
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)' && prefersDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_type, listener) => {
        if (typeof listener === 'function') listeners.add(listener);
      }),
      removeEventListener: vi.fn((_type, listener) => {
        if (typeof listener === 'function') listeners.delete(listener);
      }),
      dispatchEvent: vi.fn(),
    }));

    renderPicker();
    expect(document.documentElement).not.toHaveClass('dark');

    prefersDark = true;
    act(() => listeners.forEach((listener) => listener()));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    fireEvent.click(screen.getByRole('button', { name: 'Warm Kitty' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('theme-cat'));
    expect(document.documentElement).not.toHaveClass('dark');

    prefersDark = false;
    act(() => listeners.forEach((listener) => listener()));
    expect(document.documentElement).not.toHaveClass('dark');
  });

  test('ignores an invalid saved theme and preserves font settings', () => {
    localStorage.setItem('theme', 'invalid');
    localStorage.setItem('fontFamily', 'mono');
    localStorage.setItem('fontScale', 'large');

    renderPicker();
    expect(screen.getByRole('button', { name: 'Follow system' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Warm Kitty' }));
    expect(document.documentElement.style.getPropertyValue('--font-family-base')).toContain('ui-monospace');
    expect(document.documentElement.style.fontSize).toBe('18px');
  });

  test('shows both cat theme options in all supported locales', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Dark Warm Kitty' })).toBeInTheDocument();

    localStorage.setItem('language', 'zh');
    const view = renderPicker();
    expect(screen.getByRole('button', { name: '暖心小貓' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '暗黑暖心小貓' })).toBeInTheDocument();

    view.unmount();
    localStorage.setItem('language', 'zh-CN');
    renderPicker();
    expect(screen.getByRole('button', { name: '暖心小猫' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '暗黑暖心小猫' })).toBeInTheDocument();
  });
});
