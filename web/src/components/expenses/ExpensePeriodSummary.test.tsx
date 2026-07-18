import React from 'react';
import { render, screen } from '@testing-library/react';
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
  test('preserves the original amount when the selected display currency matches it', () => {
    render(
      <ExpensePeriodSummary
        expenses={[expense]}
        categories={[]}
        viewMode="month"
        selectedDate="2024-07-01"
        displayCurrency="USD"
      />
    );

    expect(screen.getByText('$75.00')).toBeInTheDocument();
    expect(screen.queryByText('$74.98')).not.toBeInTheDocument();
    expect(screen.getByText('$2.42')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });
});
