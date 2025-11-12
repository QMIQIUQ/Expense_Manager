import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { EWallet, DEFAULT_EWALLETS } from '../types';

const COLLECTION_NAME = 'ewallets';

export const ewalletService = {
  // Initialize default e-wallets for a new user
  async initializeDefaults(userId: string): Promise<void> {
    const existing = await this.getAll(userId);
    if (existing.length === 0) {
      const now = Timestamp.now();
      const promises = DEFAULT_EWALLETS.map((wallet) =>
        addDoc(collection(db, COLLECTION_NAME), {
          userId,
          name: wallet.name,
          icon: wallet.icon,
          color: wallet.color,
          provider: wallet.provider,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        })
      );
      await Promise.all(promises);
    }
  },

  // Create a new e-wallet
  async create(ewallet: Omit<EWallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...ewallet,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // Get all e-wallets for a user
  async getAll(userId: string): Promise<EWallet[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as EWallet[];
  },

  // Search e-wallets by name (for autocomplete)
  async search(
    userId: string,
    searchTerm: string,
    pageLimit = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ ewallets: EWallet[]; lastDoc?: QueryDocumentSnapshot }> {
    const searchLower = searchTerm.toLowerCase();
    
    // Build query with pagination
    let q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc'),
      limit(pageLimit)
    );
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const allWallets = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as EWallet[];
    
    // Client-side filtering for simplicity
    // For large datasets, consider server-side search with Algolia or similar
    const filtered = allWallets.filter((wallet) =>
      wallet.name.toLowerCase().includes(searchLower) ||
      wallet.provider?.toLowerCase().includes(searchLower)
    );
    
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return {
      ewallets: filtered,
      lastDoc: lastVisible,
    };
  },

  // Update an e-wallet
  async update(id: string, updates: Partial<EWallet>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete an e-wallet
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  // Get e-wallet by ID
  async getById(id: string): Promise<EWallet | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where('__name__', '==', id)));
    if (docSnap.empty) return null;
    
    const data = docSnap.docs[0].data();
    return {
      id: docSnap.docs[0].id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as EWallet;
  },
};
