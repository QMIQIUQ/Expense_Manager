import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '../../test/test-utils';
import { DEFAULT_EXPENSE_FILTERS } from '../../types/expensePeriod';
import type { Category } from '../../types';
import ExpenseFiltersBar from './ExpenseFiltersBar';

const category = (name: string, order: number): Category => ({
  id: name,
  name,
  order,
  userId: 'user-1',
  icon: '📁',
  color: '#888888',
  isDefault: false,
  createdAt: new Date(),
});

describe('ExpenseFiltersBar', () => {
  it('shows category options in the manually saved order', () => {
    render(<ExpenseFiltersBar value={DEFAULT_EXPENSE_FILTERS} onChange={vi.fn()} resultCount={0}
      categories={[category('Apple', 2), category('Zebra', 0), category('Banana', 1)]} />);

    fireEvent.click(screen.getByRole('button', { name: /Filters · 0/i }));
    const options = within(screen.getByRole('combobox', { name: 'All Categories' })).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['All Categories', 'Zebra', 'Banana', 'Apple']);
  });
});
