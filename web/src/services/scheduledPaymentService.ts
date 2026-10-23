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
  getDocsFromServer,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Expense, Transfer, ScheduledPayment, ScheduledPaymentRecord, ScheduledPaymentSummary } from '../types';
import { hasFinancialReceipt, runFinancialTransaction, type FinancialOperation } from './financialMutation';
import { applyBalanceAdjustmentsInTransaction, bookedAccountMovements, prepareBalanceAdjustments } from './balanceService';
import { applyExpenseSummaryChange, friendSpendingSummaryStateRef, isFriendSpendingSummaryReady } from './friendSpendingSummaryService';
import { getCurrencyMinorDigits } from '../domain/money';

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
// Uses simple interest: total amount * (1 + interest rate) divided equally across all months
// This is not compound interest - the interest is calculated once on the principal
export const calculateInstallmentAmount = (
  totalAmount: number,
  months: number,
  interestRate: number = 0
): number => {
  if (interestRate === 0) {
    return totalAmount / months;
  }
  // Simple interest: add interest to total, then divide by number of payments
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
  createId(): string {
    return doc(collection(db, SCHEDULED_PAYMENTS_COLLECTION)).id;
  },

  // ===============================================
  // Scheduled Payment CRUD
  // ===============================================

  // Create a new scheduled payment
  async create(
    scheduledPayment: Omit<ScheduledPayment, 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<string> {
    const { id, ...fields } = scheduledPayment;
    const now = Timestamp.now();
    const dataToSave = removeUndefinedFields({
      ...fields,
      createdAt: now,
      updatedAt: now,
    });
    const paymentRef = id ? doc(db, SCHEDULED_PAYMENTS_COLLECTION, id) : doc(collection(db, SCHEDULED_PAYMENTS_COLLECTION));
    await setDoc(paymentRef, dataToSave);
    return paymentRef.id;
  },

  // Get all scheduled payments for a user
  async getAll(userId: string): Promise<ScheduledPayment[]> {
    const q = query(
      collection(db, SCHEDULED_PAYMENTS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const payments = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ScheduledPayment[];
    
    // Sort by dueDay on client side to avoid requiring composite index
    return payments.sort((a, b) => a.dueDay - b.dueDay);
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
    record: Omit<ScheduledPaymentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    generatedExpense?: Omit<Expense, 'createdAt' | 'updatedAt'>,
    operation?: FinancialOperation,
  ): Promise<string> {
    if (await hasFinancialReceipt(operation)) return record.id!;
    const { id, ...recordFields } = record;
    const recordRef = id ? doc(db, PAYMENT_RECORDS_COLLECTION, id) : doc(collection(db, PAYMENT_RECORDS_COLLECTION));
    if (generatedExpense && (!generatedExpense.id || generatedExpense.userId !== record.userId)) {
      throw Object.assign(new Error('Generated expense requires a stable ID and the same owner'), { code: 'invalid-argument' });
    }
    if (generatedExpense && (generatedExpense.amount !== record.actualAmount || generatedExpense.date !== record.paidDate ||
        (generatedExpense.currency ?? 'MYR') !== (record.currency ?? 'MYR'))) throw Object.assign(new Error('Payment and expense valuations must agree'), { code: 'invalid-argument' });
    const effectiveRecord = {
      ...recordFields,
      paymentMethod: recordFields.paymentMethod ?? generatedExpense?.paymentMethod,
      bankId: recordFields.bankId ?? generatedExpense?.bankId,
      cardId: recordFields.cardId ?? generatedExpense?.cardId,
      paymentMethodName: recordFields.paymentMethodName ?? generatedExpense?.paymentMethodName,
    };
    const expenseRef = generatedExpense ? doc(db, 'expenses', generatedExpense.id!) : undefined;
    const adjustments = generatedExpense ? await prepareBalanceAdjustments(record.userId, [{
      type: 'expense', expense: { ...generatedExpense, bookedAccountMovements: undefined } as Expense, direction: -1,
    }]) : [];
    const now = Timestamp.now();
    await runFinancialTransaction(db, operation, async (transaction) => {
      const [existingRecord, existingExpense, summary, parent] = await Promise.all([
        transaction.get(recordRef),
        expenseRef ? transaction.get(expenseRef) : Promise.resolve(undefined),
        generatedExpense ? transaction.get(friendSpendingSummaryStateRef(record.userId)) : Promise.resolve(undefined),
        transaction.get(doc(db, SCHEDULED_PAYMENTS_COLLECTION, record.scheduledPaymentId)),
      ]);
      if (!existingRecord.exists() && (!parent.exists() || parent.data().userId !== record.userId)) throw Object.assign(new Error('Scheduled payment is no longer available'), { code: 'failed-precondition' });
      if (existingRecord.exists() && existingRecord.data().userId !== record.userId) throw new Error('Payment record is owned by another user');
      if (existingExpense?.exists() && existingExpense.data().userId !== record.userId) throw new Error('Generated expense is owned by another user');
      if (existingExpense?.exists() && existingExpense.data().scheduledPaymentRecordId !== recordRef.id) throw Object.assign(new Error('An existing expense cannot be attached to this payment'), { code: 'already-exists' });
      if (existingRecord.exists() && ['scheduledPaymentId', 'periodYear', 'periodMonth', 'actualAmount', 'paidDate', 'currency', 'paymentMethod', 'bankId', 'cardId', 'paymentMethodName'].some((field) =>
        existingRecord.data()[field] !== undefined && existingRecord.data()[field] !== (effectiveRecord as Record<string, unknown>)[field])) throw Object.assign(new Error('This period was already confirmed with different payment details'), { code: 'already-exists' });
      const linkedId = existingRecord.data()?.generatedExpenseId;
      if (linkedId && linkedId !== generatedExpense?.id) throw new Error('Payment record already links a different expense');
      if (generatedExpense && expenseRef && !existingExpense?.exists()) {
        await applyBalanceAdjustmentsInTransaction(transaction, adjustments);
        if (isFriendSpendingSummaryReady(summary?.data())) applyExpenseSummaryChange(transaction, null, generatedExpense as Expense);
        const { id: expenseId, ...expenseFields } = generatedExpense;
        void expenseId;
        transaction.set(expenseRef, removeUndefinedFields({
          ...expenseFields, revision: 1, bookedAccountMovements: bookedAccountMovements(adjustments), scheduledPaymentRecordId: recordRef.id, createdAt: now, updatedAt: now,
        }));
      }
      if (!existingRecord.exists()) {
        transaction.set(recordRef, removeUndefinedFields({
          ...effectiveRecord, generatedExpenseId: generatedExpense?.id, createdAt: now, updatedAt: now,
        }));
      } else if (generatedExpense && !linkedId) {
        // Repair a payment partially committed by an older client.
        transaction.update(recordRef, { generatedExpenseId: generatedExpense.id, updatedAt: now });
      }
    });
    return recordRef.id;
  },

  createPaymentRecordId(userId?: string, paymentId?: string, year?: number, month?: number): string {
    // Confirmation means one payment per scheduled period. Extra payments require
    // a distinct period/intention, never a second random ID for the same click.
    return userId && paymentId && year && month
      ? `period-${encodeURIComponent(JSON.stringify([userId, paymentId, year, month]))}`
      : doc(collection(db, PAYMENT_RECORDS_COLLECTION)).id;
  },

  // Get all payment records for a scheduled payment
  async getPaymentRecords(userId: string, scheduledPaymentId: string): Promise<ScheduledPaymentRecord[]> {
    const q = query(
      collection(db, PAYMENT_RECORDS_COLLECTION),
      where('userId', '==', userId),
      where('scheduledPaymentId', '==', scheduledPaymentId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ScheduledPaymentRecord[];
    
    // Sort by paidDate on client side to avoid requiring composite index
    return records.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());
  },

  // Get all payment records for a user
  async getAllPaymentRecords(userId: string): Promise<ScheduledPaymentRecord[]> {
    const q = query(
      collection(db, PAYMENT_RECORDS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ScheduledPaymentRecord[];
    
    // Sort by paidDate on client side to avoid requiring composite index
    return records.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());
  },

  // Update a payment record
  async updatePaymentRecord(id: string, updates: Partial<ScheduledPaymentRecord>, operation?: FinancialOperation): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const recordRef = doc(db, PAYMENT_RECORDS_COLLECTION, id);
    await runFinancialTransaction(db, operation, async (transaction) => {
      const record = await transaction.get(recordRef);
      if (!record.exists()) throw new Error('Payment record not found');
      const previous = record.data() as ScheduledPaymentRecord;
      if ((operation && previous.userId !== operation.userId) ||
          (updates.userId && updates.userId !== previous.userId) ||
          (updates.scheduledPaymentId && updates.scheduledPaymentId !== previous.scheduledPaymentId) ||
          (updates.generatedExpenseId && updates.generatedExpenseId !== previous.generatedExpenseId) ||
          (updates.periodYear && updates.periodYear !== previous.periodYear) ||
          (updates.periodMonth && updates.periodMonth !== previous.periodMonth)) throw new Error('Payment identity cannot be changed');
      const next = { ...previous, ...updates };
      const valuationChanged = ['actualAmount', 'currency', 'baseCurrency', 'paidDate'].some((field) =>
        field in updates && (updates as Record<string, unknown>)[field] !== (previous as unknown as Record<string, unknown>)[field]);
      if (valuationChanged && updates.baseAmount === undefined) {
        if ((next.currency ?? 'MYR') !== (next.baseCurrency ?? 'MYR')) throw Object.assign(new Error('An updated payment amount requires a new currency snapshot'), { code: 'invalid-argument' });
        next.baseAmount = next.actualAmount;
        next.exchangeRate = 1;
      }
      if (!Number.isFinite(next.actualAmount) || next.actualAmount < 0) throw new Error('Invalid payment amount');
      const expenseRef = previous.generatedExpenseId ? doc(db, 'expenses', previous.generatedExpenseId) : undefined;
      const expense = expenseRef ? await transaction.get(expenseRef) : undefined;
      if (expenseRef && !expense?.exists()) throw new Error('Linked expense is missing; reconcile the payment before editing');
      if (expense?.exists() && expenseRef) {
        const before = { ...expense.data(), id: expense.id } as Expense;
        if (before.userId !== previous.userId || before.scheduledPaymentRecordId !== id) throw new Error('Invalid payment expense link');
        const after: Expense = { ...before, amount: next.actualAmount, date: next.paidDate,
          currency: next.currency, baseCurrency: next.baseCurrency, baseAmount: next.baseAmount,
          exchangeRate: next.exchangeRate, exchangeRateDate: next.exchangeRateDate,
          paymentMethod: next.paymentMethod, bankId: next.bankId, cardId: next.cardId,
          paymentMethodName: next.paymentMethodName, notes: 'note' in next ? next.note : before.notes };
        const summary = await transaction.get(friendSpendingSummaryStateRef(previous.userId));
        const adjustments = await prepareBalanceAdjustments(previous.userId, [
          { type: 'expense', expense: before, direction: 1 }, { type: 'expense', expense: after, direction: -1 },
        ]);
        await applyBalanceAdjustmentsInTransaction(transaction, adjustments);
        if (isFriendSpendingSummaryReady(summary.data())) applyExpenseSummaryChange(transaction, before, after);
        const { id: ignored, ...fields } = after; void ignored;
        const currentRevision = Number.isInteger(before.revision) && (before.revision ?? 0) >= 0 ? before.revision! : 0;
        transaction.set(expenseRef, removeUndefinedFields({ ...fields, revision: currentRevision + 1, bookedAccountMovements: bookedAccountMovements(adjustments, 1), updatedAt: Timestamp.now() }));
      }
      const { id: ignored, ...fields } = next; void ignored;
      transaction.set(recordRef, removeUndefinedFields({ ...fields, difference: next.actualAmount - next.expectedAmount, updatedAt: Timestamp.now() }));
    });
  },

  // Delete a payment record
  async deletePaymentRecord(id: string, operation?: FinancialOperation): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const recordRef = doc(db, PAYMENT_RECORDS_COLLECTION, id);
    await runFinancialTransaction(db, operation, async (transaction) => {
      const record = await transaction.get(recordRef);
      if (!record.exists()) return;
      const previous = record.data() as ScheduledPaymentRecord;
      if (operation && previous.userId !== operation.userId) throw new Error('Payment belongs to another user');
      const expenseRef = previous.generatedExpenseId ? doc(db, 'expenses', previous.generatedExpenseId) : undefined;
      const expense = expenseRef ? await transaction.get(expenseRef) : undefined;
      if (expense?.exists() && expenseRef) {
        const before = { ...expense.data(), id: expense.id } as Expense;
        if (before.userId !== previous.userId || before.scheduledPaymentRecordId !== id) throw new Error('Invalid payment expense link');
        const linked = await getDocsFromServer(query(collection(db, 'transfers'), where('userId', '==', previous.userId), where('expenseId', '==', expense.id)));
        const ids = new Set([...linked.docs.map((row) => row.id), ...(before.relatedTransferIds ?? [])]);
        if (ids.size > 150) throw new Error('Too many linked transfers for atomic deletion');
        const transfers = await Promise.all([...ids].map((transferId) => transaction.get(doc(db, 'transfers', transferId))));
        const owned = transfers.filter((row) => row.exists() && row.data().userId === previous.userId && row.data().expenseId === expense.id);
        const summary = await transaction.get(friendSpendingSummaryStateRef(previous.userId));
        const adjustments = await prepareBalanceAdjustments(previous.userId, [
          { type: 'expense', expense: before, direction: 1 },
          ...owned.map((row) => ({ type: 'transfer' as const, transfer: { ...row.data(), id: row.id } as Transfer, sourceDirection: 1 as const, destinationDirection: -1 as const })),
        ]);
        await applyBalanceAdjustmentsInTransaction(transaction, adjustments);
        if (isFriendSpendingSummaryReady(summary.data())) applyExpenseSummaryChange(transaction, before, null);
        owned.forEach((row) => transaction.delete(row.ref));
        transaction.delete(expenseRef);
      }
      transaction.delete(recordRef);
    });
  },

  // ===============================================
  // Summary and Analytics
  // ===============================================

  // Get payment summary for a scheduled payment
  async getPaymentSummary(
    userId: string,
    scheduledPayment: ScheduledPayment,
    localRecords?: ScheduledPaymentRecord[],
  ): Promise<ScheduledPaymentSummary> {
    const records = localRecords
      ? localRecords.filter((record) => record.userId === userId && record.scheduledPaymentId === scheduledPayment.id)
        .sort((a, b) => b.paidDate.localeCompare(a.paidDate))
      : await this.getPaymentRecords(userId, scheduledPayment.id!);
    
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

  // Export payment history to CSV format
  exportPaymentHistoryToCSV(
    scheduledPayments: ScheduledPayment[],
    paymentRecords: ScheduledPaymentRecord[]
  ): string {
    const headers = [
      'Payment Name',
      'Category',
      'Type',
      'Currency',
      'Expected Amount',
      'Actual Amount',
      'Difference',
      'Due Date',
      'Paid Date',
      'Payment Method',
      'Note',
    ];

    const rows = paymentRecords.map(record => {
      const payment = scheduledPayments.find(p => p.id === record.scheduledPaymentId);
      const currency = record.currency || payment?.currency || 'MYR';
      const digits = getCurrencyMinorDigits(currency);
      return [
        payment?.name || 'Unknown',
        payment?.category || '',
        payment?.type || '',
        currency,
        record.expectedAmount.toFixed(digits),
        record.actualAmount.toFixed(digits),
        record.difference.toFixed(digits),
        record.dueDate,
        record.paidDate,
        record.paymentMethod || 'cash',
        record.note || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  },

  // Download payment history as CSV file
  downloadPaymentHistoryCSV(
    scheduledPayments: ScheduledPayment[],
    paymentRecords: ScheduledPaymentRecord[],
    filename: string = 'payment-history.csv'
  ): void {
    const csvContent = this.exportPaymentHistoryToCSV(scheduledPayments, paymentRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Get upcoming payments with reminders
  async getUpcomingReminders(userId: string): Promise<ScheduledPayment[]> {
    const activePayments = await this.getActive(userId);
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    return activePayments.filter(payment => {
      if (!payment.enableReminders) return false;
      
      const reminderDays = payment.reminderDaysBefore || 3;
      const dueDay = payment.dueDay;
      
      // Calculate days until due
      let daysUntilDue: number;
      if (dueDay >= currentDay) {
        daysUntilDue = dueDay - currentDay;
      } else {
        // Due date is next month
        daysUntilDue = (daysInMonth - currentDay) + dueDay;
      }
      
      // Show if within reminder window
      return daysUntilDue <= reminderDays && daysUntilDue >= 0;
    });
  },
};
