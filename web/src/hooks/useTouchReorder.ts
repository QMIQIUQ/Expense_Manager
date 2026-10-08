import { useRef, useState } from 'react';
import type React from 'react';

interface TouchReorderOptions {
  listRef: React.RefObject<HTMLElement>;
  onReorder: (fromId: string, toId: string) => void;
  disabled?: boolean;
}

/** Touch-only reorder path for lists that use native HTML drag and drop on desktop. */
export const useTouchReorder = ({ listRef, onReorder, disabled = false }: TouchReorderOptions) => {
  const pointerId = useRef<number | null>(null);
  const sourceId = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const findTarget = (clientX: number, clientY: number): string | null => {
    const row = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-touch-reorder-item]');
    if (!row || !listRef.current?.contains(row)) return null;
    return row.dataset.touchReorderItem || null;
  };

  const clear = () => {
    pointerId.current = null;
    sourceId.current = null;
    setActiveId(null);
    setOverId(null);
  };

  const onPointerDown = (id: string) => (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch' || event.isPrimary === false || disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerId.current = event.pointerId;
    sourceId.current = id;
    setActiveId(id);
    setOverId(null);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (pointerId.current !== event.pointerId) return;
    event.preventDefault();
    const target = findTarget(event.clientX, event.clientY);
    setOverId(target === sourceId.current ? null : target);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (pointerId.current !== event.pointerId) return;
    const fromId = sourceId.current;
    const toId = findTarget(event.clientX, event.clientY);
    clear();
    if (fromId && toId && fromId !== toId && !disabled) onReorder(fromId, toId);
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLElement>) => {
    if (pointerId.current === event.pointerId) clear();
  };

  return {
    activeId,
    overId,
    isActive: () => pointerId.current !== null,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
};
