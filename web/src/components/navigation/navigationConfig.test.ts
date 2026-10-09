import { describe, expect, it } from 'vitest';
import { FeatureSettings } from '../../types';
import { getNavigationFeatures, mergeNavigationFeatureLists } from './navigationConfig';

describe('getNavigationFeatures', () => {
  it('uses the configured tab order and appends legacy More items in their saved order', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['dashboard', 'expenses', 'incomes', 'budgets', 'categories', 'recurring', 'settings'],
      tabFeatures: ['budgets', 'expenses', 'dashboard'],
      hamburgerFeatures: ['incomes', 'categories', 'recurring'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings).orderedFeatures).toEqual([
      'budgets', 'expenses', 'dashboard', 'incomes', 'categories', 'recurring', 'settings',
    ]);
  });

  it('keeps every explicitly enabled item once and does not resurrect stale legacy items', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['dashboard', 'expenses', 'incomes', 'categories', 'settings'],
      tabFeatures: ['expenses', 'dashboard', 'expenses'],
      hamburgerFeatures: ['categories', 'categories'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings).orderedFeatures).toEqual([
      'expenses', 'dashboard', 'categories', 'settings',
    ]);
  });

  it('uses legacy enabledFeatures when location-specific settings are absent', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['recurring', 'expenses', 'dashboard'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings).orderedFeatures).toEqual([
      'recurring', 'expenses', 'dashboard', 'settings',
    ]);
  });

  it('supplements a partially migrated list with missing enabled features', () => {
    expect(mergeNavigationFeatureLists(
      ['expenses', 'dashboard'],
      undefined,
      ['dashboard', 'expenses', 'incomes', 'settings'],
    )).toEqual(['expenses', 'dashboard', 'incomes', 'settings']);
  });

  it('maps old card and wallet items once at their first saved position', () => {
    expect(mergeNavigationFeatureLists(
      ['cards' as never, 'expenses', 'ewallets' as never, 'recurring'],
      [],
      [],
    )).toEqual(['paymentMethods', 'expenses', 'recurring', 'settings']);
  });

  it('always retains the Settings destination while filtering utility-only entries', () => {
    expect(mergeNavigationFeatureLists(
      ['dashboard', 'profile' as never, 'admin' as never],
      [],
      [],
    )).toEqual(['dashboard', 'settings']);
  });
});
