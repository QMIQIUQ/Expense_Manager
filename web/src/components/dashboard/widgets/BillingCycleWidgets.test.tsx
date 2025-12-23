import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import CategoryBreakdownWidget from './CategoryBreakdownWidget';
import ExpenseChartWidget from './ExpenseChartWidget';
import SpendingTrendWidget from './SpendingTrendWidget';
import { WidgetProps } from './types';
import { Expense } from '../../../types';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({ dateFormat: 'YYYY-MM-DD' }),
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Pie: ({ data, children }: { data: unknown; children?: React.ReactNode }) => (
      <div data-testid="pie-data">
        {JSON.stringify(data)}
        {children}
      </div>
    ),
    LineChart: ({ data, children }: { data: unknown; children?: React.ReactNode }) => (
      <div data-testid="line-data">
        {JSON.stringify(data)}
        {children}
      </div>
    ),
    Legend: () => null,
    Tooltip: () => null,
    Cell: () => null,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
  };
});

const commonProps = {
  incomes: [],
  repayments: [],
  budgets: [],
  cards: [],
  categories: [],
  ewallets: [],
  banks: [],
} satisfies Omit<WidgetProps, 'expenses' | 'billingCycleDay'>;

const createExpense = (overrides: Partial<Expense>): Expense => ({
  userId: 'user',
  description: 'Test',
  amount: 0,
  category: 'General',
  date: '2024-01-01',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (global as any).ResizeObserver = ResizeObserverMock;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Dashboard widgets respect billing cycle day', () => {
  test('CategoryBreakdownWidget filters expenses to the current billing cycle', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-07-20T12:00:00Z'));

    const expenses = [
      createExpense({ category: 'Food', amount: 100, date: '2024-07-16' }),
      createExpense({ category: 'Travel', amount: 50, date: '2024-07-01' }),
      createExpense({ category: 'Travel', amount: 30, date: '2024-08-05' }),
      createExpense({ category: 'Other', amount: 25, date: '2024-08-20' }),
    ];

    render(<CategoryBreakdownWidget {...commonProps} expenses={expenses} billingCycleDay={15} />);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
    expect(screen.queryByText('Other')).not.toBeInTheDocument();
  });

  test('ExpenseChartWidget aggregates only in-cycle expenses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-07-20T12:00:00Z'));

    const expenses = [
      createExpense({ category: 'Food', amount: 100, date: '2024-07-16' }),
      createExpense({ category: 'Travel', amount: 50, date: '2024-07-01' }),
      createExpense({ category: 'Travel', amount: 30, date: '2024-08-05' }),
      createExpense({ category: 'Other', amount: 25, date: '2024-08-20' }),
    ];

    render(<ExpenseChartWidget {...commonProps} expenses={expenses} billingCycleDay={15} />);

    const pieDataRaw = screen.getByTestId('pie-data').textContent || '[]';
    const pieData = JSON.parse(pieDataRaw);

    expect(pieData).toEqual([
      { name: 'Food', value: 100, percentage: '76.9' },
      { name: 'Travel', value: 30, percentage: '23.1' },
    ]);
  });

  test('SpendingTrendWidget excludes expenses before the billing cycle start', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-07-02T12:00:00Z'));

    const expenses = [
      createExpense({ amount: 40, date: '2024-06-28' }),
      createExpense({ amount: 10, date: '2024-06-30' }),
      createExpense({ amount: 20, date: '2024-07-01' }),
    ];

    render(<SpendingTrendWidget {...commonProps} expenses={expenses} billingCycleDay={30} />);

    const lineDataRaw = screen.getByTestId('line-data').textContent || '[]';
    const lineData = JSON.parse(lineDataRaw);

    const june28 = lineData.find((item: { date: string }) => item.date === '06/28');
    const june30 = lineData.find((item: { date: string }) => item.date === '06/30');
    const july01 = lineData.find((item: { date: string }) => item.date === '07/01');

    expect(june28?.amount).toBe(0);
    expect(june30?.amount).toBe(10);
    expect(july01?.amount).toBe(20);
  });
});
