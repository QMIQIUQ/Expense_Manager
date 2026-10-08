import { describe, expect, it } from 'vitest';
import { Category } from '../types';
import { sortCategories } from './categoryOrder';

const category = (id: string, name: string, order?: number): Category => ({
  id,
  name,
  order,
  userId: 'user-1',
  icon: '📁',
  color: '#888888',
  isDefault: false,
  createdAt: new Date(),
});

describe('sortCategories', () => {
  it('keeps legacy categories alphabetical until they are manually reordered', () => {
    expect(sortCategories([category('z', 'Zebra'), category('a', 'Apple')]).map((item) => item.id))
      .toEqual(['a', 'z']);
  });

  it('uses saved order and appends unordered categories', () => {
    expect(sortCategories([
      category('a', 'Apple', 1),
      category('z', 'Zebra', 0),
      category('b', 'Banana'),
    ]).map((item) => item.id)).toEqual(['z', 'a', 'b']);
  });
});
