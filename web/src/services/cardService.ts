import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card } from '../types';

const COLLECTION_NAME = 'cards';

export const cardService = {
  // Create a new card
  async create(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...card,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // Get all cards for a user
  async getAll(userId: string): Promise<Card[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Card[];
  },

  // Update a card
  async update(id: string, updates: Partial<Card>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete a card
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },
};
