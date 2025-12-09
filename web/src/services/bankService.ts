import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Bank } from '../types';

const COLLECTION_NAME = 'banks';

export const bankService = {
  async create(bank: Omit<Bank, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...bank,
      balance: bank.balance ?? 0, // Default balance to 0
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  async getAll(userId: string): Promise<Bank[]> {
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
    })) as Bank[];
  },

  async update(id: string, updates: Partial<Bank>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  // Get bank by ID
  async getById(id: string): Promise<Bank | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Bank;
  },

  // Update balance by delta amount (positive to add, negative to subtract)
  async updateBalance(id: string, deltaAmount: number): Promise<void> {
    const bank = await this.getById(id);
    if (!bank) {
      throw new Error(`Bank with id ${id} not found`);
    }
    const currentBalance = bank.balance ?? 0;
    const newBalance = currentBalance + deltaAmount;
    await this.update(id, { balance: newBalance });
  },
};

export default bankService;
