import type { CurrencyCode } from './index';
export interface ReconciliationAccount {
  type: 'bank' | 'e_wallet' | 'credit_card'; id: string; name: string; currency: CurrencyCode;
}
export interface ReconciliationMovement {
  key: string; date: string; description: string; deltaMinor: number;
  reviewReason?: 'legacy-unposted-repayment'; reviewAmountMinor?: number; reviewCurrency?: CurrencyCode;
}
export interface AccountReconciliation {
  id: string; userId: string; accountType: ReconciliationAccount['type']; accountId: string;
  accountName: string; currency: CurrencyCode; periodStart: string; periodEnd: string;
  openingBalanceMinor: number; statementClosingMinor: number; calculatedClosingMinor: number;
  sourceFingerprint: string; snapshotReadTime?: string; status: 'draft' | 'complete'; revision: number;
  createdAt?: Date; updatedAt?: Date;
}
export interface ReconciliationMark {
  id: string; userId: string; reconciliationId: string; transactionKey: string; checked: boolean; sourceFingerprint: string;
}
