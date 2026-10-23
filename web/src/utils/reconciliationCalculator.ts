import type { Expense, Income, Repayment, Transfer, BookedAccountMovement } from '../types';
import type { ReconciliationAccount, ReconciliationMovement } from '../types/reconciliation';
import type { FinancialPeriod } from '../services/financialPeriodService';
import { bookedMovementSource } from './bookedMovementSource';
import { getExpenseBaseAmount, getIncomeBaseAmount } from './currencyUtils';
import { requireCurrencyCode, toMinorUnits } from '../domain/money';

export type ReconciliationConvert = (amount: number, from: string, to: string, date: string) => Promise<number>;
const matches = (account: ReconciliationAccount, method?: string, id?: string, name?: string) => account.type === method &&
  (account.type === 'e_wallet' ? account.name === name : account.id === id);
export const calculateReconciliationMovements = async (account: ReconciliationAccount, period: FinancialPeriod, _convert: ReconciliationConvert): Promise<ReconciliationMovement[]> => {
  const movements: ReconciliationMovement[] = [];
  const liability = account.type === 'credit_card' ? -1 : 1;
  type Row = Partial<Transfer> & Partial<Expense> & { amount: number; currency?: string; baseAmount?: number; baseCurrency?: string; date: string; bookedAccountMovements?: BookedAccountMovement[] };
  const booked = (row: Row, role: BookedAccountMovement['role']): number => {
    const source = bookedMovementSource({ ...row,
      method: role === 'from' ? row.fromPaymentMethod : role === 'to' ? row.toPaymentMethod : row.paymentMethod,
      accountId: role === 'from' ? row.fromBankId : role === 'to' ? row.toBankId : row.bankId,
      accountName: role === 'from' ? row.fromPaymentMethodName : role === 'to' ? row.toPaymentMethodName : row.paymentMethodName,
      baseAmount: role === 'expense' ? getExpenseBaseAmount(row as Expense) : role === 'income' ? getIncomeBaseAmount(row as Income) : row.baseAmount,
    });
    const saved = row.bookedAccountMovements?.find((movement) => movement.role === role && movement.accountType === account.type && movement.accountId === account.id && movement.currency === account.currency && movement.source === source);
    if (saved) {
      if (!Number.isSafeInteger(saved.amountMinor) || saved.amountMinor < 0) throw Object.assign(new Error('Invalid booked account amount'), { code: 'incomplete-financial-data' });
      return saved.amountMinor;
    }
    if (requireCurrencyCode(row.currency) === account.currency) return toMinorUnits(row.amount, account.currency);
    if (requireCurrencyCode(row.baseCurrency) === account.currency && Number.isFinite(row.baseAmount)) return toMinorUnits(row.baseAmount!, account.currency);
    throw Object.assign(new Error('The original account-currency amount is unavailable for this legacy record. Review it before reconciliation.'), { code: 'incomplete-financial-data' });
  };
  const add = async (key: string, row: Row, description: string, direction: -1 | 1, role: BookedAccountMovement['role']) => {
    movements.push({ key, date: row.date, description, deltaMinor: liability * direction * booked(row, role) });
  };
  const isAccountRow = (row: Expense | Income | Repayment) => matches(account, row.paymentMethod, row.paymentMethod === 'credit_card' ? row.cardId : row.bankId, row.paymentMethodName);
  for (const expense of period.expenses) if (isAccountRow(expense)) await add(`expense:${expense.id}`, expense, expense.description, -1, 'expense');
  for (const income of period.incomes) {
    if (isAccountRow(income)) await add(`income:${income.id}`, income, income.title || income.note || 'Income', 1, 'income');
  }
  for (const repayment of period.repayments) if (isAccountRow(repayment)) {
    if (repayment.balanceApplied === true) await add(`repayment:${repayment.id}`, repayment, repayment.payerName || repayment.note || 'Repayment', 1, 'income');
    else movements.push({ key: `repayment:${repayment.id}`, date: repayment.date, description: repayment.payerName || repayment.note || 'Repayment', deltaMinor: 0,
      reviewReason: 'legacy-unposted-repayment', reviewAmountMinor: toMinorUnits(repayment.amount, repayment.currency), reviewCurrency: requireCurrencyCode(repayment.currency) });
  }
  for (const transfer of period.transfers) {
    const linkedExpense = transfer.expenseId ? period.expenses.find((row) => row.id === transfer.expenseId) : undefined;
    const duplicatesSource = !transfer.bookedAccountMovements && !linkedExpense?.bookedAccountMovements && linkedExpense && linkedExpense.date === transfer.date && isAccountRow(linkedExpense) &&
      requireCurrencyCode(linkedExpense.currency) === requireCurrencyCode(transfer.currency) &&
      toMinorUnits(linkedExpense.amount, linkedExpense.currency) === toMinorUnits(transfer.amount, transfer.currency);
    if (matches(account, transfer.fromPaymentMethod, transfer.fromPaymentMethod === 'credit_card' ? transfer.fromCardId : transfer.fromBankId, transfer.fromPaymentMethodName) && !duplicatesSource)
      await add(`transfer:${transfer.id}:from`, transfer, transfer.note || 'Transfer', -1, 'from');
    if (matches(account, transfer.toPaymentMethod, transfer.toPaymentMethod === 'credit_card' ? transfer.toCardId : transfer.toBankId, transfer.toPaymentMethodName))
      await add(`transfer:${transfer.id}:to`, { ...transfer, amount: transfer.toAmount ?? transfer.amount, currency: transfer.toCurrency ?? transfer.currency, baseAmount: transfer.toBaseAmount ?? transfer.baseAmount }, transfer.note || 'Transfer', 1, 'to');
  }
  return movements.sort((left, right) => left.date.localeCompare(right.date) || left.key.localeCompare(right.key));
};
export const reconciliationFingerprint = async (account: ReconciliationAccount, period: FinancialPeriod, movements: ReconciliationMovement[]): Promise<string> => {
  const source = JSON.stringify([account, period.range, movements]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
};
