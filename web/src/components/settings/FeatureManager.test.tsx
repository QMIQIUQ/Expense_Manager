import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import FeatureManager from './FeatureManager';

const originalElementFromPoint = document.elementFromPoint;
afterEach(() => {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint });
});

describe('FeatureManager touch ordering', () => {
  it('saves the order chosen with a touch drag', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<FeatureManager enabledFeatures={['dashboard', 'expenses']}
      tabFeatures={['dashboard', 'expenses']} hamburgerFeatures={['dashboard', 'expenses']}
      onUpdate={onUpdate} onReset={vi.fn()} />);
    const handle = container.querySelector('[data-touch-reorder-item="dashboard"] .touch-drag-handle') as HTMLElement;
    const target = container.querySelector('[data-touch-reorder-item="expenses"]') as HTMLElement;
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => target) });

    fireEvent.pointerDown(handle, { pointerId: 1, pointerType: 'touch', isPrimary: true });
    fireEvent.pointerUp(handle, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      ['expenses', 'dashboard'], ['expenses', 'dashboard'], ['dashboard', 'expenses']
    ));
  });
});
