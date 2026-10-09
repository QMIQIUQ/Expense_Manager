import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import { DEFAULT_FEATURES } from '../../types';
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
      ['expenses', 'dashboard', 'settings'], ['expenses', 'dashboard', 'settings'], []
    ));
  });

  it('uses the combined legacy tab and More order as one editable list', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<FeatureManager enabledFeatures={['dashboard', 'expenses', 'categories', 'settings']}
      tabFeatures={['expenses', 'dashboard']} hamburgerFeatures={['categories', 'expenses']}
      onUpdate={onUpdate} onReset={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /More menu/i })).not.toBeInTheDocument();
    expect(Array.from(container.querySelectorAll('[data-touch-reorder-item]'))
      .map((element) => element.getAttribute('data-touch-reorder-item')))
      .toEqual(['expenses', 'dashboard', 'categories', 'settings']);
  });

  it('applies numeric position changes to the unified saved order', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<FeatureManager enabledFeatures={['dashboard', 'expenses', 'categories', 'settings']}
      tabFeatures={['dashboard', 'expenses', 'categories', 'settings']} hamburgerFeatures={[]}
      onUpdate={onUpdate} onReset={vi.fn()} />);

    fireEvent.change(container.querySelector('input[type="number"]') as HTMLInputElement, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      ['expenses', 'categories', 'dashboard', 'settings'],
      ['expenses', 'categories', 'dashboard', 'settings'],
      [],
    ));
  });

  it('keeps a disabled legacy item disabled after save and reload', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const props = {
      enabledFeatures: ['dashboard', 'expenses', 'categories', 'settings'] as ('dashboard' | 'expenses' | 'categories' | 'settings')[],
      tabFeatures: ['dashboard', 'expenses', 'categories', 'settings'] as ('dashboard' | 'expenses' | 'categories' | 'settings')[],
      hamburgerFeatures: [] as never[],
      onUpdate,
      onReset: vi.fn(),
    };
    const view = render(<FeatureManager {...props} />);

    fireEvent.click(view.container.querySelector('[data-touch-reorder-item="categories"] button[aria-label="Disable feature"]') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      ['dashboard', 'expenses', 'settings'],
      ['dashboard', 'expenses', 'settings'],
      [],
    ));

    view.rerender(<FeatureManager
      {...props}
      enabledFeatures={['dashboard', 'expenses', 'categories', 'settings']}
      tabFeatures={['dashboard', 'expenses', 'settings']}
      hamburgerFeatures={[]}
    />);
    expect(Array.from(view.container.querySelectorAll('[data-touch-reorder-item]'))
      .map((element) => element.getAttribute('data-touch-reorder-item')))
      .toEqual(['dashboard', 'expenses', 'settings']);
  });

  it('resets and saves with the unified feature list format', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onReset = vi.fn().mockResolvedValue(undefined);
    render(<FeatureManager enabledFeatures={['dashboard', 'expenses']}
      tabFeatures={['dashboard', 'expenses']} hamburgerFeatures={[]}
      onUpdate={onUpdate} onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(onReset).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      DEFAULT_FEATURES, DEFAULT_FEATURES, [],
    ));
  });
});
