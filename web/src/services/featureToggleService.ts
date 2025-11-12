import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'feature_toggles';

export interface FeatureToggles {
  grabEarningsEnabled: boolean;
  // Add more features here as needed
}

const DEFAULT_FEATURES: FeatureToggles = {
  grabEarningsEnabled: false,
};

export const featureToggleService = {
  // Get feature toggles for a user
  async getFeatures(userId: string): Promise<FeatureToggles> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { ...DEFAULT_FEATURES, ...docSnap.data() };
      }

      // Return defaults if document doesn't exist
      return DEFAULT_FEATURES;
    } catch (error) {
      console.error('Error fetching feature toggles:', error);
      return DEFAULT_FEATURES;
    }
  },

  // Update feature toggles for a user
  async updateFeatures(userId: string, features: Partial<FeatureToggles>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await setDoc(docRef, features, { merge: true });
  },

  // Enable/disable a specific feature
  async setFeature(userId: string, featureName: keyof FeatureToggles, enabled: boolean): Promise<void> {
    await this.updateFeatures(userId, { [featureName]: enabled });
  },
};
