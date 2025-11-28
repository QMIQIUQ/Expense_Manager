import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import CategoryForm from './CategoryForm';

describe('CategoryForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders the category form', () => {
    render(
      <CategoryForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByLabelText(/category name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/icon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/color/i)).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    render(
      <CategoryForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/please fill/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid category data', async () => {
    render(
      <CategoryForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Fill in name
    const nameInput = screen.getByLabelText(/category name/i);
    fireEvent.change(nameInput, { target: { value: 'Entertainment' } });

    // Fill in icon
    const iconInput = screen.getByLabelText(/icon/i);
    fireEvent.change(iconInput, { target: { value: '🎮' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Entertainment',
        icon: '🎮',
      })
    );
  });

  it('populates form when editing existing category', () => {
    const initialData = {
      id: 'cat-1',
      name: 'Shopping',
      icon: '🛍️',
      color: '#FF6B9D',
      userId: 'test-user',
      createdAt: new Date(),
      isDefault: false,
    };

    render(
      <CategoryForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByDisplayValue('Shopping')).toBeInTheDocument();
    expect(screen.getByDisplayValue('🛍️')).toBeInTheDocument();
  });
});
