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
import { GrabEarning } from '../types';

const COLLECTION_NAME = 'grab-earnings';

export const grabEarningsService = {
  // Create a new Grab earning
  async create(earning: Omit<GrabEarning, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Validate net amount calculation
    const calculatedNet = earning.grossAmount - earning.platformFees + earning.tips;
    if (Math.abs(calculatedNet - earning.netAmount) > 0.01) {
      console.warn('Net amount mismatch. Recalculating...');
      earning.netAmount = calculatedNet;
    }

    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...earning,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // Get all Grab earnings for a user
  async getAll(userId: string): Promise<GrabEarning[]> {
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
    })) as GrabEarning[];
  },

  // Get Grab earnings by date range
  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<GrabEarning[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as GrabEarning[];
  },

  // Get Grab earnings by month (YYYY-MM format)
  async getByMonth(userId: string, month: string): Promise<GrabEarning[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    return this.getByDateRange(userId, startDate, endDate);
  },

  // Update a Grab earning
  async update(id: string, updates: Partial<GrabEarning>): Promise<void> {
    // Recalculate net amount if gross, fees, or tips are being updated
    if (updates.grossAmount !== undefined || updates.platformFees !== undefined || updates.tips !== undefined) {
      const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where('__name__', '==', id)));
      
      if (docSnap.docs.length > 0) {
        const currentData = docSnap.docs[0].data() as GrabEarning;
        const gross = updates.grossAmount ?? currentData.grossAmount;
        const fees = updates.platformFees ?? currentData.platformFees;
        const tips = updates.tips ?? currentData.tips;
        updates.netAmount = gross - fees + tips;
      }
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete a Grab earning
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  // Calculate monthly statistics
  async getMonthlyStats(userId: string, month: string): Promise<{
    totalGross: number;
    totalFees: number;
    totalTips: number;
    totalNet: number;
    tripCount: number;
    byTripType: Record<string, { count: number; gross: number; net: number }>;
  }> {
    const earnings = await this.getByMonth(userId, month);
    
    const stats = {
      totalGross: 0,
      totalFees: 0,
      totalTips: 0,
      totalNet: 0,
      tripCount: earnings.length,
      byTripType: {} as Record<string, { count: number; gross: number; net: number }>,
    };

    earnings.forEach((earning) => {
      stats.totalGross += earning.grossAmount;
      stats.totalFees += earning.platformFees;
      stats.totalTips += earning.tips;
      stats.totalNet += earning.netAmount;

      if (!stats.byTripType[earning.tripType]) {
        stats.byTripType[earning.tripType] = { count: 0, gross: 0, net: 0 };
      }
      stats.byTripType[earning.tripType].count += 1;
      stats.byTripType[earning.tripType].gross += earning.grossAmount;
      stats.byTripType[earning.tripType].net += earning.netAmount;
    });

    return stats;
  },
};
