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
  deleteField,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Repayment } from '../types';

const COLLECTION_NAME = 'repayments';

export const repaymentService = {
  // Create a new repayment
  async create(repayment: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...repayment,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // Get all repayments for a user
  async getAll(userId: string): Promise<Repayment[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Repayment[];
  },

  // Get repayments for a specific expense
  async getByExpenseId(userId: string, expenseId: string): Promise<Repayment[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('expenseId', '==', expenseId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Repayment[];
  },

  // Update a repayment
  async update(id: string, updates: Partial<Repayment>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Handle undefined values: use deleteField() to remove them from Firestore
    const cleanedUpdates: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) {
        cleanedUpdates[key] = deleteField();
      } else {
        cleanedUpdates[key] = value;
      }
    });
    
    await updateDoc(docRef, {
      ...cleanedUpdates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete a repayment
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  // Calculate total repaid amount for an expense
  async getTotalRepaidForExpense(userId: string, expenseId: string): Promise<number> {
    const repayments = await this.getByExpenseId(userId, expenseId);
    return repayments.reduce((total, repayment) => total + repayment.amount, 0);
  },
};
