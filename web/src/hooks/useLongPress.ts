import { useCallback, useEffect, useRef, useState } from 'react';

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
  onTouchCancel: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
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
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const target = useRef<EventTarget>();

  // Clear the timer on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

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
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = undefined;
      }

      if (shouldTriggerClick && !longPressTriggered && onClick) {
        onClick(event);
      }

      setLongPressTriggered(false);
      target.current = undefined;
    },
    [onClick, longPressTriggered]
  );

  const cancel = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }
    setLongPressTriggered(false);
    target.current = undefined;
  }, []);

  return {
    onMouseDown: (e) => start(e),
    onMouseUp: (e) => clear(e),
    onMouseLeave: (e) => clear(e, false),
    onTouchStart: (e) => start(e),
    onTouchEnd: (e) => clear(e),
    onTouchCancel: () => cancel(),
    onTouchMove: () => cancel(),
  };
};
