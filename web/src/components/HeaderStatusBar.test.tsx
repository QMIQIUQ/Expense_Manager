import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import HeaderStatusBar from './HeaderStatusBar';
import { LanguageProvider } from '../contexts/LanguageContext';

describe('HeaderStatusBar', () => {
  test('keeps the loading icon decorative beside its status text', () => {
    const { container } = render(
      <LanguageProvider>
        <HeaderStatusBar isRevalidating />
      </LanguageProvider>
    );

    const spinner = container.querySelector('.loading-status-icon');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
    expect(container.textContent).toContain('Updating data');
  });
});
