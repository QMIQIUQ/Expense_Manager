import { Expense, Income, Transfer } from '../types';
import { ewalletService } from './ewalletService';
import { bankService } from './bankService';
import { convertAmountToCurrency } from './currencyRateService';
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
