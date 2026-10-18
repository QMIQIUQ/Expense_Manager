import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card } from '../types';

const COLLECTION_NAME = 'cards';

export const cardService = {
  createId(): string {
    return doc(collection(db, COLLECTION_NAME)).id;
  },

  // Create a new card
  async create(card: Omit<Card, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
    const { id, ...fields } = card;
    const now = Timestamp.now();
    const cardRef = id ? doc(db, COLLECTION_NAME, id) : doc(collection(db, COLLECTION_NAME));
    await setDoc(cardRef, {
      ...fields,
      createdAt: now,
      updatedAt: now,
    });
    return cardRef.id;
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
