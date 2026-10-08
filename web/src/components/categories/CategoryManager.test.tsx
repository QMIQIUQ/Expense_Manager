import { afterEach, describe, expect, it, vi } from 'vitest';
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

const originalElementFromPoint = document.elementFromPoint;
afterEach(() => {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint });
});

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

  it('reorders categories by touch drag and saves the new order', async () => {
    const onReorder = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<CategoryManager categories={categories} expenses={[]} onAdd={vi.fn()} onUpdate={vi.fn()}
      onDelete={vi.fn()} onReorder={onReorder} />);

    fireEvent.click(screen.getByRole('button', { name: /Reorder/i }));
    const handle = container.querySelector('[data-touch-reorder-item="z"] .touch-drag-handle') as HTMLElement;
    const target = container.querySelector('[data-touch-reorder-item="a"]') as HTMLElement;
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => target) });

    fireEvent.pointerDown(handle, { pointerId: 1, pointerType: 'touch', isPrimary: true });
    fireEvent.pointerMove(handle, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerUp(handle, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 });

    await waitFor(() => expect(onReorder).toHaveBeenCalledWith(['z', 'a']));
  });

  it('does not save a cancelled touch drag', () => {
    const onReorder = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<CategoryManager categories={categories} expenses={[]} onAdd={vi.fn()} onUpdate={vi.fn()}
      onDelete={vi.fn()} onReorder={onReorder} />);

    fireEvent.click(screen.getByRole('button', { name: /Reorder/i }));
    const handle = container.querySelector('[data-touch-reorder-item="z"] .touch-drag-handle') as HTMLElement;
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    fireEvent.pointerDown(handle, { pointerId: 1, pointerType: 'touch', isPrimary: true });
    fireEvent.pointerCancel(handle, { pointerId: 1, pointerType: 'touch' });
    expect(onReorder).not.toHaveBeenCalled();
  });
});
