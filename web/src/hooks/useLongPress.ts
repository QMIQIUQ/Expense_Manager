import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: (event: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void;
  delay?: number;
}

interface LongPressHandlers {
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onMouseLeave: (event: React.MouseEvent) => void;
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
}

/**
 * Custom hook for detecting long press gestures
 * @param options - Configuration options
 * @param options.onLongPress - Callback when long press is detected
 * @param options.onClick - Optional callback for normal clicks
 * @param options.delay - Long press delay in milliseconds (default: 500ms)
 * @returns Event handlers to attach to the element
 */
export const useLongPress = (options: UseLongPressOptions): LongPressHandlers => {
  const { onLongPress, onClick, delay = 500 } = options;
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      // Prevent default to avoid text selection on long press
      event.preventDefault();

      target.current = event.target;
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);

      if (shouldTriggerClick && !longPressTriggered && onClick) {
        onClick(event);
      }

      setLongPressTriggered(false);
      target.current = undefined;
    },
    [onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e) => start(e),
    onMouseUp: (e) => clear(e),
    onMouseLeave: (e) => clear(e, false),
    onTouchStart: (e) => start(e),
    onTouchEnd: (e) => clear(e),
  };
};
