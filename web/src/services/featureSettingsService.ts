import { hasFinancialReceipt, runFinancialTransaction, type FinancialOperation } from './financialMutation';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FeatureSettings, DEFAULT_FEATURES, FeatureTab } from '../types';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
import { offlineQueue } from '../utils/offlineQueue';

const COLLECTION_NAME = 'featureSettings';

export const featureSettingsService = {
  // Get or create default feature settings for a user
  async getOrCreate(userId: string): Promise<FeatureSettings> {
    const revision = offlineQueue.revision;
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const fetched = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as FeatureSettings;
      const settings = applyPendingOperations('featureSettings', userId, revision === offlineQueue.revision
        ? fetched : sessionCache.get<FeatureSettings>('featureSettings', userId) ?? fetched);
      sessionCache.set('featureSettings', userId, settings);
      return settings;
    }
    
    // Create default settings if none exist
    const now = Timestamp.now();
    const docRef = doc(db, COLLECTION_NAME, userId);
    const defaultSettings: Omit<FeatureSettings, 'id'> = {
      userId,
      enabledFeatures: [...DEFAULT_FEATURES],
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
    
    await runFinancialTransaction(db, undefined, async (transaction) => {
      const current = await transaction.get(docRef);
      if (!current.exists()) transaction.set(docRef, { userId, enabledFeatures: [...DEFAULT_FEATURES], createdAt: now, updatedAt: now });
    });
    
    const actual = await getDoc(docRef);
    const fields = actual.data();
    const settings = applyPendingOperations('featureSettings', userId, fields ? {
      ...fields, id: actual.id, createdAt: fields.createdAt?.toDate(), updatedAt: fields.updatedAt?.toDate(),
    } as FeatureSettings : { id: docRef.id, ...defaultSettings });
    sessionCache.set('featureSettings', userId, settings);
    return settings;
  },

  // Update feature settings
  async update(
    userId: string,
    enabledFeatures: FeatureTab[],
    tabFeatures?: FeatureTab[],
    hamburgerFeatures?: FeatureTab[],
    operation?: FinancialOperation,
  ): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const existing = await getDocs(query(collection(db, COLLECTION_NAME), where('userId', '==', userId)));
    const reference = existing.empty ? doc(db, COLLECTION_NAME, userId) : existing.docs[0].ref;
    await runFinancialTransaction(db, operation, async (transaction) => {
      const current = await transaction.get(reference);
      if (current.exists() && current.data().userId !== userId) throw new Error('Feature settings are owned by another user');
      const fields: Record<string, unknown> = { userId, enabledFeatures, updatedAt: Timestamp.now() };
      if (tabFeatures !== undefined) fields.tabFeatures = tabFeatures;
      if (hamburgerFeatures !== undefined) fields.hamburgerFeatures = hamburgerFeatures;
      if (!current.exists()) fields.createdAt = Timestamp.now();
      transaction.set(reference, fields, { merge: true });
    });
  },

  async resetToDefaults(userId: string, operation?: FinancialOperation): Promise<void> {
    if (operation) await this.update(userId, [...DEFAULT_FEATURES], [...DEFAULT_FEATURES], [...DEFAULT_FEATURES], operation);
    else await this.update(userId, [...DEFAULT_FEATURES], [...DEFAULT_FEATURES], [...DEFAULT_FEATURES]);
  },
};
