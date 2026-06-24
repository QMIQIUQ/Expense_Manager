import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '../test/test-utils';
import { useLongPress } from './useLongPress';

function TestButton({
  onClick,
  onLongPress,
  delay = 500,
}: {
  onClick: () => void;
  onLongPress: () => void;
  delay?: number;
}) {
  const handlers = useLongPress({
    onClick,
    onLongPress,
    delay,
  });

  return (
    <button type="button" {...handlers}>
      trigger
    </button>
  );
}

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the click event for a normal tap', () => {
    const onClick = vi.fn();
    const onLongPress = vi.fn();

    render(<TestButton onClick={onClick} onLongPress={onLongPress} />);

    const button = screen.getByRole('button', { name: /trigger/i });

    fireEvent.touchStart(button);
    fireEvent.touchEnd(button);
    fireEvent.mouseDown(button);
    fireEvent.mouseUp(button);
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('suppresses click after a long press', () => {
    const onClick = vi.fn();
    const onLongPress = vi.fn();

    render(<TestButton onClick={onClick} onLongPress={onLongPress} />);

    const button = screen.getByRole('button', { name: /trigger/i });

    fireEvent.touchStart(button);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);

    fireEvent.touchEnd(button);
    fireEvent.mouseDown(button);
    fireEvent.mouseUp(button);
    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });
});
