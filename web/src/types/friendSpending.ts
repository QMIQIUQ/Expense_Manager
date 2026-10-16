import type { CurrencyCode } from './index';

export type FriendSpendingMode = 'total' | 'categories';
export type FriendSpendingPeriod = 'all' | 'rolling-three-months' | 'current-month' | 'day';

export interface FriendDashboardPreference {
  mode: FriendSpendingMode;
  period: FriendSpendingPeriod;
  selectedDate: string;
}

export interface FriendConnection {
  friendUid: string;
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing' | 'friend';
  shareEnabledByMe: boolean;
  shareEnabledWithMe: boolean;
}

export interface FriendSpendingSummaryRequest {
  friendUid: string;
  startDate?: string;
  endDate?: string;
}

export interface FriendSpendingCurrencyAmount {
  currency: CurrencyCode;
  amount: number;
}

export interface FriendSpendingCategory {
  name: string;
  amounts: FriendSpendingCurrencyAmount[];
}

export interface FriendSpendingSummary {
  totalByCurrency: FriendSpendingCurrencyAmount[];
  categories: FriendSpendingCategory[];
}

\n