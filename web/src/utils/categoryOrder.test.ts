import { describe, expect, it } from 'vitest';
import { Category, Expense } from '../types';
import { getRecentlyUsedCategories, sortCategories, sortCategoryEntries } from './categoryOrder';

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

  it('orders category breakdown entries by the saved order', () => {
    const configured = [category('a', 'Apple', 2), category('z', 'Zebra', 0), category('b', 'Banana', 1)];
    expect(sortCategoryEntries([['Apple', 30], ['Unknown', 40], ['Zebra', 10], ['Banana', 20]], configured))
      .toEqual([['Zebra', 10], ['Banana', 20], ['Apple', 30], ['Unknown', 40]]);
  });

  it('keeps the five latest used categories separate from the remaining saved order', () => {
    const configured = [
      category('a', 'Apple', 5), category('b', 'Banana', 4), category('c', 'Cherry', 3),
      category('d', 'Date', 2), category('e', 'Elderberry', 1), category('f', 'Fig', 0),
      category('g', 'Grape', 6),
    ];
    const expenses = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig'].map((name, index) => ({
      category: name,
      createdAt: index === 5 ? '2026-01-06T00:00:00.000Z' : new Date(2026, 0, index + 1),
      date: `2026-01-0${index + 1}`,
    } as Expense));
    const recent = getRecentlyUsedCategories(configured, expenses);

    expect(recent.map((item) => item.name)).toEqual(['Fig', 'Elderberry', 'Date', 'Cherry', 'Banana']);
    expect(sortCategories(configured).filter((item) => !recent.includes(item)).map((item) => item.name))
      .toEqual(['Apple', 'Grape']);
  });
});
