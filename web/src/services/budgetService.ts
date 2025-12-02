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
import { Budget } from '../types';

const COLLECTION_NAME = 'budgets';

// Helper function to remove undefined values from an object
// Firestore does not accept undefined values
// This function preserves all defined values and only removes keys with undefined values
const removeUndefinedValues = <T extends Record<string, unknown>>(obj: T): { [K in keyof T]: T[K] extends undefined ? never : T[K] } => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as { [K in keyof T]: T[K] extends undefined ? never : T[K] };
};

export const budgetService = {
  // Create a new budget
  async create(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    // Remove undefined values before sending to Firestore
    const cleanedBudget = removeUndefinedValues(budget);
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanedBudget,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // Get all budgets for a user
  async getAll(userId: string): Promise<Budget[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Budget[];
  },

  // Update a budget
  async update(id: string, updates: Partial<Budget>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    // Remove undefined values before sending to Firestore
    const cleanedUpdates = removeUndefinedValues(updates);
    await updateDoc(docRef, {
      ...cleanedUpdates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete a budget
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  // Get budget by category
  async getByCategory(userId: string, categoryId: string): Promise<Budget | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as Budget;
  },
};
