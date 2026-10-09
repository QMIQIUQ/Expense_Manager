import {
  DEFAULT_FEATURES,
  FeatureSettings,
  FeatureTab,
} from '../../types';

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

/** Merge current and legacy feature lists into the single saved navigation order. */
export const mergeNavigationFeatureLists = (
  tabFeatures?: FeatureTab[],
  hamburgerFeatures?: FeatureTab[],
  enabledFeatures: FeatureTab[] = DEFAULT_FEATURES,
): FeatureTab[] => {
  const hasTabFeatures = Array.isArray(tabFeatures);
  const hasHamburgerFeatures = Array.isArray(hamburgerFeatures);
  let features: FeatureTab[];

  if (hasTabFeatures && hasHamburgerFeatures) {
    // These settings explicitly represent visible items, so do not resurrect
    // entries left behind in the legacy enabledFeatures union.
    features = normalizeFeatures([
      ...(tabFeatures || []),
      ...(hamburgerFeatures || []),
    ]);
  } else if (hasTabFeatures) {
    features = normalizeFeatures([...(tabFeatures || []), ...enabledFeatures]);
  } else if (hasHamburgerFeatures) {
    features = normalizeFeatures([...(hamburgerFeatures || []), ...enabledFeatures]);
  } else {
    features = normalizeFeatures(enabledFeatures);
  }

  // Settings has historically been reachable from the navigation utility menu.
  if (!features.includes('settings')) features.push('settings');
  return features;
};

/** Resolve settings for the header without applying a separate display priority. */
export const getOrderedNavigationFeatures = (settings: FeatureSettings | null): FeatureTab[] =>
  mergeNavigationFeatureLists(
    settings?.tabFeatures,
    settings?.hamburgerFeatures,
    settings?.enabledFeatures || DEFAULT_FEATURES,
  );

export interface NavigationFeatures {
  orderedFeatures: FeatureTab[];
}

export const getNavigationFeatures = (settings: FeatureSettings | null): NavigationFeatures => ({
  orderedFeatures: getOrderedNavigationFeatures(settings),
});

export const getEnabledFeatures = (settings: FeatureSettings | null): FeatureTab[] =>
  getOrderedNavigationFeatures(settings);
