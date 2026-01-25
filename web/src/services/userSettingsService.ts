import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { UserSettings, TimeFormat, DateFormat } from '../types';
import { COLLECTIONS } from '../constants/collections';

export const userSettingsService = {
  async get(userId: string): Promise<UserSettings | null> {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      billingCycleDay: data.billingCycleDay || 1,
      timeFormat: (data.timeFormat as TimeFormat) || '24h',
      dateFormat: (data.dateFormat as DateFormat) || 'YYYY-MM-DD',
      useStepByStepForm: data.useStepByStepForm || false,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  },

  async create(settings: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, settings.userId);
    await setDoc(docRef, {
      ...settings,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  async update(userId: string, updates: Partial<UserSettings>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  async getOrCreate(userId: string): Promise<UserSettings> {
    const existing = await this.get(userId);
    
    if (existing) {
      return existing;
    }
    
    // Create default settings
    const defaultSettings: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      billingCycleDay: 1, // Default to 1st of month
      timeFormat: '24h', // Default to 24-hour format
      dateFormat: 'YYYY-MM-DD', // Default date format
      useStepByStepForm: false, // Default to traditional form
    };
    
    await this.create(defaultSettings);
    
    // Return the created settings
    return {
      id: userId,
      ...defaultSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
};
