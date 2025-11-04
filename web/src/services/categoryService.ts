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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Category, DEFAULT_CATEGORIES } from '../types';

const COLLECTION_NAME = 'categories';

export const categoryService = {
  // Initialize default categories for a new user
  async initializeDefaults(userId: string): Promise<void> {
    const existing = await this.getAll(userId);
    if (existing.length === 0) {
      const now = Timestamp.now();
      const promises = DEFAULT_CATEGORIES.map((cat) =>
        addDoc(collection(db, COLLECTION_NAME), {
          userId,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          createdAt: now,
        })
      );
      await Promise.all(promises);
    }
  },

  // Create a new category
  async create(category: Omit<Category, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...category,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Get all categories for a user
  async getAll(userId: string): Promise<Category[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Category[];
  },

  // Update a category
  async update(id: string, updates: Partial<Category>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
  },

  // Delete a category (only non-default)
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },
};
