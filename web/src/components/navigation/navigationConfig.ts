import { DEFAULT_FEATURES, FeatureSettings, FeatureTab } from '../../types';

const normalizeFeatures = (features: FeatureTab[]): FeatureTab[] =>
  features
    .map((feature) => {
      const legacyFeature = feature as string;
      return legacyFeature === 'cards' || legacyFeature === 'ewallets'
        ? 'paymentMethods'
        : feature;
    })
    .filter((feature): feature is FeatureTab =>
      ['dashboard', 'expenses', 'incomes', 'categories', 'budgets', 'recurring', 'paymentMethods', 'settings'].includes(feature),
    )
    .filter((feature, index, items) => items.indexOf(feature) === index);

/** Resolve the main scrollable row from the same tab list as the main branch. */
export const getOrderedNavigationFeatures = (settings: FeatureSettings | null): FeatureTab[] =>
  normalizeFeatures(settings?.tabFeatures ?? settings?.enabledFeatures ?? DEFAULT_FEATURES);

export interface NavigationFeatures {
  orderedFeatures: FeatureTab[];
}

export const getNavigationFeatures = (settings: FeatureSettings | null): NavigationFeatures => ({
  orderedFeatures: getOrderedNavigationFeatures(settings),
});

export const getEnabledFeatures = (settings: FeatureSettings | null): FeatureTab[] =>
  getOrderedNavigationFeatures(settings);
