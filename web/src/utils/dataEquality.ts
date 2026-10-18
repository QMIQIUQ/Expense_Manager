/** Compare cached JSON and live SDK values without serializing whole collections. */
export const dataEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (left instanceof Date || right instanceof Date) {
    const milliseconds = (value: unknown) => value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN;
    return milliseconds(left) === milliseconds(right);
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => dataEqual(value, right[index]));
  }
  const first = left as Record<string, unknown>;
  const second = right as Record<string, unknown>;
  const keys = Object.keys(first).filter((key) => first[key] !== undefined);
  return keys.length === Object.keys(second).filter((key) => second[key] !== undefined).length &&
    keys.every((key) => dataEqual(first[key], second[key]));
};
