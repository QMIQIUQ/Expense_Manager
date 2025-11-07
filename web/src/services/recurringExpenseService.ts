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
import { RecurringExpense } from '../types';

const COLLECTION_NAME = 'recurringExpenses';

export const recurringExpenseService = {
  // Create a new recurring expense
  async create(
    recurringExpense: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const now = Timestamp.now();
    const dataToSave: any = {
      ...recurringExpense,
      createdAt: now,
      updatedAt: now,
    };
    
    // Remove undefined fields to avoid Firebase errors
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key] === undefined) {
        delete dataToSave[key];
      }
    });
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    return docRef.id;
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
    const dataToUpdate: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    
    // Remove undefined fields to avoid Firebase errors
    Object.keys(dataToUpdate).forEach(key => {
      if (dataToUpdate[key] === undefined) {
        delete dataToUpdate[key];
      }
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
