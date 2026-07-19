import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { Expense } from '../../types';
import ExpensePeriodSummary from './ExpensePeriodSummary';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('../../hooks/useCurrencyConversionMap', () => ({
  useCurrencyConversionMap: (entries: Array<{ key: string; amount: number }>) =>
    Object.fromEntries(entries.map((entry) => [entry.key, entry.amount])),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const expense: Expense = {
  id: 'usd-expense',
  userId: 'user',
  description: 'Receipt total',
  amount: 75,
  currency: 'USD',
  baseAmount: 74.98,
  baseCurrency: 'MYR',
  category: 'Food',
  date: '2024-07-08',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ExpensePeriodSummary', () => {
  test('starts collapsed and expands the detailed overview on demand', () => {
    render(
      <ExpensePeriodSummary
        expenses={[expense]}
        categories={[]}
        period={{ mode: 'month', anchorDate: '2024-07-01' }}
        displayCurrency="USD"
      />
    );

    expect(screen.getByText('$75.00')).toBeInTheDocument();
    expect(screen.queryByText('$74.98')).not.toBeInTheDocument();
    expect(screen.queryByText('$2.42')).not.toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'expandSummary' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'collapseSummary' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('$2.42')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });
});
