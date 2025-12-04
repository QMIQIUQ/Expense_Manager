import { Expense, Income, Transfer } from '../types';
import { ewalletService } from './ewalletService';
import { bankService } from './bankService';

/**
 * Balance Service
 * Handles balance updates across payment methods (E-Wallets and Banks)
 * 
 * Balance Update Rules:
 * - Expense created: Deduct balance from source account
 * - Expense deleted: Add back balance to source account
 * - Income created: Add balance to target account
 * - Income deleted: Deduct balance from target account
 * - Transfer created: Deduct from source, Add to target
 * - Transfer deleted: Add back to source, Deduct from target
 * 
 * Payment methods without balance tracking:
 * - cash: No balance tracking
 * - credit_card: Uses cardLimit - spending calculation
 */
export const balanceService = {
  /**
   * Update balance when an expense is created
   * Deducts the expense amount from the payment method
   */
  async handleExpenseCreated(expense: Expense): Promise<void> {
    await this.updateBalanceForExpense(expense, -expense.amount);
  },

  /**
   * Update balance when an expense is deleted
   * Adds back the expense amount to the payment method
   */
  async handleExpenseDeleted(expense: Expense): Promise<void> {
    await this.updateBalanceForExpense(expense, expense.amount);
  },

  /**
   * Update balance when an income is created
   * Adds the income amount to the payment method
   */
  async handleIncomeCreated(income: Income): Promise<void> {
    await this.updateBalanceForIncome(income, income.amount);
  },

  /**
   * Update balance when an income is deleted
   * Deducts the income amount from the payment method
   */
  async handleIncomeDeleted(income: Income): Promise<void> {
    await this.updateBalanceForIncome(income, -income.amount);
  },

  /**
   * Update balances when a transfer is created
   * Deducts from source and adds to destination
   */
  async handleTransferCreated(transfer: Transfer): Promise<void> {
    // Deduct from source
    await this.updateBalanceForTransferSource(transfer, -transfer.amount);
    // Add to destination
    await this.updateBalanceForTransferDestination(transfer, transfer.amount);
  },

  /**
   * Update balances when a transfer is deleted
   * Adds back to source and deducts from destination
   */
  async handleTransferDeleted(transfer: Transfer): Promise<void> {
    // Add back to source
    await this.updateBalanceForTransferSource(transfer, transfer.amount);
    // Deduct from destination
    await this.updateBalanceForTransferDestination(transfer, -transfer.amount);
  },

  /**
   * Helper: Update balance for an expense based on payment method
   */
  async updateBalanceForExpense(expense: Expense, deltaAmount: number): Promise<void> {
    const { paymentMethod, paymentMethodName, bankId, userId } = expense;

    if (!paymentMethod) return;

    try {
      if (paymentMethod === 'e_wallet' && paymentMethodName) {
        // Find e-wallet by name and update balance
        const wallet = await ewalletService.findByName(userId, paymentMethodName);
        if (wallet?.id) {
          await ewalletService.updateBalance(wallet.id, deltaAmount);
        }
      } else if (paymentMethod === 'bank' && bankId) {
        // Update bank balance directly by ID
        await bankService.updateBalance(bankId, deltaAmount);
      }
      // Note: cash and credit_card don't have balance tracking
    } catch (error) {
      console.error('Failed to update balance for expense:', error);
      // Don't throw - balance update failure shouldn't block the main operation
    }
  },

  /**
   * Helper: Update balance for an income based on payment method
   */
  async updateBalanceForIncome(income: Income, deltaAmount: number): Promise<void> {
    const { paymentMethod, paymentMethodName, bankId, userId } = income;

    if (!paymentMethod) return;

    try {
      if (paymentMethod === 'e_wallet' && paymentMethodName) {
        // Find e-wallet by name and update balance
        const wallet = await ewalletService.findByName(userId, paymentMethodName);
        if (wallet?.id) {
          await ewalletService.updateBalance(wallet.id, deltaAmount);
        }
      } else if (paymentMethod === 'bank' && bankId) {
        // Update bank balance directly by ID
        await bankService.updateBalance(bankId, deltaAmount);
      }
      // Note: cash and credit_card don't have balance tracking
    } catch (error) {
      console.error('Failed to update balance for income:', error);
      // Don't throw - balance update failure shouldn't block the main operation
    }
  },

  /**
   * Helper: Update balance for transfer source (from)
   */
  async updateBalanceForTransferSource(transfer: Transfer, deltaAmount: number): Promise<void> {
    const { fromPaymentMethod, fromPaymentMethodName, fromBankId, userId } = transfer;

    try {
      if (fromPaymentMethod === 'e_wallet' && fromPaymentMethodName) {
        const wallet = await ewalletService.findByName(userId, fromPaymentMethodName);
        if (wallet?.id) {
          await ewalletService.updateBalance(wallet.id, deltaAmount);
        }
      } else if (fromPaymentMethod === 'bank' && fromBankId) {
        await bankService.updateBalance(fromBankId, deltaAmount);
      }
      // Note: cash and credit_card don't have balance tracking
    } catch (error) {
      console.error('Failed to update balance for transfer source:', error);
    }
  },

  /**
   * Helper: Update balance for transfer destination (to)
   */
  async updateBalanceForTransferDestination(transfer: Transfer, deltaAmount: number): Promise<void> {
    const { toPaymentMethod, toPaymentMethodName, toBankId, userId } = transfer;

    try {
      if (toPaymentMethod === 'e_wallet' && toPaymentMethodName) {
        const wallet = await ewalletService.findByName(userId, toPaymentMethodName);
        if (wallet?.id) {
          await ewalletService.updateBalance(wallet.id, deltaAmount);
        }
      } else if (toPaymentMethod === 'bank' && toBankId) {
        await bankService.updateBalance(toBankId, deltaAmount);
      }
      // Note: cash and credit_card don't have balance tracking
    } catch (error) {
      console.error('Failed to update balance for transfer destination:', error);
    }
  },
};

export default balanceService;
