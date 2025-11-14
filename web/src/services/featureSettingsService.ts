import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FeatureSettings, DEFAULT_FEATURES, FeatureTab } from '../types';

const COLLECTION_NAME = 'featureSettings';

export const featureSettingsService = {
  // Get or create default feature settings for a user
  async getOrCreate(userId: string): Promise<FeatureSettings> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as FeatureSettings;
    }
    
    // Create default settings if none exist
    const now = Timestamp.now();
    const docRef = doc(collection(db, COLLECTION_NAME));
    const defaultSettings: Omit<FeatureSettings, 'id'> = {
      userId,
      enabledFeatures: [...DEFAULT_FEATURES],
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
    
    await setDoc(docRef, {
      userId,
      enabledFeatures: [...DEFAULT_FEATURES],
      createdAt: now,
      updatedAt: now,
    });
    
    return {
      id: docRef.id,
      ...defaultSettings,
    };
  },

  // Update feature settings
  async update(
    userId: string,
    enabledFeatures: FeatureTab[],
    tabFeatures?: FeatureTab[],
    hamburgerFeatures?: FeatureTab[]
  ): Promise<void> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, COLLECTION_NAME, querySnapshot.docs[0].id);
      await setDoc(docRef, {
        userId,
        enabledFeatures,
        tabFeatures,
        hamburgerFeatures,
        updatedAt: Timestamp.now(),
        createdAt: querySnapshot.docs[0].data().createdAt, // Preserve original creation time
      });
    } else {
      // Create new if doesn't exist
      const docRef = doc(collection(db, COLLECTION_NAME));
      await setDoc(docRef, {
        userId,
        enabledFeatures,
        tabFeatures,
        hamburgerFeatures,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  },

  // Reset to defaults
  async resetToDefaults(userId: string): Promise<void> {
    await this.update(userId, [...DEFAULT_FEATURES], [...DEFAULT_FEATURES], [...DEFAULT_FEATURES]);
  },
};
