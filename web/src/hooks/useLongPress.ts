import { useCallback, useEffect, useRef } from 'react';

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
  onClick: (event: React.MouseEvent) => void;
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
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchResetTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchInteractionActive = useRef(false);
  const longPressTriggered = useRef(false);

  // Clear the timer on unmount to avoid stray callbacks after the component is gone
  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      if (touchResetTimeout.current) {
        clearTimeout(touchResetTimeout.current);
      }
    };
  }, []);

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (event.type === 'mousedown' && touchInteractionActive.current) {
        return;
      }

      longPressTriggered.current = false;
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      timeout.current = setTimeout(() => {
        longPressTriggered.current = true;
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = undefined;
      }
    },
    []
  );

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (touchResetTimeout.current) {
        clearTimeout(touchResetTimeout.current);
        touchResetTimeout.current = undefined;
      }

      if (longPressTriggered.current) {
        event.preventDefault();
        event.stopPropagation();
        longPressTriggered.current = false;
        touchInteractionActive.current = false;
        return;
      }

      onClick?.(event);
      touchInteractionActive.current = false;
    },
    [onClick]
  );

  const cancel = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }
    if (touchResetTimeout.current) {
      clearTimeout(touchResetTimeout.current);
      touchResetTimeout.current = undefined;
    }
    touchInteractionActive.current = false;
    longPressTriggered.current = false;
  }, []);

  return {
    onMouseDown: (e) => start(e),
    onMouseUp: () => clear(),
    onMouseLeave: () => cancel(),
    onTouchStart: (e) => {
      touchInteractionActive.current = true;
      if (touchResetTimeout.current) {
        clearTimeout(touchResetTimeout.current);
        touchResetTimeout.current = undefined;
      }
      start(e);
    },
    onTouchEnd: () => {
      clear();
      if (touchResetTimeout.current) {
        clearTimeout(touchResetTimeout.current);
      }
      touchResetTimeout.current = setTimeout(() => {
        touchInteractionActive.current = false;
        touchResetTimeout.current = undefined;
      }, 1000);
    },
    onTouchCancel: () => cancel(),
    onTouchMove: () => cancel(),
    onClick: handleClick,
  };
};
