import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WidgetContainer from './WidgetContainer';
import type { WidgetProps } from './types';
import type { DashboardWidget } from '../../../types/dashboard';
const draws = vi.hoisted(() => ({ recent: vi.fn(), tracked: vi.fn(), summary: vi.fn(), chart: vi.fn(), scheduled: vi.fn() }));
const language = React.createContext({ t: (key: string) => key });
vi.mock('../../../contexts/LanguageContext', () => ({ useLanguage: () => React.useContext(language) }));
vi.mock('./RecentExpensesWidget', () => ({ default: (props: WidgetProps & { onViewAll?: () => void }) => {
  draws.recent(); return <button onClick={props.onViewAll}>Rows {props.expenses.length}</button>;
} }));
vi.mock('./TrackedExpensesWidget', () => ({ default: (props: WidgetProps) => {
  draws.tracked(); return <button onClick={() => props.onNavigateToExpense?.('tracked-expense')}>Tracked expense</button>;
} }));
vi.mock('./SummaryCardsWidget', () => ({ default: ({ displayCurrency }: WidgetProps) => { draws.summary(); return <p>Summary {displayCurrency}</p>; } }));
vi.mock('./ExpenseChartWidget', () => ({ default: ({ displayCurrency }: WidgetProps) => { draws.chart(); return <p>Chart {displayCurrency}</p>; } }));
vi.mock('./PendingPaymentsWidget', () => ({ default: (props: WidgetProps) => { draws.scheduled(); return <button onClick={() => props.onNavigateToScheduledPayment?.('payment')}>Scheduled {props.categories.length}</button>; } }));
const data = { expenses: [], incomes: [], repayments: [], budgets: [], cards: [], categories: [], ewallets: [], banks: [], billingCycleDay: 1 } as WidgetProps;
describe('widget render isolation', () => {
  it('updates financial dependencies, currency and completeness without repainting for unrelated budgets', () => {
    draws.summary.mockClear();
    const widget: DashboardWidget = { id: 'summary', type: 'summary-cards', enabled: true, order: 0, size: 'full' };
    const valid = { ...data, completeness: { expenses: true, incomes: true, repayments: true, receivableExpenses: true, userSettings: true } };
    const view = render(<WidgetContainer widget={widget} data={valid} />);
    view.rerender(<WidgetContainer widget={widget} data={{ ...valid, budgets: [{}] as WidgetProps['budgets'] }} />);
    expect(draws.summary).toHaveBeenCalledTimes(1);
    view.rerender(<WidgetContainer widget={widget} data={{ ...valid, displayCurrency: 'USD', incomes: [{}] as WidgetProps['incomes'] }} />);
    expect(screen.getByText('Summary USD')).toBeInTheDocument(); expect(draws.summary).toHaveBeenCalledTimes(2);
    view.rerender(<WidgetContainer widget={widget} data={{ ...valid, completeness: { ...valid.completeness, incomes: false } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('incompleteFinancialData');
    expect(screen.queryByText(/Summary/)).not.toBeInTheDocument();
  });
  it('isolates a deferred chart while allowing relevant categories, currency and language updates', async () => {
    draws.chart.mockClear();
    const widget: DashboardWidget = { id: 'chart', type: 'expense-chart', enabled: true, order: 0, size: 'medium' };
    const valid = { ...data, completeness: { expenses: true, repayments: true, userSettings: true }, displayCurrency: 'MYR' as const };
    const view = render(<WidgetContainer widget={widget} data={valid} />);
    await waitFor(() => expect(screen.getByText('Chart MYR')).toBeInTheDocument());
    const initial = draws.chart.mock.calls.length;
    view.rerender(<WidgetContainer widget={widget} data={{ ...valid, budgets: [{}] as WidgetProps['budgets'] }} onNavigateToExpenses={vi.fn()} />);
    expect(draws.chart).toHaveBeenCalledTimes(initial);
    view.rerender(<WidgetContainer widget={widget} data={{ ...valid, categories: [{}] as WidgetProps['categories'], displayCurrency: 'USD' }} />);
    expect(screen.getByText('Chart USD')).toBeInTheDocument();
    view.rerender(<language.Provider value={{ t: (key) => 'zh:' + key }}><WidgetContainer widget={widget} data={valid} /></language.Provider>);
    expect(screen.getByText('zh:expenseChart')).toBeInTheDocument();
  });
  it('refreshes scheduled categories and callbacks without reacting to unrelated expense arrays', () => {
    draws.scheduled.mockClear();
    const widget: DashboardWidget = { id: 'scheduled', type: 'pending-payments', enabled: true, order: 0, size: 'medium' };
    const valid = { ...data, completeness: { scheduledPayments: true, scheduledPaymentRecords: true } };
    const old = vi.fn(); const next = vi.fn();
    const view = render(<WidgetContainer widget={widget} data={valid} onNavigateToScheduledPayment={old} />);
    view.rerender(<WidgetContainer widget={widget} data={{ ...valid, expenses: [{}] as WidgetProps['expenses'] }} onNavigateToScheduledPayment={old} />);
    expect(draws.scheduled).toHaveBeenCalledTimes(1);
    view.rerender(<WidgetContainer widget={widget} data={{ ...valid, categories: [{}] as WidgetProps['categories'] }} onNavigateToScheduledPayment={next} />);
    fireEvent.click(screen.getByText('Scheduled 1'));
    expect(next).toHaveBeenCalledWith('payment'); expect(old).not.toHaveBeenCalled();
  });
  it('skips unrelated budget changes, but propagates expense and callback updates', () => {
    const widget: DashboardWidget = { id: 'recent', type: 'recent-expenses', enabled: true, order: 0, size: 'medium' };
    const oldNavigate = vi.fn(); const navigate = vi.fn(); draws.recent.mockClear();
    const view = render(<WidgetContainer widget={widget} data={data} onNavigateToExpenses={oldNavigate} />);
    view.rerender(<WidgetContainer widget={widget} data={{ ...data, budgets: [{}] as WidgetProps['budgets'] }} onNavigateToExpenses={oldNavigate} />);
    expect(draws.recent).toHaveBeenCalledTimes(1);
    view.rerender(<WidgetContainer widget={widget} data={{ ...data, expenses: [{}] as WidgetProps['expenses'] }} onNavigateToExpenses={navigate} />);
    expect(draws.recent).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText('Rows 1'));
    expect(navigate).toHaveBeenCalledOnce(); expect(oldNavigate).not.toHaveBeenCalled();
  });
  it('forwards exact expense navigation from the receivable tracking widget', () => {
    const widget: DashboardWidget = { id: 'tracked', type: 'tracked-expenses', enabled: true, order: 0, size: 'medium' };
    const navigate = vi.fn();
    const valid = { ...data, completeness: { expenses: true, repayments: true, receivableExpenses: true } };
    render(<WidgetContainer widget={widget} data={valid} onNavigateToExpense={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tracked expense' }));
    expect(navigate).toHaveBeenCalledWith('tracked-expense');
  });
});
