import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import ExpenseForm from './ExpenseForm';
const fake = vi.hoisted(() => ({ owner: 'one', save: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: fake.owner } }) }));
vi.mock('../../hooks/useExpenseTags', () => ({ useExpenseTags: (userId: string) => ({ rows: [{ id: `${userId}-tag`, userId, name: `${userId} tag`, archived: false, color: '#64748b' }] }) }));
vi.mock('../../services/expenseTagService', () => ({ expenseTagService: { save: fake.save } }));
describe('expense tag identity comes from authentication', () => {
  it('allows empty-category accounts to create tags and resets selected tags after an owner switch', async () => {
    fake.owner = 'one'; const result = render(<ExpenseForm categories={[]} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'one tag' }));
    expect(screen.getByRole('checkbox', { name: 'one tag' })).toBeChecked();
    fireEvent.change(screen.getByRole('textbox', { name: 'New tag' }), { target: { value: 'Work' } });
    fireEvent.click(screen.getByRole('button', { name: 'New tag' }));
    await waitFor(() => expect(fake.save).toHaveBeenCalledWith('one', 'Work', '#64748b'));
    fake.owner = 'two'; result.rerender(<ExpenseForm categories={[]} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('checkbox', { name: 'one tag' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'two tag' })).not.toBeChecked();
  });
});
