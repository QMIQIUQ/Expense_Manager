import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import { DEFAULT_FEATURES } from '../../types';
import FeatureManager from './FeatureManager';

const originalElementFromPoint = document.elementFromPoint;
afterEach(() => {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint });
});

describe('FeatureManager locations and ordering', () => {
  it('saves the order chosen with a touch drag without changing the other location', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<FeatureManager enabledFeatures={['dashboard', 'expenses']}
      tabFeatures={['dashboard', 'expenses']} hamburgerFeatures={['categories', 'budgets']}
      onUpdate={onUpdate} onReset={vi.fn()} />);
    const handle = container.querySelector('[data-touch-reorder-item="dashboard"] .touch-drag-handle') as HTMLElement;
    const target = container.querySelector('[data-touch-reorder-item="expenses"]') as HTMLElement;
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => target) });

    fireEvent.pointerDown(handle, { pointerId: 1, pointerType: 'touch', isPrimary: true });
    fireEvent.pointerUp(handle, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      ['expenses', 'dashboard'], ['expenses', 'dashboard'], ['categories', 'budgets'],
    ));
  });

  it('switches between the independent Tabs and Hamburger Menu lists', () => {
    const { container } = render(<FeatureManager enabledFeatures={['dashboard', 'expenses', 'categories']}
      tabFeatures={['expenses', 'dashboard']} hamburgerFeatures={['categories']}
      onUpdate={vi.fn()} onReset={vi.fn()} />);

    expect(Array.from(container.querySelectorAll('[data-touch-reorder-item]'))
      .map((element) => element.getAttribute('data-touch-reorder-item')))
      .toEqual(['expenses', 'dashboard']);

    fireEvent.click(screen.getByRole('button', { name: /hamburger menu/i }));

    expect(Array.from(container.querySelectorAll('[data-touch-reorder-item]'))
      .map((element) => element.getAttribute('data-touch-reorder-item')))
      .toEqual(['categories']);
  });

  it('applies numeric ordering to the selected location and preserves the other list', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<FeatureManager enabledFeatures={['dashboard', 'expenses']}
      tabFeatures={['dashboard', 'expenses']} hamburgerFeatures={['categories', 'budgets']}
      onUpdate={onUpdate} onReset={vi.fn()} />);

    fireEvent.change(container.querySelector('input[type="number"]') as HTMLInputElement, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      ['expenses', 'dashboard'], ['expenses', 'dashboard'], ['categories', 'budgets'],
    ));
  });

  it('allows Settings to be disabled as in main while keeping remaining features', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<FeatureManager enabledFeatures={['dashboard', 'settings']}
      tabFeatures={['dashboard', 'settings']} hamburgerFeatures={['expenses']}
      onUpdate={onUpdate} onReset={vi.fn()} />);

    fireEvent.click(container.querySelector('[data-touch-reorder-item="settings"] button[aria-label="Disable feature"]') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      ['dashboard'], ['dashboard'], ['expenses'],
    ));
  });

  it('resets both locations to main defaults and saves both lists', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onReset = vi.fn().mockResolvedValue(undefined);
    render(<FeatureManager enabledFeatures={['dashboard', 'expenses']}
      tabFeatures={['dashboard', 'expenses']} hamburgerFeatures={[]}
      onUpdate={onUpdate} onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(onReset).toHaveBeenCalledOnce());
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      DEFAULT_FEATURES, DEFAULT_FEATURES, DEFAULT_FEATURES,
    ));
  });
});
