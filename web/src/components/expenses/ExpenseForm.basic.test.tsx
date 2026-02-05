import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import ExpenseForm from './ExpenseForm';
import { Category } from '../../types';

describe('ExpenseForm - Basic Tests', () => {
  const mockCategories: Category[] = [
    {
      id: '1',
      name: 'Food',
      icon: '🍔',
      color: '#FF5733',
      userId: 'test-user',
      createdAt: new Date(),
      isDefault: false,
    },
  ];

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders form fields correctly', () => {
    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
      />
    );

    // Check for form inputs
    expect(screen.getByPlaceholderText(/grocery shopping/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('displays correct title for new expense', () => {
    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
      />
    );

    expect(screen.getByText(/add expense/i)).toBeInTheDocument();
  });

  it('displays correct title when editing', () => {
    const initialData = {
      id: 'expense-1',
      description: 'Coffee',
      amount: 5.5,
      category: 'Food',
      date: '2024-01-15',
      time: '10:30',
      notes: '',
      paymentMethod: 'cash' as const,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        initialData={initialData}
      />
    );

    expect(screen.getByText(/edit expense/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coffee')).toBeInTheDocument();
  });

  it('shows payment method options', () => {
    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
      />
    );

    // PaymentMethodSelector now uses buttons instead of a select element
    // Check that the Cash button is present and selected (aria-pressed=true)
    const cashButton = screen.getByRole('button', { name: /cash|💵/i });
    expect(cashButton).toBeInTheDocument();
  });
});
