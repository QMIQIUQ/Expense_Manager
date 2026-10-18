import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WidgetContainer from './WidgetContainer';
import { widgetDataComplete } from './completeness';
import type { WidgetProps } from './types';
vi.mock('../../../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('./RecentExpensesWidget', () => ({ default: ({ expenses }: WidgetProps) => <div>cached rows: {expenses.length}</div> }));
vi.mock('./SummaryCardsWidget', () => ({ default: () => <div>complete totals</div> }));
const data = { expenses: [{ id: 'saved' }], incomes: [], repayments: [], budgets: [], cards: [], categories: [], ewallets: [], banks: [], billingCycleDay: 1 } as unknown as WidgetProps;
describe('widget-specific completeness', () => {
  it('keeps cached non-aggregate history visible when unrelated collections failed', () => {
    render(<WidgetContainer widget={{ id: 'recent', type: 'recent-expenses', enabled: true, order: 0, size: 'medium' }} data={{ ...data, completeness: { expenses: true, banks: false, scheduledPaymentRecords: false } }} />);
    expect(screen.getByText('cached rows: 1')).toBeInTheDocument();
  });
  it('does not block valid totals on an unrelated bank/wallet failure', () => {
    render(<WidgetContainer widget={{ id: 'totals', type: 'summary-cards', enabled: true, order: 0, size: 'medium' }} data={{ ...data, completeness: { expenses: true, incomes: true, repayments: true, userSettings: true, banks: false, ewallets: false } }} />);
    expect(screen.getByText('complete totals')).toBeInTheDocument();
  });
  it('fails closed when a collection required by a total is incomplete', () => {
    render(<WidgetContainer widget={{ id: 'totals', type: 'summary-cards', enabled: true, order: 0, size: 'medium' }} data={{ ...data, completeness: { expenses: true, incomes: false, repayments: true, userSettings: true } }} />);
    expect(screen.queryByText('complete totals')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('incompleteFinancialData');
    expect(widgetDataComplete('pending-payments', { scheduledPayments: true, scheduledPaymentRecords: true })).toBe(true);
    expect(widgetDataComplete('cards-summary', { expenses: true, repayments: true, userSettings: true, cards: false })).toBe(false);
  });
});
