import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FloatingExpenseActions from './FloatingExpenseActions';

describe('FloatingExpenseActions', () => {
  it('keeps add expense and receipt scan as separate direct actions', () => {
    const onAddExpense = vi.fn();
    const onScanReceipt = vi.fn();

    render(
      <FloatingExpenseActions
        isMobile
        addExpenseLabel="Add expense"
        scanReceiptLabel="Scan receipt"
        onAddExpense={onAddExpense}
        onScanReceipt={onScanReceipt}
        onLongPress={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(onAddExpense).toHaveBeenCalledTimes(1);
    expect(onScanReceipt).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Scan receipt' }));
    expect(onScanReceipt).toHaveBeenCalledTimes(1);
  });

  it('keeps the add expense long-press action separate from a normal click', () => {
    const onAddExpense = vi.fn();
    const onLongPress = vi.fn((target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const onScanReceipt = vi.fn();
    vi.useFakeTimers();

    try {
      render(
        <FloatingExpenseActions
          isMobile
          addExpenseLabel="Add expense"
          scanReceiptLabel="Scan receipt"
          onAddExpense={onAddExpense}
          onScanReceipt={onScanReceipt}
          onLongPress={onLongPress}
        />,
      );

      const addExpenseButton = screen.getByRole('button', { name: 'Add expense' });
      const getBoundingClientRect = vi.fn(() => ({
        x: 12,
        y: 24,
        left: 12,
        top: 24,
        right: 60,
        bottom: 72,
        width: 48,
        height: 48,
        toJSON: () => ({}),
      }));
      addExpenseButton.getBoundingClientRect = getBoundingClientRect;
      fireEvent.mouseDown(addExpenseButton);
      vi.advanceTimersByTime(500);
      fireEvent.mouseUp(addExpenseButton);
      fireEvent.click(addExpenseButton);

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(onLongPress).toHaveBeenCalledWith(addExpenseButton);
      expect(getBoundingClientRect).toHaveBeenCalledTimes(1);
      expect(onLongPress.mock.results[0]?.value).toEqual({ x: 36, y: 48 });
      expect(onAddExpense).not.toHaveBeenCalled();
      expect(onScanReceipt).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
