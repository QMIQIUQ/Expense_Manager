import React from 'react';
import { fireEvent, render, screen } from '../../test/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ExpenseSplitEditor } from './ExpenseSplitEditor';

describe('ExpenseSplitEditor receivables panel', () => {
  it('keeps the overall receivable switch and optional person shares in one panel', () => {
    const onTrackingChange = vi.fn();
    const { container } = render(
      <LanguageProvider>
        <ExpenseSplitEditor value={[]} onChange={vi.fn()} totalMinor={10000} currency="TWD" trackingEnabled={false} onTrackingChange={onTrackingChange} />
      </LanguageProvider>
    );

    const panel = container.querySelector('.expense-receivable-panel');
    expect(panel).toBeInTheDocument();
    expect(panel?.querySelector('legend')).toHaveTextContent('Expense split and amount owed');
    expect(screen.getByRole('checkbox', { name: 'Track money owed to me' })).not.toBeChecked();
    expect(screen.queryByRole('textbox', { name: 'Split participant' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Track money owed to me' }));

    expect(onTrackingChange).toHaveBeenCalledWith(true);
  });

  it('automatically shows repayment tracking when participant shares exist', () => {
    const { container } = render(
      <LanguageProvider>
        <ExpenseSplitEditor
          value={[{ id: 'participant-1', name: 'Alex', owedMinor: 2500 }]}
          onChange={vi.fn()}
          totalMinor={10000}
          currency="TWD"
          trackingEnabled={false}
          onTrackingChange={vi.fn()}
        />
      </LanguageProvider>
    );

    const panel = container.querySelector('.expense-receivable-panel');
    expect(panel?.querySelectorAll('fieldset')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('Amount owed is set. When money arrives, record it once from the expense details.');
    expect(screen.getByRole('textbox', { name: 'Split participant' })).toHaveValue('Alex');
    expect(screen.queryByRole('checkbox', { name: 'Track money owed to me' })).not.toBeInTheDocument();
  });

  it('keeps Enter from a split input from reaching the expense form keyboard handler', () => {
    const parentKeyDown = vi.fn();
    render(
      <LanguageProvider>
        <div onKeyDown={parentKeyDown}>
          <ExpenseSplitEditor
            value={[{ id: 'participant-1', name: 'Alex', owedMinor: 2500 }]}
            onChange={vi.fn()}
            totalMinor={10000}
            currency="TWD"
            trackingEnabled={false}
            onTrackingChange={vi.fn()}
          />
        </div>
      </LanguageProvider>
    );

    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Owed Alex' }), { key: 'Enter' });

    expect(parentKeyDown).not.toHaveBeenCalled();
  });
});
