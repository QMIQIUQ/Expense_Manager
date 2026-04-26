import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import StepByStepExpenseForm from './StepByStepExpenseForm';
import type { Expense } from '../../types';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'test-user' } }),
}));

describe('StepByStepExpenseForm draft controls', () => {
  it('does not show receipt draft controls when editing an existing expense', () => {
    const initialData = {
      id: 'expense-1',
      description: 'Coffee',
      amount: 5.5,
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
      <StepByStepExpenseForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={initialData as Expense}
      />
    );

    expect(screen.queryByRole('button', { name: /scan receipt|拍照|上傳|上传/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/ocr/i)).not.toBeInTheDocument();
  });
});
