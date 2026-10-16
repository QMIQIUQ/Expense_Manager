import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, friendSpendingEnabled, functionsClient } from '../config/firebase';
import type {
  FriendConnection,
  FriendDashboardPreference,
  FriendSpendingSummary,
  FriendSpendingSummaryRequest,
} from '../types/friendSpending';

const PREFERENCE_COLLECTION = 'friendDashboardPreferences';
const createDefaultPreference = (): FriendDashboardPreference => {
  const today = new Date();
  return {
    mode: 'total',
    period: 'current-month',
    selectedDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
  };
};

const ensureFeatureEnabled = (): void => {
  if (!friendSpendingEnabled) {
    throw new Error('friend_spending_preview_disabled');
  }
};

export type FriendMutation =
  | { action: 'send'; friendUid: string }
  | { action: 'accept' | 'decline' | 'remove'; friendUid: string }
  | { action: 'set-sharing'; friendUid: string; enabled: boolean };

export const friendSpendingService = {
  async getConnections(): Promise<FriendConnection[]> {
    ensureFeatureEnabled();
    const callable = httpsCallable<Record<string, never>, { connections: FriendConnection[] }>(
      functionsClient,
      'getFriendConnections'
    );
    const result = await callable({});
    return result.data.connections;
  },

  async mutateFriendship(input: FriendMutation): Promise<void> {
    ensureFeatureEnabled();
    const callable = httpsCallable<FriendMutation, { ok: boolean }>(functionsClient, 'manageFriendship');
    await callable(input);
  },

  async getSpendingSummary(input: FriendSpendingSummaryRequest): Promise<FriendSpendingSummary> {
    ensureFeatureEnabled();
    const callable = httpsCallable<FriendSpendingSummaryRequest, FriendSpendingSummary>(
      functionsClient,
      'getFriendSpendingSummary'
    );
    const result = await callable(input);
    return result.data;
  },

  async getPreference(userId: string, friendUid: string): Promise<FriendDashboardPreference> {
    const preferenceRef = doc(db, PREFERENCE_COLLECTION, userId, 'friends', friendUid);
    const snapshot = await getDoc(preferenceRef);
    if (!snapshot.exists()) return createDefaultPreference();
    const data = snapshot.data();
    return {
      mode: data.mode === 'categories' ? 'categories' : 'total',
      period: ['all', 'rolling-three-months', 'current-month', 'day'].includes(data.period)
        ? data.period
        : 'current-month',
      selectedDate: typeof data.selectedDate === 'string' ? data.selectedDate : createDefaultPreference().selectedDate,
    };
  },

  async savePreference(
    userId: string,
    friendUid: string,
    preference: FriendDashboardPreference
  ): Promise<void> {
    const preferenceRef = doc(db, PREFERENCE_COLLECTION, userId, 'friends', friendUid);
    await setDoc(preferenceRef, { ...preference, updatedAt: serverTimestamp() });
  },

};
