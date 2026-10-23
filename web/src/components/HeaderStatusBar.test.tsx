import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import HeaderStatusBar from './HeaderStatusBar';
import { LanguageProvider } from '../contexts/LanguageContext';

describe('HeaderStatusBar', () => {
  test('keeps the collapsed loading icon decorative and exposes the status accessibly', () => {
    const { container } = render(
      <LanguageProvider>
        <HeaderStatusBar isRevalidating />
      </LanguageProvider>
    );

    const spinner = container.querySelector('.header-status-toggle-icon-active');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
    expect(container.textContent).toContain('Updating data');
    expect(screen.getByRole('button', { name: /updating data/i })).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelector('.header-status-panel')).not.toBeInTheDocument();
  });

  test('opens progress details on demand without placing a full-width bar over content', () => {
    const { container } = render(
      <LanguageProvider>
        <HeaderStatusBar isRevalidating />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /updating data/i }));

    expect(screen.getByRole('button', { name: /updating data/i })).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('.header-status-panel')).toBeVisible();
  });
});
