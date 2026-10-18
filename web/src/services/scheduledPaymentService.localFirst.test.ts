import { describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';
import { scheduledPaymentService } from './scheduledPaymentService';
import type { ScheduledPayment, ScheduledPaymentRecord } from '../types';

describe('scheduled payment summaries use the visible local records', () => {
  it('includes an unconfirmed payment without awaiting another server query', async () => {
    vi.mocked(getDocs).mockClear();
    const payment = { id: 'plan', type: 'installment', totalInstallments: 3, totalAmount: 150, isActive: false } as ScheduledPayment;
    const records = [
      { id: 'pending', userId: 'user', scheduledPaymentId: 'plan', actualAmount: 50, expectedAmount: 50, paidDate: '2026-10-18' },
      { id: 'foreign', userId: 'other', scheduledPaymentId: 'plan', actualAmount: 200, expectedAmount: 200, paidDate: '2026-10-18' },
    ] as ScheduledPaymentRecord[];
    expect(await scheduledPaymentService.getPaymentSummary('user', payment, records)).toMatchObject({
      paymentCount: 1, totalPaid: 50, remainingAmount: 100, remainingPayments: 2,
    });
    expect(getDocs).not.toHaveBeenCalled();
  });
});
