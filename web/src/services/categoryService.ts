import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  setDoc,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Category, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_NAMES } from '../types';
import { sortCategories } from '../utils/categoryOrder';

const COLLECTION_NAME = 'categories';

export const categoryService = {
  createId(): string {
    return doc(collection(db, COLLECTION_NAME)).id;
  },

  // Seed new accounts and return categories after any one-time default migration.
  async initializeDefaults(userId: string, migrateSavingsCategory = false): Promise<Category[]> {
    const existing = await this.getAll(userId);
    if (existing.length === 0) {
      const now = Timestamp.now();
      const promises = DEFAULT_CATEGORIES.map((category) =>
        runTransaction(db, async (transaction) => {
          const reference = doc(db, COLLECTION_NAME, `default_${userId}_${encodeURIComponent(category.name)}`);
          const existing = await transaction.get(reference);
          if (!existing.exists()) transaction.set(reference, {
            userId, name: category.name, icon: category.icon, color: category.color,
            isDefault: true, createdAt: now,
          });
        })
      );
      await Promise.all(promises);
    } else if (
      migrateSavingsCategory &&
      !existing.some((category) => category.name.trim().toLowerCase() === DEFAULT_CATEGORY_NAMES.savings.toLowerCase())
    ) {
      const savingsCategory = DEFAULT_CATEGORIES.find((category) => category.name === DEFAULT_CATEGORY_NAMES.savings);
      if (savingsCategory) {
        await runTransaction(db, async (transaction) => {
          const reference = doc(db, COLLECTION_NAME, `${userId}_default_savings`);
          const current = await transaction.get(reference);
          if (!current.exists()) transaction.set(reference, { userId, ...savingsCategory, isDefault: true, createdAt: Timestamp.now() });
        });
      }
    }

    return this.getAll(userId);
  },

  // Create a new category
  async create(category: Omit<Category, 'createdAt'> & { id?: string }): Promise<string> {
    const { id, ...categoryData } = category;
    const categoryRef = id
      ? doc(db, COLLECTION_NAME, id)
      : doc(collection(db, COLLECTION_NAME));
    await setDoc(categoryRef, {
      ...categoryData,
      createdAt: Timestamp.now(),
    });
    return categoryRef.id;
  },

  // Get all categories for a user
  async getAll(userId: string): Promise<Category[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return sortCategories(querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Category[]);
  },

  async updateOrder(orderedIds: string[]): Promise<void> {
    for (let offset = 0; offset < orderedIds.length; offset += 500) {
      const batch = writeBatch(db);
      orderedIds.slice(offset, offset + 500).forEach((id, index) => {
        batch.update(doc(db, COLLECTION_NAME, id), { order: offset + index });
      });
      await batch.commit();
    }
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
