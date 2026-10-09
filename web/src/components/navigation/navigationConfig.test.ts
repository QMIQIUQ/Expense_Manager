import { describe, expect, it } from 'vitest';
import { FeatureSettings } from '../../types';
import { getNavigationFeatures } from './navigationConfig';

describe('getNavigationFeatures', () => {
  it('uses only the configured Tabs order and keeps Hamburger Menu items separate', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['dashboard', 'expenses', 'incomes', 'budgets', 'categories', 'recurring', 'settings'],
      tabFeatures: ['budgets', 'expenses', 'dashboard'],
      hamburgerFeatures: ['incomes', 'categories', 'recurring'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings).orderedFeatures).toEqual(['budgets', 'expenses', 'dashboard']);
  });

  it('preserves an explicitly empty Tabs list instead of reviving legacy or Hamburger items', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['dashboard', 'expenses', 'settings'],
      tabFeatures: [],
      hamburgerFeatures: ['expenses'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings).orderedFeatures).toEqual([]);
  });

  it('uses legacy enabledFeatures when location-specific settings are absent', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['recurring', 'expenses', 'dashboard'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings).orderedFeatures).toEqual(['recurring', 'expenses', 'dashboard']);
  });

  it('normalizes legacy payment names and removes duplicates without changing order', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: [],
      tabFeatures: ['cards' as never, 'expenses', 'ewallets' as never, 'recurring', 'expenses'],
      hamburgerFeatures: [],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings).orderedFeatures).toEqual([
      'paymentMethods', 'expenses', 'recurring',
    ]);
  });

  it('filters utility-only profile and admin destinations', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: [],
      tabFeatures: ['dashboard', 'profile' as never, 'admin' as never],
      hamburgerFeatures: [],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings).orderedFeatures).toEqual(['dashboard']);
  });
});
