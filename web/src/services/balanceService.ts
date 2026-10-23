import { Expense, Income, Transfer, BookedAccountMovement } from '../types';
import { ewalletService } from './ewalletService';
import { bankService } from './bankService';
import { convertAmountToCurrency } from './currencyRateService';
import { toMinorUnits, fromMinorUnits } from '../domain/money';
import { bookedMovementSource } from '../utils/bookedMovementSource';
import { db } from '../config/firebase';
import { DocumentReference, Transaction, Timestamp, doc, increment } from 'firebase/firestore';
import {
  DEFAULT_BASE_CURRENCY,
  getExpenseBaseAmount,
  getIncomeBaseAmount,
  normalizeCurrencyCode,
} from '../utils/currencyUtils';

const convertForAccount = async (input: {
  delta: number;
  amount: number;
  currency?: string;
  baseAmount?: number;
  baseCurrency?: string;
  accountCurrency?: string;
  date: string;
}): Promise<number> => {
  const target = normalizeCurrencyCode(input.accountCurrency || DEFAULT_BASE_CURRENCY);
  const source = normalizeCurrencyCode(input.currency || DEFAULT_BASE_CURRENCY);
  const base = normalizeCurrencyCode(input.baseCurrency || DEFAULT_BASE_CURRENCY);
  const sign = input.delta < 0 ? -1 : 1;
  let value: number;

  if (target === source) {
    value = input.amount;
  } else if (target === base && Number.isFinite(input.baseAmount)) {
    value = input.baseAmount as number;
  } else if (Number.isFinite(input.baseAmount)) {
    value = await convertAmountToCurrency(input.baseAmount as number, base, target, input.date);
  } else {
    value = await convertAmountToCurrency(input.amount, source, target, input.date);
  }

  if (!Number.isFinite(value)) throw new Error('Account balance conversion is unavailable');
  return sign * Math.abs(value);
};

export type BalanceAdjustmentEvent =
  | { type: 'expense'; expense: Expense; direction: -1 | 1 }
  | { type: 'income'; income: Income; direction: -1 | 1 }
  | { type: 'transfer'; transfer: Transfer; sourceDirection: -1 | 1; destinationDirection: -1 | 1 };

export interface PreparedBalanceAdjustment {
  ref: DocumentReference;
  delta: number;
  userId: string;
  currency: string;
  bookings: Array<BookedAccountMovement & { eventIndex: number }>;
}

/**
 * Prepare bank and wallet balance changes before a Firestore transaction commits.
 * The returned increments can then be written atomically with the related record.
 */
export const prepareBalanceAdjustments = async (
  userId: string,
  events: BalanceAdjustmentEvent[],
): Promise<PreparedBalanceAdjustment[]> => {
  type Movement = {
    role: BookedAccountMovement['role'];
    eventIndex: number;
    booked?: BookedAccountMovement[];
    normalDirection: -1 | 1;
    method: string | undefined;
    accountId?: string;
    accountName?: string;
    direction: -1 | 1;
    amount: number;
    currency?: string;
    baseAmount?: number;
    baseCurrency?: string;
    date: string;
  };

  const movements: Movement[] = [];
  const addExpenseMovement = (expense: Expense, direction: -1 | 1, eventIndex: number) => {
    movements.push({
      role: 'expense', eventIndex, booked: expense.bookedAccountMovements, normalDirection: -1,
      method: expense.paymentMethod,
      accountId: expense.bankId,
      accountName: expense.paymentMethodName,
      direction,
      amount: expense.amount,
      currency: expense.currency,
      baseAmount: getExpenseBaseAmount(expense),
      baseCurrency: expense.baseCurrency,
      date: expense.date,
    });
  };
  const addIncomeMovement = (income: Income, direction: -1 | 1, eventIndex: number) => {
    movements.push({
      role: 'income', eventIndex, booked: income.bookedAccountMovements, normalDirection: 1,
      method: income.paymentMethod,
      accountId: income.bankId,
      accountName: income.paymentMethodName,
      direction,
      amount: income.amount,
      currency: income.currency,
      baseAmount: getIncomeBaseAmount(income),
      baseCurrency: income.baseCurrency,
      date: income.date,
    });
  };
  const addTransferMovement = (transfer: Transfer, sourceDirection: -1 | 1, destinationDirection: -1 | 1, eventIndex: number) => {
    movements.push({
      role: 'from', eventIndex, booked: transfer.bookedAccountMovements, normalDirection: -1,
      method: transfer.fromPaymentMethod,
      accountId: transfer.fromBankId,
      accountName: transfer.fromPaymentMethodName,
      direction: sourceDirection,
      amount: transfer.amount,
      currency: transfer.currency,
      baseAmount: transfer.baseAmount,
      baseCurrency: transfer.baseCurrency,
      date: transfer.date,
    });
    movements.push({
      role: 'to', eventIndex, booked: transfer.bookedAccountMovements, normalDirection: 1,
      method: transfer.toPaymentMethod,
      accountId: transfer.toBankId,
      accountName: transfer.toPaymentMethodName,
      direction: destinationDirection,
      amount: transfer.toAmount ?? transfer.amount,
      currency: transfer.toCurrency || transfer.currency,
      baseAmount: transfer.toBaseAmount ?? transfer.baseAmount,
      baseCurrency: transfer.baseCurrency,
      date: transfer.date,
    });
  };

  events.forEach((event, eventIndex) => {
    if (event.type === 'expense') addExpenseMovement(event.expense, event.direction, eventIndex);
    else if (event.type === 'income') addIncomeMovement(event.income, event.direction, eventIndex);
    else addTransferMovement(event.transfer, event.sourceDirection, event.destinationDirection, eventIndex);
  });

  const targetCache = new Map<string, Promise<{ ref: DocumentReference; currency?: string } | null>>();
  const getTarget = (movement: Movement): Promise<{ ref: DocumentReference; currency?: string } | null> => {
    if (movement.method === 'bank') {
      if (!movement.accountId) throw new Error('Bank account is required for this balance adjustment');
      const key = `bank:${movement.accountId}`;
      if (!targetCache.has(key)) {
        targetCache.set(key, bankService.getById(movement.accountId).then((bank) => {
          if (!bank || bank.userId !== userId) throw new Error(`Bank account ${movement.accountId} is unavailable`);
          return { ref: doc(db, 'banks', movement.accountId!), currency: bank.currency };
        }));
      }
      return targetCache.get(key)!;
    }
    if (movement.method === 'e_wallet') {
      if (!movement.accountName) throw new Error('E-wallet is required for this balance adjustment');
      const key = `ewallet:${movement.accountName}`;
      if (!targetCache.has(key)) {
        targetCache.set(key, ewalletService.findByName(userId, movement.accountName).then((wallet) => {
          if (!wallet?.id || wallet.userId !== userId) throw new Error(`E-wallet ${movement.accountName} is unavailable`);
          return { ref: doc(db, 'ewallets', wallet.id), currency: wallet.currency };
        }));
      }
      return targetCache.get(key)!;
    }
    return Promise.resolve(null);
  };

  const prepared = await Promise.all(movements.map(async (movement) => {
    const target = await getTarget(movement);
    if (!target) return null;
    const currency = normalizeCurrencyCode(target.currency || DEFAULT_BASE_CURRENCY);
    const source = bookedMovementSource(movement);
    const booked = movement.booked?.find((row) => row.role === movement.role && row.accountId === target.ref.id && row.accountType === movement.method && row.currency === currency && row.source === source);
    if (booked && (!Number.isSafeInteger(booked.amountMinor) || booked.amountMinor < 0)) throw new Error('Invalid booked account movement');
    if (!booked && movement.direction !== movement.normalDirection && currency !== normalizeCurrencyCode(movement.currency || 'MYR') &&
      !(currency === normalizeCurrencyCode(movement.baseCurrency || 'MYR') && Number.isFinite(movement.baseAmount)))
      throw Object.assign(new Error('The original account-currency movement is unknown; review this legacy transaction first'), { code: 'failed-precondition' });
    const rawDelta = booked ? movement.direction * fromMinorUnits(booked.amountMinor, currency) : await convertForAccount({
      delta: movement.direction,
      amount: movement.amount,
      currency: movement.currency,
      baseAmount: movement.baseAmount,
      baseCurrency: movement.baseCurrency,
      accountCurrency: target.currency,
      date: movement.date,
    });
    const delta = movement.direction * fromMinorUnits(toMinorUnits(Math.abs(rawDelta), currency), currency);
    return {
      ref: target.ref,
      delta,
      userId,
      currency,
      bookings: [{ role: movement.role, eventIndex: movement.eventIndex, accountType: movement.method as 'bank' | 'e_wallet', accountId: target.ref.id, currency, amountMinor: toMinorUnits(Math.abs(delta), currency), source }],
    };
  }));

  const aggregated = new Map<string, PreparedBalanceAdjustment>();
  prepared.forEach((adjustment) => {
    if (!adjustment) return;
    const key = adjustment.ref.path;
    const existing = aggregated.get(key);
    if (existing) { existing.delta += adjustment.delta; existing.bookings.push(...adjustment.bookings); }
    else aggregated.set(key, adjustment);
  });
  return [...aggregated.values()];
};

export const bookedAccountMovements = (adjustments: PreparedBalanceAdjustment[], eventIndex = 0): BookedAccountMovement[] =>
  adjustments.flatMap((row) => (row.bookings ?? []).filter((booking) => booking.eventIndex === eventIndex).map(({ eventIndex: _eventIndex, ...booking }) => booking));

export const applyBalanceAdjustmentsInTransaction = async (
  transaction: Transaction,
  adjustments: PreparedBalanceAdjustment[],
): Promise<void> => {
  const accountSnapshots = await Promise.all(adjustments.map(({ ref }) => transaction.get(ref)));
  adjustments.forEach(({ ref, userId, currency }, index) => {
    const account = accountSnapshots[index];
    if (!account.exists() || account.data().userId !== userId) {
      throw new Error(`Account ${ref.id} is no longer available for this balance adjustment`);
    }
    if (normalizeCurrencyCode(account.data().currency || DEFAULT_BASE_CURRENCY) !== currency) {
      throw new Error(`Account ${ref.id} currency changed while preparing this balance adjustment`);
    }
  });
  adjustments.forEach(({ ref, delta }) => {
    transaction.update(ref, { balance: increment(delta), updatedAt: Timestamp.now() });
  });
};

/** Keep bank and wallet balances in their own currency. */
export const balanceService = {
  async handleExpenseCreated(expense: Expense): Promise<void> {
    await this.updateBalanceForExpense(expense, -getExpenseBaseAmount(expense));
  },

  async handleExpenseDeleted(expense: Expense): Promise<void> {
    await this.updateBalanceForExpense(expense, getExpenseBaseAmount(expense));
  },

  async handleIncomeCreated(income: Income): Promise<void> {
    await this.updateBalanceForIncome(income, getIncomeBaseAmount(income));
  },

  async handleIncomeDeleted(income: Income): Promise<void> {
    await this.updateBalanceForIncome(income, -getIncomeBaseAmount(income));
  },

  async handleTransferCreated(transfer: Transfer): Promise<void> {
    await this.updateBalanceForTransferSource(transfer, -transfer.amount);
    await this.updateBalanceForTransferDestination(transfer, transfer.toAmount ?? transfer.amount);
  },

  async handleTransferDeleted(transfer: Transfer): Promise<void> {
    await this.updateBalanceForTransferSource(transfer, transfer.amount);
    await this.updateBalanceForTransferDestination(transfer, -(transfer.toAmount ?? transfer.amount));
  },

  async updateBalanceForExpense(expense: Expense, deltaAmount: number): Promise<void> {
    const { paymentMethod, paymentMethodName, bankId, userId } = expense;
    if (!paymentMethod) return;
    try {
      if (paymentMethod === 'e_wallet' && paymentMethodName) {
        const wallet = await ewalletService.findByName(userId, paymentMethodName);
        if (wallet?.id) {
          const delta = await convertForAccount({
            delta: deltaAmount, amount: expense.amount, currency: expense.currency,
            baseAmount: getExpenseBaseAmount(expense), baseCurrency: expense.baseCurrency,
            accountCurrency: wallet.currency, date: expense.date,
          });
          await ewalletService.updateBalance(wallet.id, delta);
        }
      } else if (paymentMethod === 'bank' && bankId) {
        const bank = await bankService.getById(bankId);
        if (bank) {
          const delta = await convertForAccount({
            delta: deltaAmount, amount: expense.amount, currency: expense.currency,
            baseAmount: getExpenseBaseAmount(expense), baseCurrency: expense.baseCurrency,
            accountCurrency: bank.currency, date: expense.date,
          });
          await bankService.updateBalance(bankId, delta);
        }
      }
    } catch (error) {
      console.error('Failed to update balance for expense:', error);
    }
  },

  async updateBalanceForIncome(income: Income, deltaAmount: number): Promise<void> {
    const { paymentMethod, paymentMethodName, bankId, userId } = income;
    if (!paymentMethod) return;
    try {
      if (paymentMethod === 'e_wallet' && paymentMethodName) {
        const wallet = await ewalletService.findByName(userId, paymentMethodName);
        if (wallet?.id) {
          const delta = await convertForAccount({
            delta: deltaAmount, amount: income.amount, currency: income.currency,
            baseAmount: getIncomeBaseAmount(income), baseCurrency: income.baseCurrency,
            accountCurrency: wallet.currency, date: income.date,
          });
          await ewalletService.updateBalance(wallet.id, delta);
        }
      } else if (paymentMethod === 'bank' && bankId) {
        const bank = await bankService.getById(bankId);
        if (bank) {
          const delta = await convertForAccount({
            delta: deltaAmount, amount: income.amount, currency: income.currency,
            baseAmount: getIncomeBaseAmount(income), baseCurrency: income.baseCurrency,
            accountCurrency: bank.currency, date: income.date,
          });
          await bankService.updateBalance(bankId, delta);
        }
      }
    } catch (error) {
      console.error('Failed to update balance for income:', error);
    }
  },

  async updateBalanceForTransferSource(transfer: Transfer, deltaAmount: number): Promise<void> {
    const { fromPaymentMethod, fromPaymentMethodName, fromBankId, userId } = transfer;
    try {
      if (fromPaymentMethod === 'e_wallet' && fromPaymentMethodName) {
        const wallet = await ewalletService.findByName(userId, fromPaymentMethodName);
        if (wallet?.id) {
          const delta = await convertForAccount({
            delta: deltaAmount, amount: transfer.amount, currency: transfer.currency,
            baseAmount: transfer.baseAmount, baseCurrency: transfer.baseCurrency,
            accountCurrency: wallet.currency, date: transfer.date,
          });
          await ewalletService.updateBalance(wallet.id, delta);
        }
      } else if (fromPaymentMethod === 'bank' && fromBankId) {
        const bank = await bankService.getById(fromBankId);
        if (bank) {
          const delta = await convertForAccount({
            delta: deltaAmount, amount: transfer.amount, currency: transfer.currency,
            baseAmount: transfer.baseAmount, baseCurrency: transfer.baseCurrency,
            accountCurrency: bank.currency, date: transfer.date,
          });
          await bankService.updateBalance(fromBankId, delta);
        }
      }
    } catch (error) {
      console.error('Failed to update balance for transfer source:', error);
    }
  },

  async updateBalanceForTransferDestination(transfer: Transfer, deltaAmount: number): Promise<void> {
    const { toPaymentMethod, toPaymentMethodName, toBankId, userId } = transfer;
    const amount = transfer.toAmount ?? transfer.amount;
    const currency = transfer.toCurrency || transfer.currency;
    try {
      if (toPaymentMethod === 'e_wallet' && toPaymentMethodName) {
        const wallet = await ewalletService.findByName(userId, toPaymentMethodName);
        if (wallet?.id) {
          const delta = await convertForAccount({
            delta: deltaAmount, amount, currency, baseAmount: transfer.toBaseAmount ?? transfer.baseAmount,
            baseCurrency: transfer.baseCurrency, accountCurrency: wallet.currency, date: transfer.date,
          });
          await ewalletService.updateBalance(wallet.id, delta);
        }
      } else if (toPaymentMethod === 'bank' && toBankId) {
        const bank = await bankService.getById(toBankId);
        if (bank) {
          const delta = await convertForAccount({
            delta: deltaAmount, amount, currency, baseAmount: transfer.toBaseAmount ?? transfer.baseAmount,
            baseCurrency: transfer.baseCurrency, accountCurrency: bank.currency, date: transfer.date,
          });
          await bankService.updateBalance(toBankId, delta);
        }
      }
    } catch (error) {
      console.error('Failed to update balance for transfer destination:', error);
    }
  },
};

export default balanceService;
