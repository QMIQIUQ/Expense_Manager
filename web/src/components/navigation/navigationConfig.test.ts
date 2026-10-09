import { describe, expect, it } from 'vitest';
import { FeatureSettings } from '../../types';
import { getNavigationFeatures } from './navigationConfig';

describe('getNavigationFeatures', () => {
  it('keeps the four frequent destinations in the desktop row', () => {
    const navigation = getNavigationFeatures(null, false);

    expect(navigation.primary).toEqual(['dashboard', 'expenses', 'incomes', 'budgets']);
    expect(navigation.overflow).toEqual(['categories', 'recurring', 'paymentMethods', 'settings']);
  });

  it('keeps the three frequent destinations and More fixed on mobile', () => {
    const navigation = getNavigationFeatures(null, true);

    expect(navigation.primary).toEqual(['dashboard', 'expenses', 'incomes']);
    expect(navigation.overflow).toEqual(['categories', 'budgets', 'recurring', 'paymentMethods', 'settings']);
  });

  it('prioritizes frequent tab destinations before other configured tab destinations', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['expenses', 'dashboard', 'incomes', 'categories', 'recurring'],
      tabFeatures: ['categories', 'expenses', 'dashboard', 'incomes', 'recurring', 'expenses'],
      hamburgerFeatures: ['budgets', 'paymentMethods', 'budgets', 'profile', 'admin'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    const navigation = getNavigationFeatures(settings, false);

    expect(navigation.primary).toEqual(['dashboard', 'expenses', 'incomes', 'categories']);
    expect(navigation.overflow).toEqual(['recurring', 'budgets', 'paymentMethods', 'settings']);
  });

  it('keeps features assigned only to More out of the primary navigation', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['dashboard', 'expenses', 'budgets', 'recurring'],
      tabFeatures: ['dashboard', 'expenses'],
      hamburgerFeatures: ['recurring'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    const navigation = getNavigationFeatures(settings, false);

    expect(navigation.primary).toEqual(['dashboard', 'expenses']);
    expect(navigation.overflow).toEqual(['recurring', 'settings']);
    expect([...navigation.primary, ...navigation.overflow]).not.toContain('budgets');
  });

  it('migrates legacy payment tabs and keeps hamburger-only pages reachable in More', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['dashboard'],
      tabFeatures: ['dashboard'],
      hamburgerFeatures: ['cards' as never, 'ewallets' as never, 'recurring'],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    const navigation = getNavigationFeatures(settings, true);

    expect(navigation.primary).toEqual(['dashboard']);
    expect(navigation.overflow).toEqual(['paymentMethods', 'recurring', 'settings']);
  });

  it('keeps Settings reachable for older preferences that omit the utility destination', () => {
    const settings: FeatureSettings = {
      userId: 'test-user',
      enabledFeatures: ['dashboard', 'expenses'],
      tabFeatures: ['dashboard', 'expenses'],
      hamburgerFeatures: [],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    expect(getNavigationFeatures(settings, false).overflow).toEqual(['settings']);
  });
});
