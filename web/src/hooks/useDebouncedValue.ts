import { useEffect, useState } from 'react';

/** Only the query is delayed; the controlled input keeps its immediate value. */
export const useDebouncedValue = <T,>(value: T, delay = 300): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
};
