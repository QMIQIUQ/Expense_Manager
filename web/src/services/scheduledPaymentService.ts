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
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ScheduledPayment, ScheduledPaymentRecord, ScheduledPaymentSummary } from '../types';

const SCHEDULED_PAYMENTS_COLLECTION = 'scheduledPayments';
const PAYMENT_RECORDS_COLLECTION = 'scheduledPaymentRecords';

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

// Calculate monthly payment from total amount with optional interest
export const calculateInstallmentAmount = (
  totalAmount: number,
  months: number,
  interestRate: number = 0
): number => {
  if (interestRate === 0) {
    return totalAmount / months;
  }
  // Simple interest calculation: total * (1 + rate/100) / months
  const totalWithInterest = totalAmount * (1 + interestRate / 100);
  return totalWithInterest / months;
};

// Calculate remaining amount for an installment
export const calculateRemainingAmount = (
  totalAmount: number,
  paidAmount: number,
  interestRate: number = 0
): number => {
  const totalWithInterest = totalAmount * (1 + (interestRate || 0) / 100);
  return Math.max(0, totalWithInterest - paidAmount);
};

export const scheduledPaymentService = {
  // ===============================================
  // Scheduled Payment CRUD
  // ===============================================

  // Create a new scheduled payment
  async create(
    scheduledPayment: Omit<ScheduledPayment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const now = Timestamp.now();
    const dataToSave = removeUndefinedFields({
      ...scheduledPayment,
      createdAt: now,
      updatedAt: now,
    });
    
    const docRef = await addDoc(collection(db, SCHEDULED_PAYMENTS_COLLECTION), dataToSave);
    return docRef.id;
  },

  // Get all scheduled payments for a user
  async getAll(userId: string): Promise<ScheduledPayment[]> {
    const q = query(
      collection(db, SCHEDULED_PAYMENTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('dueDay', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ScheduledPayment[];
  },

  // Get active scheduled payments
  async getActive(userId: string): Promise<ScheduledPayment[]> {
    const q = query(
      collection(db, SCHEDULED_PAYMENTS_COLLECTION),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ScheduledPayment[];
  },

  // Update a scheduled payment
  async update(id: string, updates: Partial<ScheduledPayment>): Promise<void> {
    const docRef = doc(db, SCHEDULED_PAYMENTS_COLLECTION, id);
    const dataToUpdate = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    
    await updateDoc(docRef, dataToUpdate);
  },

  // Delete a scheduled payment
  async delete(id: string): Promise<void> {
    const docRef = doc(db, SCHEDULED_PAYMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  // Toggle active status
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const docRef = doc(db, SCHEDULED_PAYMENTS_COLLECTION, id);
    await updateDoc(docRef, {
      isActive,
      updatedAt: Timestamp.now(),
    });
  },

  // Mark as completed (for installments/debts)
  async markCompleted(id: string): Promise<void> {
    const docRef = doc(db, SCHEDULED_PAYMENTS_COLLECTION, id);
    await updateDoc(docRef, {
      isCompleted: true,
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  },

  // ===============================================
  // Payment Records CRUD
  // ===============================================

  // Create a payment record
  async createPaymentRecord(
    record: Omit<ScheduledPaymentRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const now = Timestamp.now();
    const dataToSave = removeUndefinedFields({
      ...record,
      createdAt: now,
      updatedAt: now,
    });
    
    const docRef = await addDoc(collection(db, PAYMENT_RECORDS_COLLECTION), dataToSave);
    return docRef.id;
  },

  // Get all payment records for a scheduled payment
  async getPaymentRecords(userId: string, scheduledPaymentId: string): Promise<ScheduledPaymentRecord[]> {
    const q = query(
      collection(db, PAYMENT_RECORDS_COLLECTION),
      where('userId', '==', userId),
      where('scheduledPaymentId', '==', scheduledPaymentId),
      orderBy('paidDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ScheduledPaymentRecord[];
  },

  // Get all payment records for a user
  async getAllPaymentRecords(userId: string): Promise<ScheduledPaymentRecord[]> {
    const q = query(
      collection(db, PAYMENT_RECORDS_COLLECTION),
      where('userId', '==', userId),
      orderBy('paidDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ScheduledPaymentRecord[];
  },

  // Update a payment record
  async updatePaymentRecord(id: string, updates: Partial<ScheduledPaymentRecord>): Promise<void> {
    const docRef = doc(db, PAYMENT_RECORDS_COLLECTION, id);
    const dataToUpdate = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    
    await updateDoc(docRef, dataToUpdate);
  },

  // Delete a payment record
  async deletePaymentRecord(id: string): Promise<void> {
    const docRef = doc(db, PAYMENT_RECORDS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ===============================================
  // Summary and Analytics
  // ===============================================

  // Get payment summary for a scheduled payment
  async getPaymentSummary(
    userId: string,
    scheduledPayment: ScheduledPayment
  ): Promise<ScheduledPaymentSummary> {
    const records = await this.getPaymentRecords(userId, scheduledPayment.id!);
    
    const totalPaid = records.reduce((sum, r) => sum + r.actualAmount, 0);
    const totalExpected = records.reduce((sum, r) => sum + r.expectedAmount, 0);
    const paymentCount = records.length;
    const lastPaymentDate = records.length > 0 ? records[0].paidDate : undefined;
    
    // Calculate next due date
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    let nextDueDate: string | undefined;
    
    if (scheduledPayment.isActive && !scheduledPayment.isCompleted) {
      if (scheduledPayment.frequency === 'monthly') {
        const dueDay = scheduledPayment.dueDay;
        let nextDueMonth = currentMonth;
        let nextDueYear = currentYear;
        
        // If we've passed this month's due date, next is next month
        if (today.getDate() > dueDay) {
          nextDueMonth++;
          if (nextDueMonth > 12) {
            nextDueMonth = 1;
            nextDueYear++;
          }
        }
        
        nextDueDate = `${nextDueYear}-${String(nextDueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
      } else {
        // Yearly
        const startDate = new Date(scheduledPayment.startDate);
        const dueMonth = startDate.getMonth() + 1;
        const dueDay = startDate.getDate();
        let nextDueYear = currentYear;
        
        const thisYearDue = new Date(currentYear, dueMonth - 1, dueDay);
        if (today > thisYearDue) {
          nextDueYear++;
        }
        
        nextDueDate = `${nextDueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
      }
    }
    
    // Calculate remaining for installments
    let remainingPayments: number | undefined;
    let remainingAmount: number | undefined;
    
    if (scheduledPayment.type === 'installment' && scheduledPayment.totalInstallments) {
      remainingPayments = scheduledPayment.totalInstallments - paymentCount;
      if (scheduledPayment.totalAmount) {
        const totalWithInterest = scheduledPayment.totalAmount * (1 + (scheduledPayment.interestRate || 0) / 100);
        remainingAmount = Math.max(0, totalWithInterest - totalPaid);
      }
    } else if (scheduledPayment.type === 'debt' && scheduledPayment.totalAmount) {
      const totalWithInterest = scheduledPayment.totalAmount * (1 + (scheduledPayment.interestRate || 0) / 100);
      remainingAmount = Math.max(0, totalWithInterest - totalPaid);
    }
    
    return {
      scheduledPaymentId: scheduledPayment.id!,
      totalPaid,
      totalExpected,
      paymentCount,
      remainingPayments,
      remainingAmount,
      lastPaymentDate,
      nextDueDate,
    };
  },

  // Check if a period has been paid
  async isPeriodPaid(
    userId: string,
    scheduledPaymentId: string,
    year: number,
    month: number
  ): Promise<boolean> {
    const records = await this.getPaymentRecords(userId, scheduledPaymentId);
    return records.some(r => r.periodYear === year && r.periodMonth === month);
  },

  // Get pending payments (due this month but not yet paid)
  async getPendingPayments(userId: string): Promise<ScheduledPayment[]> {
    const activePayments = await this.getActive(userId);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    const pending: ScheduledPayment[] = [];
    
    for (const payment of activePayments) {
      const isPaid = await this.isPeriodPaid(userId, payment.id!, currentYear, currentMonth);
      if (!isPaid) {
        pending.push(payment);
      }
    }
    
    return pending;
  },
};
