import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import InlineLoading from './InlineLoading';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('InlineLoading', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark', 'theme-cat', 'theme-cat-dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark', 'theme-cat', 'theme-cat-dark');
  });

  test('keeps the standard spinner markup and provides the paw ring for cat themes', async () => {
    localStorage.setItem('theme', 'cat');
    const { container } = render(
      <ThemeProvider>
        <InlineLoading size={28} />
      </ThemeProvider>
    );

    await waitFor(() => expect(document.documentElement).toHaveClass('theme-cat'));
    expect(container.querySelector('.inline-loading-default')).toBeInTheDocument();
    expect(container.querySelector('.inline-loading-paw')).toBeInTheDocument();
    expect(container.querySelector('.inline-loading-paw-orbit img')?.getAttribute('src')).toContain('data:image/svg+xml');
    expect(container.querySelector('.inline-loading')).toHaveStyle({ width: '28px', height: '28px' });
  });
});
