import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import { Category } from '../../types';
import CategoryManager from './CategoryManager';

vi.mock('../../contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({ dateFormat: 'DD/MM/YYYY' }),
}));

const categories: Category[] = [
  { id: 'z', userId: 'user-1', name: 'Zebra', icon: '📁', color: '#888888', isDefault: false, createdAt: new Date() },
  { id: 'a', userId: 'user-1', name: 'Apple', icon: '📁', color: '#888888', isDefault: false, createdAt: new Date() },
];

describe('CategoryManager ordering', () => {
  it('offers accessible move controls and saves the selected order', async () => {
    const onReorder = vi.fn().mockResolvedValue(undefined);
    render(<CategoryManager categories={categories} expenses={[]} onAdd={vi.fn()} onUpdate={vi.fn()}
      onDelete={vi.fn()} onReorder={onReorder} />);

    fireEvent.click(screen.getByRole('button', { name: /Reorder/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Move category up: Zebra' }));

    await waitFor(() => expect(onReorder).toHaveBeenCalledWith(['z', 'a']));
  });

  it('shows a save error so the user can retry', async () => {
    const onReorder = vi.fn().mockRejectedValue(new Error('save failed'));
    render(<CategoryManager categories={categories} expenses={[]} onAdd={vi.fn()} onUpdate={vi.fn()}
      onDelete={vi.fn()} onReorder={onReorder} />);

    fireEvent.click(screen.getByRole('button', { name: /Reorder/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Move category up: Zebra' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save category order');
    expect(screen.getByRole('button', { name: 'Move category up: Zebra' })).toBeEnabled();
  });
});
