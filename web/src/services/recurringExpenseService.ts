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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RecurringExpense } from '../types';

const COLLECTION_NAME = 'recurringExpenses';

// Helper function to remove undefined fields
const removeUndefinedFields = (data: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      cleaned[key] = data[key];
    }
  });
  return cleaned;
};

export const recurringExpenseService = {
  createId(): string {
    return doc(collection(db, COLLECTION_NAME)).id;
  },

  // Create a new recurring expense
  async create(
    recurringExpense: Omit<RecurringExpense, 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<string> {
    const { id, ...fields } = recurringExpense;
    const now = Timestamp.now();
    const dataToSave = removeUndefinedFields({
      ...fields,
      createdAt: now,
      updatedAt: now,
    });
    const recurringRef = id ? doc(db, COLLECTION_NAME, id) : doc(collection(db, COLLECTION_NAME));
    await setDoc(recurringRef, dataToSave);
    return recurringRef.id;
  },

  // Get all recurring expenses for a user
  async getAll(userId: string): Promise<RecurringExpense[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as RecurringExpense[];
  },

  // Get active recurring expenses
  async getActive(userId: string): Promise<RecurringExpense[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as RecurringExpense[];
  },

  // Update a recurring expense
  async update(id: string, updates: Partial<RecurringExpense>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const dataToUpdate = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    
    await updateDoc(docRef, dataToUpdate);
  },

  // Delete a recurring expense
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  // Toggle active status
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      isActive,
      updatedAt: Timestamp.now(),
    });
  },
};
