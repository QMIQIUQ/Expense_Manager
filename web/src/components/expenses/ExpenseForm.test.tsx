import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/test-utils';
import ExpenseForm from './ExpenseForm';
import { Category } from '../../types';

describe('ExpenseForm', () => {
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
    {
      id: '2',
      name: 'Transport',
      icon: '🚗',
      color: '#3357FF',
      userId: 'test-user',
      createdAt: new Date(),
      isDefault: false,
    },
  ];

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders the form with all fields', () => {
    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
      />
    );

    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
      />
    );

    const submitButton = screen.getByRole('button', { name: /add|submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getAllByText(/please/i).length).toBeGreaterThan(0);
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
      />
    );

    // Fill in description
    const descriptionInput = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Lunch' } });

    // Fill in amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '1250' } });

    // Select category
    const categoryCombo = screen.getByLabelText(/category/i);
    fireEvent.click(categoryCombo);
    
    await waitFor(() => {
      const foodOption = screen.getByText('Food');
      fireEvent.click(foodOption);
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Lunch',
          amount: 12.50,
          category: 'Food',
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('populates form with initialData when editing', () => {
    const initialData = {
      id: 'expense-1',
      description: 'Coffee',
      amount: 5.50,
      category: 'Food',
      date: '2024-01-15',
      time: '10:30',
      notes: 'Morning coffee',
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

    expect(screen.getByDisplayValue('Coffee')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5.50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Morning coffee')).toBeInTheDocument();
  });

  it('shows credit card selection when payment method is credit card', async () => {
    const mockCards = [
      {
        id: 'card-1',
        name: 'VISA',
        lastFourDigits: '1234',
        billingCycleStart: 1,
        billingCycleEnd: 31,
        userId: 'test-user',
        createdAt: new Date(),
        cardLimit: 5000,
        billingDay: 25,
        cardType: 'cashback' as const,
        updatedAt: new Date(),
      },
    ];

    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    const paymentMethodSelect = screen.getByLabelText(/payment method/i);
    fireEvent.change(paymentMethodSelect, { target: { value: 'credit_card' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/select card/i)).toBeInTheDocument();
    });
  });

  it('handles amount input correctly with decimal format', () => {
    render(
      <ExpenseForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    
    // Type "1250" should display as "12.50"
    fireEvent.change(amountInput, { target: { value: '1250' } });
    expect(amountInput).toHaveValue('12.50');
  });
});
