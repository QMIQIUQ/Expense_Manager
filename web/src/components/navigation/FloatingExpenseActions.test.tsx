import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../index.css';
import '../../cat-theme.css';
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

    const addExpenseButton = screen.getByRole('button', { name: 'Add expense' });
    const scanReceiptButton = screen.getByRole('button', { name: 'Scan receipt' });

    expect(addExpenseButton).toHaveClass('floating-expense-action-primary');
    expect(scanReceiptButton).toHaveClass('floating-expense-action-secondary');
    expect(addExpenseButton).not.toHaveClass('floating-btn-hover');
    expect(scanReceiptButton).not.toHaveClass('floating-btn-hover');

    fireEvent.click(addExpenseButton);
    expect(onAddExpense).toHaveBeenCalledTimes(1);
    expect(onScanReceipt).not.toHaveBeenCalled();

    fireEvent.click(scanReceiptButton);
    expect(onScanReceipt).toHaveBeenCalledTimes(1);
  });

  it('keeps the dark-theme floating action group transparent', () => {
    render(
      <div className="dark">
        <FloatingExpenseActions
          isMobile={false}
          addExpenseLabel="Add expense"
          scanReceiptLabel="Scan receipt"
          onAddExpense={vi.fn()}
          onScanReceipt={vi.fn()}
          onLongPress={vi.fn()}
        />
      </div>,
    );

    const actionGroup = screen.getByRole('button', { name: 'Add expense' }).parentElement;
    expect(actionGroup).toHaveClass('floating-expense-actions');
    const actionGroupStyles = getComputedStyle(actionGroup as HTMLElement);
    expect(actionGroupStyles.getPropertyValue('background-color')).toBe('transparent');
    expect(actionGroupStyles.getPropertyValue('box-shadow')).toBe('none');
  });

  it.each([
    ['Dark', 'dark'],
    ['Dark Warm Kitty', 'dark theme-cat theme-cat-dark'],
  ])('keeps the receipt scan action visually secondary in %s', (_theme, themeClasses) => {
    render(
      <div className={themeClasses}>
        <FloatingExpenseActions
          isMobile={false}
          addExpenseLabel="Add expense"
          scanReceiptLabel="Scan receipt"
          onAddExpense={vi.fn()}
          onScanReceipt={vi.fn()}
          onLongPress={vi.fn()}
        />
      </div>,
    );

    const addExpenseButton = screen.getByRole('button', { name: 'Add expense' });
    const scanReceiptButton = screen.getByRole('button', { name: 'Scan receipt' });
    const addExpenseStyles = getComputedStyle(addExpenseButton);
    const scanReceiptStyles = getComputedStyle(scanReceiptButton);

    expect(scanReceiptButton).toHaveClass('floating-expense-action-secondary');
    expect(scanReceiptStyles.getPropertyValue('background')).not.toBe(addExpenseStyles.getPropertyValue('background'));
    expect(scanReceiptStyles.getPropertyValue('box-shadow')).not.toBe(addExpenseStyles.getPropertyValue('box-shadow'));
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
