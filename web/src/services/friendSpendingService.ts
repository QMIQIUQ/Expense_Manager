import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, friendSpendingEnabled } from '../config/firebase';
import type {
  FriendConnection,
  FriendDashboardPreference,
  FriendSpendingSummaryRequest,
} from '../types/friendSpending';
import { expenseService } from './expenseService';
import {
  friendSpendingSummaryStateRef,
  isFriendSpendingSummaryReady,
  listenFriendSpendingSummary,
  rebuildFriendSpendingSummary,
} from './friendSpendingSummaryService';

const PREFERENCE_COLLECTION = 'friendDashboardPreferences';
const REQUEST_COLLECTION = 'friendRequests';
const CONNECTION_COLLECTION = 'friendConnections';
const SHARING_COLLECTION = 'friendSharing';

const createDefaultPreference = (): FriendDashboardPreference => {
  const today = new Date();
  return {
    mode: 'total',
    period: 'current-month',
    selectedDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
  };
};

const ensureFeatureEnabled = (): void => {
  if (!friendSpendingEnabled) throw new Error('friend_spending_preview_disabled');
};

const ensureSummaryReady = async (userId: string): Promise<void> => {
  const stateSnapshot = await getDoc(friendSpendingSummaryStateRef(userId));
  if (isFriendSpendingSummaryReady(stateSnapshot.data())) return;
  const expenses = await expenseService.getAllFromServer(userId);
  await rebuildFriendSpendingSummary(userId, expenses);
};

const getFriendReferences = (userId: string, friendUid: string) => ({
  myConnection: doc(db, CONNECTION_COLLECTION, userId, 'friends', friendUid),
  theirConnection: doc(db, CONNECTION_COLLECTION, friendUid, 'friends', userId),
  myIncomingRequest: doc(db, REQUEST_COLLECTION, userId, 'incoming', friendUid),
  myOutgoingRequest: doc(db, REQUEST_COLLECTION, userId, 'outgoing', friendUid),
  theirIncomingRequest: doc(db, REQUEST_COLLECTION, friendUid, 'incoming', userId),
  theirOutgoingRequest: doc(db, REQUEST_COLLECTION, friendUid, 'outgoing', userId),
  myShare: doc(db, SHARING_COLLECTION, userId, 'friends', friendUid),
  theirShare: doc(db, SHARING_COLLECTION, friendUid, 'friends', userId),
  myPreference: doc(db, PREFERENCE_COLLECTION, userId, 'friends', friendUid),
});

const requestData = (senderUid: string, recipientUid: string, status: 'pending' | 'accepted') => ({
  senderUid,
  recipientUid,
  status,
});

export type FriendMutation =
  | { action: 'send'; friendUid: string }
  | { action: 'accept' | 'decline' | 'remove'; friendUid: string }
  | { action: 'set-sharing'; friendUid: string; enabled: boolean };

export const friendSpendingService = {
  async getConnections(userId: string): Promise<FriendConnection[]> {
    ensureFeatureEnabled();
    const [connectionsSnapshot, incomingSnapshot, outgoingSnapshot] = await Promise.all([
      getDocs(collection(db, CONNECTION_COLLECTION, userId, 'friends')),
      getDocs(collection(db, REQUEST_COLLECTION, userId, 'incoming')),
      getDocs(collection(db, REQUEST_COLLECTION, userId, 'outgoing')),
    ]);

    const acceptedConnections = await Promise.all(connectionsSnapshot.docs
      .filter((document) => document.data().status === 'accepted')
      .map(async (document): Promise<FriendConnection> => {
        const friendUid = document.id;
        const refs = getFriendReferences(userId, friendUid);
        const [myShare, theirShare] = await Promise.all([
          getDoc(refs.myShare),
          getDoc(refs.theirShare),
        ]);
        return {
          friendUid,
          status: 'accepted',
          direction: 'friend',
          shareEnabledByMe: myShare.exists() && myShare.data().enabled === true,
          shareEnabledWithMe: theirShare.exists() && theirShare.data().enabled === true,
        };
      }));

    const incomingRequests: FriendConnection[] = incomingSnapshot.docs
      .filter((document) => document.data().status === 'pending')
      .map((document) => ({
        friendUid: document.id,
        status: 'pending',
        direction: 'incoming',
        shareEnabledByMe: false,
        shareEnabledWithMe: false,
      }));
    const outgoingRequests: FriendConnection[] = outgoingSnapshot.docs
      .filter((document) => document.data().status === 'pending')
      .map((document) => ({
        friendUid: document.id,
        status: 'pending',
        direction: 'outgoing',
        shareEnabledByMe: false,
        shareEnabledWithMe: false,
      }));

    if (acceptedConnections.some((connection) => connection.shareEnabledByMe)) {
      await ensureSummaryReady(userId);
    }

    return [...acceptedConnections, ...incomingRequests, ...outgoingRequests];
  },

  listenSpendingSummary(
    input: FriendSpendingSummaryRequest,
    onValue: Parameters<typeof listenFriendSpendingSummary>[1],
    onError: Parameters<typeof listenFriendSpendingSummary>[2],
  ) {
    ensureFeatureEnabled();
    return listenFriendSpendingSummary(input, onValue, onError);
  },

  async mutateFriendship(userId: string, input: FriendMutation): Promise<void> {
    ensureFeatureEnabled();
    const friendUid = input.friendUid.trim();
    if (!friendUid || friendUid.length > 128 || friendUid === userId) {
      throw new Error('invalid-argument');
    }
    const refs = getFriendReferences(userId, friendUid);

    if (input.action === 'send') {
      await runTransaction(db, async (transaction) => {
        const [myConnection, theirConnection, myOutgoing, theirIncoming, myIncoming, theirOutgoing] = await Promise.all([
          transaction.get(refs.myConnection),
          transaction.get(refs.theirConnection),
          transaction.get(refs.myOutgoingRequest),
          transaction.get(refs.theirIncomingRequest),
          transaction.get(refs.myIncomingRequest),
          transaction.get(refs.theirOutgoingRequest),
        ]);
        if (myConnection.exists() || theirConnection.exists()) throw new Error('already-exists');
        if (myOutgoing.exists() && myOutgoing.data().status === 'pending') return;
        if (theirOutgoing.exists() && theirOutgoing.data().status === 'pending') {
          throw new Error('already-exists');
        }
        if (myIncoming.exists() || theirIncoming.exists()) throw new Error('already-exists');

        transaction.set(refs.myOutgoingRequest, requestData(userId, friendUid, 'pending'));
        transaction.set(refs.theirIncomingRequest, requestData(userId, friendUid, 'pending'));
      });
      return;
    }

    if (input.action === 'accept') {
      await runTransaction(db, async (transaction) => {
        const [incoming, outgoing] = await Promise.all([
          transaction.get(refs.myIncomingRequest),
          transaction.get(refs.theirOutgoingRequest),
        ]);
        if (
          !incoming.exists() || incoming.data().status !== 'pending' ||
          !outgoing.exists() || outgoing.data().status !== 'pending'
        ) {
          throw new Error('not-found');
        }
        const requesterUid = incoming.data().senderUid as string;
        transaction.update(refs.myIncomingRequest, { status: 'accepted' });
        transaction.update(refs.theirOutgoingRequest, { status: 'accepted' });
        transaction.set(refs.myConnection, {
          friendUid,
          requesterUid,
          status: 'accepted',
          connectedAt: serverTimestamp(),
        });
        transaction.set(refs.theirConnection, {
          friendUid: userId,
          requesterUid,
          status: 'accepted',
          connectedAt: serverTimestamp(),
        });
      });
      return;
    }

    if (input.action === 'decline') {
      await runTransaction(db, async (transaction) => {
        const [incoming, outgoing] = await Promise.all([
          transaction.get(refs.myIncomingRequest),
          transaction.get(refs.theirOutgoingRequest),
        ]);
        if (
          !incoming.exists() || incoming.data().status !== 'pending' ||
          !outgoing.exists() || outgoing.data().status !== 'pending'
        ) {
          throw new Error('not-found');
        }
        transaction.delete(refs.myIncomingRequest);
        transaction.delete(refs.theirOutgoingRequest);
      });
      return;
    }

    if (input.action === 'remove') {
      await runTransaction(db, async (transaction) => {
        const [
          myConnection,
          theirConnection,
          myIncoming,
          myOutgoing,
          theirIncoming,
          theirOutgoing,
          myShare,
          theirShare,
          myPreference,
        ] = await Promise.all([
          transaction.get(refs.myConnection),
          transaction.get(refs.theirConnection),
          transaction.get(refs.myIncomingRequest),
          transaction.get(refs.myOutgoingRequest),
          transaction.get(refs.theirIncomingRequest),
          transaction.get(refs.theirOutgoingRequest),
          transaction.get(refs.myShare),
          transaction.get(refs.theirShare),
          transaction.get(refs.myPreference),
        ]);
        if (
          !myConnection.exists() || myConnection.data().status !== 'accepted' ||
          !theirConnection.exists() || theirConnection.data().status !== 'accepted'
        ) {
          throw new Error('failed-precondition');
        }

        transaction.delete(refs.myConnection);
        transaction.delete(refs.theirConnection);
        [myIncoming, myOutgoing, theirIncoming, theirOutgoing].forEach((snapshot, index) => {
          const requestRefs = [
            refs.myIncomingRequest,
            refs.myOutgoingRequest,
            refs.theirIncomingRequest,
            refs.theirOutgoingRequest,
          ];
          if (snapshot.exists()) transaction.delete(requestRefs[index]);
        });
        if (myShare.exists()) transaction.delete(refs.myShare);
        if (theirShare.exists()) transaction.delete(refs.theirShare);
        if (myPreference.exists()) transaction.delete(refs.myPreference);
      });
      return;
    }

    if (input.action === 'set-sharing') {
      if (typeof input.enabled !== 'boolean') throw new Error('invalid-argument');
      const connection = await getDoc(refs.myConnection);
      if (!connection.exists() || connection.data().status !== 'accepted') {
        throw new Error('failed-precondition');
      }
      if (input.enabled) await ensureSummaryReady(userId);

      await runTransaction(db, async (transaction) => {
        const [currentConnection, currentShare] = await Promise.all([
          transaction.get(refs.myConnection),
          transaction.get(refs.myShare),
        ]);
        if (!currentConnection.exists() || currentConnection.data().status !== 'accepted') {
          throw new Error('failed-precondition');
        }
        if (input.enabled) {
          transaction.set(refs.myShare, { enabled: true, updatedAt: serverTimestamp() });
        } else if (currentShare.exists()) {
          transaction.delete(refs.myShare);
        }
      });
      return;
    }

    throw new Error('invalid-argument');
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
      selectedDate: typeof data.selectedDate === 'string'
        ? data.selectedDate
        : createDefaultPreference().selectedDate,
    };
  },

  async savePreference(
    userId: string,
    friendUid: string,
    preference: FriendDashboardPreference,
  ): Promise<void> {
    const preferenceRef = doc(db, PREFERENCE_COLLECTION, userId, 'friends', friendUid);
    await setDoc(preferenceRef, { ...preference, updatedAt: serverTimestamp() });
  },
};
