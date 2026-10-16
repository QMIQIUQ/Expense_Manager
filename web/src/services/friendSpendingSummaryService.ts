import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type Transaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CurrencyCode, Expense } from '../types';
import type {
  FriendSpendingCategory,
  FriendSpendingSummary,
  FriendSpendingSummaryRequest,
} from '../types/friendSpending';

export const FRIEND_SPENDING_SUMMARIES = 'friendSpendingSummaries';
export const FRIEND_SPENDING_SUMMARY_STATES = 'friendSpendingSummaryStates';
export const FRIEND_SPENDING_SUMMARY_VERSION = 1;

const DAILY_BUCKETS_SUBCOLLECTION = 'dailyBuckets';
const VALID_CURRENCIES = new Set<CurrencyCode>(['MYR', 'USD', 'TWD', 'SGD', 'CNY', 'EUR', 'GBP', 'JPY']);

interface SpendingBucket {
  id: string;
  date: string;
  category: string;
  currency: CurrencyCode;
  amount: number;
}

const roundToTwoDigits = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

const normalizeExpenseToBucket = (expense: Partial<Expense>): SpendingBucket | null => {
  const date = typeof expense.date === 'string' ? expense.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const hasBaseAmount = typeof expense.baseAmount === 'number' && Number.isFinite(expense.baseAmount);
  const amount = hasBaseAmount ? expense.baseAmount : expense.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;

  const rawCurrency = hasBaseAmount ? expense.baseCurrency : expense.currency;
  const currency = VALID_CURRENCIES.has(rawCurrency as CurrencyCode)
    ? rawCurrency as CurrencyCode
    : 'MYR';
  const category = typeof expense.category === 'string' && expense.category.trim()
    ? expense.category.trim().slice(0, 80)
    : 'Uncategorized';

  return {
    id: [date, currency, encodeURIComponent(category)].join('__'),
    date,
    category,
    currency,
    amount: roundToTwoDigits(amount),
  };
};

export const friendSpendingSummaryStateRef = (userId: string) =>
  doc(db, FRIEND_SPENDING_SUMMARY_STATES, userId);

export const isFriendSpendingSummaryReady = (data?: DocumentData): boolean =>
  data?.ready === true && data?.version === FRIEND_SPENDING_SUMMARY_VERSION;

export const applyExpenseSummaryChange = (
  transaction: Transaction,
  previousExpense: Expense | null,
  nextExpense: Expense | null,
): void => {
  const previousBucket = previousExpense ? normalizeExpenseToBucket(previousExpense) : null;
  const nextBucket = nextExpense ? normalizeExpenseToBucket(nextExpense) : null;
  const changes = new Map<string, { userId: string; bucket: SpendingBucket; amount: number }>();

  if (
    previousBucket && nextBucket &&
    previousBucket.id === nextBucket.id &&
    previousExpense?.userId === nextExpense?.userId
  ) {
    const difference = roundToTwoDigits(nextBucket.amount - previousBucket.amount);
    if (difference !== 0 && nextExpense?.userId) {
      changes.set(previousBucket.id, {
        userId: nextExpense.userId,
        bucket: nextBucket,
        amount: difference,
      });
    }
  } else {
    if (previousBucket && previousExpense?.userId) {
      changes.set(previousBucket.id, {
        userId: previousExpense.userId,
        bucket: previousBucket,
        amount: -previousBucket.amount,
      });
    }
    if (nextBucket && nextExpense?.userId) {
      const existing = changes.get(nextBucket.id);
      changes.set(nextBucket.id, {
        userId: nextExpense.userId,
        bucket: nextBucket,
        amount: roundToTwoDigits((existing?.amount || 0) + nextBucket.amount),
      });
    }
  }

  changes.forEach(({ userId, bucket, amount }) => {
    if (amount === 0) return;
    const bucketRef = doc(db, FRIEND_SPENDING_SUMMARIES, userId, DAILY_BUCKETS_SUBCOLLECTION, bucket.id);
    transaction.set(bucketRef, {
      date: bucket.date,
      category: bucket.category,
      currency: bucket.currency,
      amount: increment(amount),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
};

export const rebuildFriendSpendingSummary = async (
  userId: string,
  expenses: Expense[],
): Promise<void> => {
  const buckets = new Map<string, SpendingBucket>();
  expenses.forEach((expense) => {
    if (expense.userId !== userId) return;
    const bucket = normalizeExpenseToBucket(expense);
    if (!bucket) return;
    const existing = buckets.get(bucket.id);
    buckets.set(bucket.id, {
      ...bucket,
      amount: roundToTwoDigits((existing?.amount || 0) + bucket.amount),
    });
  });

  const entries = [...buckets.values()].filter((bucket) => bucket.amount !== 0);
  for (let offset = 0; offset < entries.length; offset += 450) {
    const batch = writeBatch(db);
    entries.slice(offset, offset + 450).forEach((bucket) => {
      const bucketRef = doc(db, FRIEND_SPENDING_SUMMARIES, userId, DAILY_BUCKETS_SUBCOLLECTION, bucket.id);
      batch.set(bucketRef, {
        date: bucket.date,
        category: bucket.category,
        currency: bucket.currency,
        amount: bucket.amount,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  await setDoc(friendSpendingSummaryStateRef(userId), {
    version: FRIEND_SPENDING_SUMMARY_VERSION,
    ready: true,
    updatedAt: serverTimestamp(),
  });
};

const toSummary = (documents: DocumentData[]): FriendSpendingSummary => {
  const totalsByCurrency = new Map<CurrencyCode, number>();
  const categoriesByName = new Map<string, Map<CurrencyCode, number>>();

  documents.forEach((data) => {
    if (typeof data.amount !== 'number' || !Number.isFinite(data.amount) || data.amount === 0) return;
    const currency = VALID_CURRENCIES.has(data.currency as CurrencyCode)
      ? data.currency as CurrencyCode
      : 'MYR';
    const categoryName = typeof data.category === 'string' && data.category.trim()
      ? data.category.trim()
      : 'Uncategorized';

    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) || 0) + data.amount);
    const categoryTotals = categoriesByName.get(categoryName) || new Map<CurrencyCode, number>();
    categoryTotals.set(currency, (categoryTotals.get(currency) || 0) + data.amount);
    categoriesByName.set(categoryName, categoryTotals);
  });

  const totalByCurrency = [...totalsByCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount: roundToTwoDigits(amount) }))
    .filter(({ amount }) => amount !== 0)
    .sort((left, right) => left.currency.localeCompare(right.currency));
  const categories: FriendSpendingCategory[] = [...categoriesByName.entries()]
    .map(([name, amounts]) => ({
      name,
      amounts: [...amounts.entries()]
        .map(([currency, amount]) => ({ currency, amount: roundToTwoDigits(amount) }))
        .filter(({ amount }) => amount !== 0)
        .sort((left, right) => left.currency.localeCompare(right.currency)),
    }))
    .filter((category) => category.amounts.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name));

  return { totalByCurrency, categories };
};

export const listenFriendSpendingSummary = (
  input: FriendSpendingSummaryRequest,
  onValue: (summary: FriendSpendingSummary) => void,
  onError: (error: Error) => void,
) => {
  const constraints: QueryConstraint[] = [];
  if (input.startDate) constraints.push(where('date', '>=', input.startDate));
  if (input.endDate) constraints.push(where('date', '<=', input.endDate));
  const summaryQuery = query(
    collection(db, FRIEND_SPENDING_SUMMARIES, input.friendUid, DAILY_BUCKETS_SUBCOLLECTION),
    ...constraints,
  );

  return onSnapshot(summaryQuery, (snapshot) => {
    onValue(toSummary(snapshot.docs.map((document) => document.data())));
  }, onError);
};
