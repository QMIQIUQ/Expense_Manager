import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '../../test/test-utils';
import { DEFAULT_DASHBOARD_LAYOUT } from '../../types/dashboard';
import DashboardCustomizer from './DashboardCustomizer';

const originalElementFromPoint = document.elementFromPoint;
afterEach(() => {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint });
});

describe('DashboardCustomizer touch ordering', () => {
  it('saves the order chosen with a touch drag', () => {
    const widgets = DEFAULT_DASHBOARD_LAYOUT.slice(0, 2);
    const onSave = vi.fn();
    const { container } = render(<DashboardCustomizer widgets={widgets} onSave={onSave} onClose={vi.fn()} />);
    const handle = container.querySelector(`[data-touch-reorder-item="${widgets[0].id}"] .touch-drag-handle`) as HTMLElement;
    const target = container.querySelector(`[data-touch-reorder-item="${widgets[1].id}"]`) as HTMLElement;
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => target) });

    fireEvent.pointerDown(handle, { pointerId: 1, pointerType: 'touch', isPrimary: true });
    fireEvent.pointerUp(handle, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.click(container.querySelector('.customizer-btn-save') as HTMLElement);

    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ id: widgets[1].id, order: 0 }),
      expect.objectContaining({ id: widgets[0].id, order: 1 }),
    ]);
  });
});
