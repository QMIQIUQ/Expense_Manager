import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import { ExpenseTagManager } from './ExpenseTagManager';
const fake = vi.hoisted(() => ({ save: vi.fn(), archive: vi.fn(), rows: [{ id: 'tag', userId: 'one', name: 'Travel', normalizedName: 'travel', color: '#64748b', archived: false }] }));
vi.mock('../../hooks/useExpenseTags', () => ({ useExpenseTags: () => ({ rows: fake.rows }) }));
vi.mock('../../services/expenseTagService', () => ({ expenseTagService: { save: fake.save, archive: fake.archive } }));
beforeEach(() => { vi.clearAllMocks(); fake.save.mockResolvedValue(undefined); fake.archive.mockResolvedValue(undefined); });
describe('tag management actions', () => {
  it('creates tags directly from management and retains stable IDs on rename/archive', async () => {
    render(<ExpenseTagManager userId="one" />);
    fireEvent.change(screen.getByLabelText('New tag'), { target: { value: 'Work' } }); fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(fake.save).toHaveBeenCalledWith('one', 'Work', '#64748b'));
    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'Trip' } }); fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(fake.save).toHaveBeenCalledWith('one', 'Trip', '#64748b', fake.rows[0]));
    fireEvent.click(screen.getByText('Archive')); await waitFor(() => expect(fake.archive).toHaveBeenCalledWith('one', fake.rows[0], true));
  });
});
