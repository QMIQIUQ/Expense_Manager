import React, { useState } from 'react';
import { Expense, Category, Card, EWallet, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import AutocompleteDropdown, { AutocompleteOption } from '../common/AutocompleteDropdown';
import { BaseForm } from '../common/BaseForm';

interface ExpenseFormProps {
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  initialData?: Expense;
  categories: Category[];
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[];
  onCreateEWallet?: () => void;
  onCreateCard?: () => void;
  title?: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  categories,
  cards = [],
  ewallets = [],
  banks = [],
  onCreateEWallet,
  onCreateCard,
  title,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    description: initialData?.description || '',
    amount: initialData?.amount ? Math.round(initialData.amount * 100) : 0,
    category: initialData?.category || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    time: initialData?.time || new Date().toTimeString().slice(0, 5), // Default to current time HH:mm
    notes: initialData?.notes || '',
    cardId: initialData?.cardId || '',
    bankId: initialData?.bankId || '',
    paymentMethod: initialData?.paymentMethod || 'cash',
    paymentMethodName: initialData?.paymentMethodName || '',
    needsRepaymentTracking: initialData?.needsRepaymentTracking || false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.description.trim()) newErrors.description = t('pleaseFillField');
    if (!formData.amount || formData.amount <= 0) newErrors.amount = t('pleaseFillField');
    if (!formData.category) newErrors.category = t('pleaseSelectCategory');
    if (!formData.date) newErrors.date = t('pleaseFillField');
    if (formData.paymentMethod === 'e_wallet' && !formData.paymentMethodName.trim()) {
      newErrors.paymentMethodName = t('pleaseFillField');
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    // Prepare data based on payment method
    // Convert amount from cents to dollars
    const submitData: Partial<typeof formData> = { 
      ...formData,
      amount: formData.amount / 100
    };
    if (formData.paymentMethod === 'cash') {
      // Clear card, e-wallet and bank info for cash
      delete submitData.cardId;
      delete submitData.paymentMethodName;
      delete submitData.bankId;
    } else if (formData.paymentMethod === 'credit_card') {
      // Clear e-wallet and bank info for credit card
      delete submitData.paymentMethodName;
      delete submitData.bankId;
    } else if (formData.paymentMethod === 'e_wallet') {
      // Clear card and bank info for e-wallet
      delete submitData.cardId;
      delete submitData.bankId;
    } else if (formData.paymentMethod === 'bank') {
      // Clear card and e-wallet info for bank
      delete submitData.cardId;
      delete submitData.paymentMethodName;
    }
    
    onSubmit(submitData as Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);
    if (!initialData) {
      setFormData({
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5), // Reset to current time
        notes: '',
        cardId: '',
        bankId: '',
        paymentMethod: 'cash',
        paymentMethodName: '',
        needsRepaymentTracking: false,
      });
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    // Convert to integer (cents)
    const amountInCents = parseInt(digitsOnly) || 0;
    setFormData((prev) => ({
      ...prev,
      amount: amountInCents,
    }));
    // Clear error for this field
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseForm
      title={title || (initialData ? t('editExpense') || 'Edit Expense' : t('addExpense') || 'Add Expense')}
      onSubmit={handleSubmit}
      onCancel={onCancel || (() => {})}
      submitLabel={initialData ? t('update') : t('add')}
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('description')} *</label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder={t('descriptionPlaceholder')}
          className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.description ? 'border-red-500' : ''
          }`}
          style={{
            borderColor: errors.description ? undefined : 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
        />
        {errors.description && <span className="text-xs text-red-600">{errors.description}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('amount')} ($) *</label>
          <input
            type="text"
            inputMode="numeric"
            name="amount"
            value={(formData.amount / 100).toFixed(2)}
            onChange={handleAmountChange}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.amount ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: errors.amount ? undefined : 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.amount && <span className="text-xs text-red-600">{errors.amount}</span>}
        </div>

        <div className="min-w-0">
          <AutocompleteDropdown
            options={categories.map((cat): AutocompleteOption => ({
              id: cat.name,
              label: cat.name,
              icon: cat.icon,
              color: cat.color,
            }))}
            value={formData.category}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, category: value }));
              if (errors.category) {
                setErrors((prev) => ({ ...prev, category: '' }));
              }
            }}
            label={t('category') + ' *'}
            placeholder={t('selectCategory')}
            error={errors.category}
            allowClear={false}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('date')} *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.date ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: errors.date ? undefined : 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.date && <span className="text-xs text-red-600">{errors.date}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('time')}</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('paymentMethod')}</label>
        <select
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
        >
          <option value="cash">💵 {t('cash')}</option>
          <option value="credit_card">💳 {t('creditCard')}</option>
          <option value="e_wallet">📱 {t('eWallet')}</option>
          <option value="bank">🏦 {t('bankTransfer')}</option>
        </select>
      </div>

      {/* Card Selection - Shown when credit card is selected */}
      {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('selectCard')}</label>
          <select
            name="cardId"
            value={formData.cardId}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">{t('selectPaymentMethod')}</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                💳 {card.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Card Creation Prompt - Shown when credit card is selected but no cards available */}
      {formData.paymentMethod === 'credit_card' && cards.length === 0 && (
        <div className="flex flex-col gap-2 p-3 border rounded" style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--input-bg)',
        }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {t('noCardsYet')}
          </p>
          {onCreateCard && (
            <button
              type="button"
              onClick={onCreateCard}
              className="text-sm text-blue-600 hover:underline text-left"
              style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            >
              + {t('addCard')}
            </button>
          )}
        </div>
      )}

      {/* Bank Selection - Shown when bank is selected */}
      {formData.paymentMethod === 'bank' && banks.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('selectBank')}</label>
          <select
            name="bankId"
            value={formData.bankId}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">{t('selectBank')}</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                🏦 {bank.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* E-Wallet Selection - Only shown when e-wallet is selected */}
      {formData.paymentMethod === 'e_wallet' && ewallets.length > 0 && (
        <AutocompleteDropdown
          options={ewallets.map((wallet): AutocompleteOption => ({
            id: wallet.name,
            label: wallet.name,
            icon: wallet.icon,
            subtitle: wallet.provider,
            color: wallet.color,
          }))}
          value={formData.paymentMethodName}
          onChange={(value) => {
            setFormData((prev) => ({ ...prev, paymentMethodName: value }));
            if (errors.paymentMethodName) {
              setErrors((prev) => ({ ...prev, paymentMethodName: '' }));
            }
          }}
          label={t('eWallet')}
          placeholder={t('searchOrSelect')}
          error={errors.paymentMethodName}
          createNewLabel={onCreateEWallet ? t('createNew') + ' ' + t('eWallet') : undefined}
          onCreateNew={onCreateEWallet}
        />
      )}
      
      {/* E-Wallet Name Input - Fallback when no e-wallets available */}
      {formData.paymentMethod === 'e_wallet' && ewallets.length === 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('eWalletName')}</label>
          <input
            type="text"
            name="paymentMethodName"
            value={formData.paymentMethodName}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder={t('eWalletPlaceholder')}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.paymentMethodName ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: errors.paymentMethodName ? undefined : 'var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.paymentMethodName && <span className="text-xs text-red-600">{errors.paymentMethodName}</span>}
          {onCreateEWallet && (
            <button
              type="button"
              onClick={onCreateEWallet}
              className="text-sm text-blue-600 hover:underline mt-1 text-left"
            >
              + {t('addEWallet')}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('notes')} ({t('optional')})</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder={t('notesPlaceholder')}
          rows={3}
          className="px-3 py-2 border rounded resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      <div className="flex items-center gap-2 border-t pt-4">
        <input
          type="checkbox"
          id="needsRepaymentTracking"
          checked={formData.needsRepaymentTracking}
          onChange={(e) => setFormData(prev => ({ ...prev, needsRepaymentTracking: e.target.checked }))}
          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <label htmlFor="needsRepaymentTracking" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--text-primary)' }}>
          {t('trackRepaymentInDashboard')}
        </label>
      </div>

      {/* Footer removed - handled by BaseForm */}
    </BaseForm>
  );
};

export default ExpenseForm;
