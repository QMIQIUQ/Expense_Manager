import {
  DEFAULT_FEATURES,
  FeatureSettings,
  FeatureTab,
} from '../../types';

export const DESKTOP_PRIMARY_PRIORITY: FeatureTab[] = [
  'dashboard',
  'expenses',
  'incomes',
  'budgets',
];

export const MOBILE_PRIMARY_PRIORITY: FeatureTab[] = [
  'dashboard',
  'expenses',
  'incomes',
];

const normalizeFeatures = (features: FeatureTab[]): FeatureTab[] =>
  features
    .map((feature) => {
      const legacyFeature = feature as string;
      return legacyFeature === 'cards' || legacyFeature === 'ewallets'
        ? 'paymentMethods'
        : feature;
    })
    .filter((feature, index, items) => items.indexOf(feature) === index)
    .filter((feature) => feature !== 'profile' && feature !== 'admin');

export interface NavigationFeatures {
  primary: FeatureTab[];
  overflow: FeatureTab[];
}

export const getNavigationFeatures = (
  settings: FeatureSettings | null,
  isMobile: boolean,
): NavigationFeatures => {
  const tabFeatures = normalizeFeatures(
    settings?.tabFeatures || settings?.enabledFeatures || DEFAULT_FEATURES,
  );
  const hamburgerFeatures = normalizeFeatures(settings?.hamburgerFeatures || []);
  // Settings was always reachable from the previous utility menu. Keep it
  // available even for older preference records that omit it from both lists.
  const allFeatures = normalizeFeatures([...tabFeatures, ...hamburgerFeatures, 'settings']);
  const priority = isMobile ? MOBILE_PRIMARY_PRIORITY : DESKTOP_PRIMARY_PRIORITY;
  const primary = priority
    .filter((feature) => tabFeatures.includes(feature))
    .concat(tabFeatures.filter((feature) => !priority.includes(feature)))
    .slice(0, priority.length);

  return {
    primary,
    overflow: allFeatures.filter((feature) => !primary.includes(feature)),
  };
};

export const getEnabledFeatures = (settings: FeatureSettings | null): FeatureTab[] => {
  const tabFeatures = settings?.tabFeatures || settings?.enabledFeatures || DEFAULT_FEATURES;
  return normalizeFeatures([...tabFeatures, ...(settings?.hamburgerFeatures || []), 'settings']);
};
