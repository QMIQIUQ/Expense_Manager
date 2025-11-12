import React, { useState } from 'react';
import { RecurringExpense, Category, Card } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';

interface RecurringExpenseManagerProps {
  recurringExpenses: RecurringExpense[];
  categories: Category[];
  cards?: Card[];
  onAdd: (expense: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<RecurringExpense>) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const RecurringExpenseManager: React.FC<RecurringExpenseManagerProps> = ({
  recurringExpenses,
  categories,
  cards = [],
  onAdd,
  onUpdate,
  onDelete,
  onToggleActive,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    dayOfWeek: 1,
    dayOfMonth: 1,
    isActive: true,
    paymentMethod: 'cash' as 'cash' | 'credit_card' | 'e_wallet',
    cardId: '',
    paymentMethodName: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; recurringId: string | null }>({
    isOpen: false,
    recurringId: null,
  });
  
  // Filter recurring expenses by search term
  const filteredRecurringExpenses = recurringExpenses.filter((expense) =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create expense data without undefined values
    const baseData = {
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      frequency: formData.frequency,
      startDate: formData.startDate,
      dayOfWeek: formData.dayOfWeek,
      dayOfMonth: formData.dayOfMonth,
      isActive: formData.isActive,
    };
    
    // Only add optional fields if they have values
    const expenseData: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastGenerated'> & { endDate?: string } = {
      ...baseData,
      ...(formData.endDate ? { endDate: formData.endDate } : {}),
      ...(formData.paymentMethod ? { paymentMethod: formData.paymentMethod } : {}),
      ...(formData.paymentMethod === 'credit_card' && formData.cardId ? { cardId: formData.cardId } : {}),
      ...(formData.paymentMethod === 'e_wallet' && formData.paymentMethodName ? { paymentMethodName: formData.paymentMethodName } : {}),
    };

    onAdd(expenseData);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: 0,
      category: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dayOfWeek: 1,
      dayOfMonth: 1,
      isActive: true,
      paymentMethod: 'cash',
      cardId: '',
      paymentMethodName: '',
    });
  };

  const startInlineEdit = (expense: RecurringExpense) => {
    setEditingId(expense.id!);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      frequency: expense.frequency,
      startDate: expense.startDate,
      endDate: expense.endDate || '',
      dayOfWeek: expense.dayOfWeek || 1,
      dayOfMonth: expense.dayOfMonth || 1,
      isActive: expense.isActive,
      paymentMethod: expense.paymentMethod || 'cash',
      cardId: expense.cardId || '',
      paymentMethodName: expense.paymentMethodName || '',
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const saveInlineEdit = (expense: RecurringExpense) => {
    const updates: Partial<RecurringExpense> = {};
    if (expense.description !== formData.description && formData.description) updates.description = formData.description;
    if (expense.amount !== formData.amount) updates.amount = formData.amount;
    if (expense.category !== formData.category && formData.category) updates.category = formData.category;
    if (expense.frequency !== formData.frequency) updates.frequency = formData.frequency;
    if (expense.startDate !== formData.startDate) updates.startDate = formData.startDate;
    if ((expense.endDate || '') !== formData.endDate) {
      updates.endDate = formData.endDate || undefined;
    }
    if (expense.dayOfWeek !== formData.dayOfWeek) updates.dayOfWeek = formData.dayOfWeek;
    if (expense.dayOfMonth !== formData.dayOfMonth) updates.dayOfMonth = formData.dayOfMonth;
    if (expense.isActive !== formData.isActive) updates.isActive = formData.isActive;
    if ((expense.paymentMethod || 'cash') !== formData.paymentMethod) updates.paymentMethod = formData.paymentMethod;
    if ((expense.cardId || '') !== formData.cardId) {
      updates.cardId = formData.cardId || undefined;
    }
    if ((expense.paymentMethodName || '') !== formData.paymentMethodName) {
      updates.paymentMethodName = formData.paymentMethodName || undefined;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(expense.id!, updates);
    }
    cancelInlineEdit();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t('recurringExpenses')}</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            + {t('addRecurring')}
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('description')} *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onFocus={(e) => e.target.select()}
              placeholder="e.g., Netflix Subscription, Rent"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('amount')} ($) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                onFocus={(e) => e.target.select()}
                step="0.01"
                min="0.01"
                required
                style={styles.input}
              />
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('category')} *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                style={styles.select}
              >
                <option value="">{t('selectCategory')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('frequency')} *</label>
              <select
                value={formData.frequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly',
                  })
                }
                style={styles.select}
              >
                <option value="daily">{t('freqDaily')}</option>
                <option value="weekly">{t('freqWeekly')}</option>
                <option value="monthly">{t('freqMonthly')}</option>
                <option value="yearly">{t('freqYearly')}</option>
              </select>
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('startDate')} *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                style={styles.input}
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('paymentMethod')}</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ 
                ...formData, 
                paymentMethod: e.target.value as 'cash' | 'credit_card' | 'e_wallet',
                cardId: e.target.value !== 'credit_card' ? '' : formData.cardId,
                paymentMethodName: e.target.value !== 'e_wallet' ? '' : formData.paymentMethodName,
              })}
              style={styles.select}
            >
              <option value="cash">💵 {t('cash')}</option>
              <option value="credit_card">💳 {t('creditCard')}</option>
              <option value="e_wallet">📱 {t('eWallet')}</option>
            </select>
          </div>

          {/* Card Selection (only when credit card is selected) */}
          {formData.paymentMethod === 'credit_card' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('selectCard')}</label>
              <select
                value={formData.cardId}
                onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                style={styles.select}
              >
                <option value="">{t('selectCard')}</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* E-Wallet Name Input (only when e-wallet is selected) */}
          {formData.paymentMethod === 'e_wallet' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('eWalletName')}</label>
              <input
                type="text"
                value={formData.paymentMethodName}
                onChange={(e) => setFormData({ ...formData, paymentMethodName: e.target.value })}
                onFocus={(e) => e.target.select()}
                placeholder={t('eWalletPlaceholder')}
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitButton}>
              {editingId ? t('edit') : t('add')} {t('recurringExpense')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                resetForm();
              }}
              style={styles.cancelButton}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder={t('searchByName') || 'Search by name...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={(e) => e.target.select()}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.expenseList}>
        {filteredRecurringExpenses.length === 0 ? (
          <div style={styles.noData}>
            <p>{recurringExpenses.length === 0 ? t('noRecurringYet') : t('noResults') || 'No results found'}</p>
          </div>
        ) : (
          filteredRecurringExpenses.map((expense) => (
            <div key={expense.id} style={styles.expenseCard}>
              {editingId === expense.id ? (
                // Inline Edit Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <input
                      type="text"
                      value={formData.description}
                      placeholder={t('description')}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      onFocus={(e) => e.target.select()}
                      style={{ ...styles.inlineInput, flex: 2, minWidth: '150px' }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      placeholder={t('amount')}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      style={{ ...styles.inlineInput, width: '120px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{ ...styles.inlineSelect, minWidth: '120px' }}
                    >
                      <option value="">{t('selectCategory')}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' })}
                      style={{ ...styles.inlineSelect, minWidth: '100px' }}
                    >
                      <option value="daily">{t('freqDaily')}</option>
                      <option value="weekly">{t('freqWeekly')}</option>
                      <option value="monthly">{t('freqMonthly')}</option>
                      <option value="yearly">{t('freqYearly')}</option>
                    </select>
                  </div>
                  {/* Payment Method Selection in inline edit */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <select
                      value={formData.paymentMethod || 'cash'}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        paymentMethod: e.target.value as any,
                        cardId: e.target.value === 'credit_card' ? formData.cardId : undefined,
                        paymentMethodName: e.target.value === 'e_wallet' ? formData.paymentMethodName : undefined
                      })}
                      style={{ ...styles.inlineSelect, minWidth: '130px' }}
                    >
                      <option value="cash">💵 {t('cash')}</option>
                      <option value="credit_card">💳 {t('creditCard')}</option>
                      <option value="e_wallet">📱 {t('eWallet')}</option>
                    </select>
                    {formData.paymentMethod === 'credit_card' && (
                      <select
                        value={formData.cardId || ''}
                        onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                        style={{ ...styles.inlineSelect, minWidth: '130px' }}
                      >
                        <option value="">{t('selectCard')}</option>
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {formData.paymentMethod === 'e_wallet' && (
                      <input
                        type="text"
                        value={formData.paymentMethodName || ''}
                        onChange={(e) => setFormData({ ...formData, paymentMethodName: e.target.value })}
                        placeholder={t('eWalletPlaceholder')}
                        onFocus={(e) => e.target.select()}
                        style={{ ...styles.inlineInput, minWidth: '130px' }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      style={{ ...styles.inlineInput, minWidth: '130px' }}
                    />
                    <input
                      type="date"
                      value={formData.endDate}
                      placeholder={t('endDate')}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      style={{ ...styles.inlineInput, minWidth: '130px' }}
                    />
                    {formData.frequency === 'weekly' && (
                      <input
                        type="number"
                        min="1"
                        max="7"
                        value={formData.dayOfWeek}
                        onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                        placeholder="Day of Week (1-7)"
                        onFocus={(e) => e.target.select()}
                        style={{ ...styles.inlineInput, width: '80px' }}
                      />
                    )}
                    {formData.frequency === 'monthly' && (
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dayOfMonth}
                        onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                        placeholder="Day of Month (1-31)"
                        onFocus={(e) => e.target.select()}
                        style={{ ...styles.inlineInput, width: '80px' }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => saveInlineEdit(expense)} style={styles.saveButton}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.2l-3.5-3.5L4 14.2 9 19l12-12-1.4-1.4L9 16.2z" fill="#219653"/>
                      </svg>
                    </button>
                    <button onClick={cancelInlineEdit} style={styles.cancelIconButton}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="#555"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div style={styles.expenseMain}>
                    <div style={styles.expenseInfo}>
                      <h4 style={styles.description}>{expense.description}</h4>
                      <span style={styles.category}>{expense.category}</span>
                      <span style={styles.frequency}>{expense.frequency}</span>
                      {/* Display Payment Method */}
                      {expense.paymentMethod && expense.paymentMethod !== 'cash' && (
                        <span style={{ ...styles.category, fontSize: '12px', marginTop: '4px' }}>
                          {expense.paymentMethod === 'credit_card' && (
                            <>💳 {cards.find(c => c.id === expense.cardId)?.name || t('creditCard')}</>
                          )}
                          {expense.paymentMethod === 'e_wallet' && (
                            <>📱 {expense.paymentMethodName || t('eWallet')}</>
                          )}
                        </span>
                      )}
                    </div>
                    <div style={styles.expenseDetails}>
                      <div style={styles.amount}>${expense.amount.toFixed(2)}</div>
                      <div style={styles.status}>
                        {expense.isActive ? (
                          <span style={styles.activeStatus}>● {t('active')}</span>
                        ) : (
                          <span style={styles.inactiveStatus}>● {t('inactive')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={styles.actions}>
                    <button
                      onClick={() => onToggleActive(expense.id!, !expense.isActive)}
                      style={expense.isActive ? styles.pauseBtn : styles.resumeBtn}
                    >
                      {expense.isActive ? t('pause') : t('resume')}
                    </button>
                    <button onClick={() => startInlineEdit(expense)} style={styles.editBtn}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#1976d2"/>
                        <path d="M20.71 7.04a1.004 1.004 0 0 0 0-1.41l-2.34-2.34a1.004 1.004 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#1976d2"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, recurringId: expense.id! })}
                      style={styles.deleteBtn}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 7h12l-1 14H7L6 7z" fill="#f44336"/>
                        <path d="M8 7V5h8v2h3v2H5V7h3z" fill="#f44336"/>
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('deleteRecurringExpense')}
        message={t('confirmDeleteRecurring')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.recurringId) {
            onDelete(deleteConfirm.recurringId);
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, recurringId: null })}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600' as const,
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  form: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  formRow: {
    display: 'flex',
    gap: '15px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#333',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  select: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  submitButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666',
  },
  expenseList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  expenseCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
  },
  expenseMain: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
  },
  expenseInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  description: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '500' as const,
    color: '#333',
  },
  category: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
    width: 'fit-content',
  },
  frequency: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f3e5f5',
    color: '#7b1fa2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
    width: 'fit-content',
    textTransform: 'capitalize' as const,
  },
  expenseDetails: {
    textAlign: 'right' as const,
  },
  amount: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#f44336',
    marginBottom: '4px',
  },
  status: {
    fontSize: '12px',
  },
  activeStatus: {
    color: '#4caf50',
    fontWeight: '500' as const,
  },
  inactiveStatus: {
    color: '#999',
    fontWeight: '500' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  pauseBtn: {
    padding: '8px 16px',
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  resumeBtn: {
    padding: '8px 16px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '8px',
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: '8px',
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineInput: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  inlineSelect: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  saveButton: {
    padding: '8px',
    backgroundColor: 'rgba(33,150,83,0.08)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIconButton: {
    padding: '8px',
    backgroundColor: 'rgba(158,158,158,0.12)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default RecurringExpenseManager;
