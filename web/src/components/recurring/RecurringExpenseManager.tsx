import React, { useState, useEffect } from 'react';
import { RecurringExpense, Category, Card } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '../icons';

// Add responsive styles for action buttons
const responsiveStyles = `
  .desktop-actions {
    display: none;
    gap: 8px;
  }
  .mobile-actions {
    display: block;
  }
  @media (min-width: 640px) {
    .desktop-actions {
      display: flex;
    }
    .mobile-actions {
      display: none;
    }
  }
`;

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest('.mobile-actions')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; recurringId: string | null }>({
    isOpen: false,
    recurringId: null,
  });

  // Get category color from user's category settings
  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category && category.color) {
      // Convert hex color to lighter background and keep text as original color
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 99, g: 102, b: 241 };
      };
      
      const rgb = hexToRgb(category.color);
      // Create a lighter background (add 80% white)
      const bg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
      const text = category.color;
      
      return { background: bg, color: text };
    }
    // Fallback color
    return { background: '#e0e7ff', color: '#4338ca' };
  };
  
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
      <style>{responsiveStyles}</style>
      <div style={styles.header}>
        <h2 style={styles.title}>{t('recurringExpenses')}</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            <PlusIcon size={18} />
            <span>{t('addRecurring')}</span>
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
            <div key={expense.id} style={{ ...styles.expenseCard, ...(openMenuId === expense.id ? { zIndex: 9999 } : {}) }}>
              {editingId === expense.id ? (
                // Inline Edit Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <div style={{ flex: 2, minWidth: '150px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('description')}</label>
                      <input
                        type="text"
                        value={formData.description}
                        placeholder={t('description')}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        onFocus={(e) => e.target.select()}
                        style={{ ...styles.inlineInput, width: '100%' }}
                      />
                    </div>
                    <div style={{ width: '120px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('amount')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        placeholder={t('amount')}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        style={{ ...styles.inlineInput, width: '100%' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <div style={{ minWidth: '120px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('category')}</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        style={{ ...styles.inlineSelect, width: '100%' }}
                      >
                        <option value="">{t('selectCategory')}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ minWidth: '100px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('frequency')}</label>
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' })}
                        style={{ ...styles.inlineSelect, width: '100%' }}
                      >
                        <option value="daily">{t('freqDaily')}</option>
                        <option value="weekly">{t('freqWeekly')}</option>
                        <option value="monthly">{t('freqMonthly')}</option>
                        <option value="yearly">{t('freqYearly')}</option>
                      </select>
                    </div>
                  </div>
                  {/* Payment Method Selection in inline edit */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <div style={{ minWidth: '130px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('paymentMethod')}</label>
                      <select
                        value={formData.paymentMethod || 'cash'}
                        onChange={(e) => {
                          const newPaymentMethod = e.target.value as 'cash' | 'credit_card' | 'e_wallet';
                          setFormData({ 
                            ...formData, 
                            paymentMethod: newPaymentMethod,
                            cardId: newPaymentMethod === 'credit_card' ? formData.cardId : '',
                            paymentMethodName: newPaymentMethod === 'e_wallet' ? formData.paymentMethodName : ''
                          });
                        }}
                        style={{ ...styles.inlineSelect, width: '100%' }}
                      >
                        <option value="cash">💵 {t('cash')}</option>
                        <option value="credit_card">💳 {t('creditCard')}</option>
                        <option value="e_wallet">📱 {t('eWallet')}</option>
                      </select>
                    </div>
                    {formData.paymentMethod === 'credit_card' && (
                      <div style={{ minWidth: '130px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('selectCard')}</label>
                        <select
                          value={formData.cardId || ''}
                          onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                          style={{ ...styles.inlineSelect, width: '100%' }}
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
                    {formData.paymentMethod === 'e_wallet' && (
                      <div style={{ minWidth: '130px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('eWalletNameLabel')}</label>
                        <input
                          type="text"
                          value={formData.paymentMethodName || ''}
                          onChange={(e) => setFormData({ ...formData, paymentMethodName: e.target.value })}
                          placeholder={t('eWalletPlaceholder')}
                          onFocus={(e) => e.target.select()}
                          style={{ ...styles.inlineInput, width: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    <div style={{ minWidth: '130px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{t('startDate')}</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        style={{ ...styles.inlineInput, width: '100%' }}
                      />
                    </div>
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
                      <CheckIcon size={18} />
                    </button>
                    <button onClick={cancelInlineEdit} style={styles.cancelIconButton}>
                      <CloseIcon size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  {/* First row: Payment Icon, Category, Status, Amount */}
                  <div style={styles.expenseRow1}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Payment Method Icon */}
                      {expense.paymentMethod === 'credit_card' && (
                        <span style={{ fontSize: '16px' }}>💳</span>
                      )}
                      {expense.paymentMethod === 'e_wallet' && (
                        <span style={{ fontSize: '16px' }}>📱</span>
                      )}
                      {(!expense.paymentMethod || expense.paymentMethod === 'cash') && (
                        <span style={{ fontSize: '16px' }}>💵</span>
                      )}
                      {/* Category */}
                      <span 
                        className="category-chip"
                        style={{
                          ...styles.category,
                          ...getCategoryColor(expense.category)
                        }}
                      >
                        {expense.category}
                      </span>
                      {/* Active/Inactive Status */}
                      {expense.isActive ? (
                        <span style={styles.activeStatus}>● {t('active')}</span>
                      ) : (
                        <span style={styles.inactiveStatus}>● {t('inactive')}</span>
                      )}
                    </div>
                    <div style={styles.amount}>${expense.amount.toFixed(2)}</div>
                  </div>

                  {/* Second row: Description */}
                  <div style={styles.expenseRow2}>
                    <h4 style={styles.description}>{expense.description}</h4>
                  </div>

                  {/* Third row: Payment Details, Frequency, and Hamburger */}
                  <div style={styles.expenseRow3}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>
                      {expense.paymentMethod === 'credit_card' && (
                        <span>💳 {cards.find(c => c.id === expense.cardId)?.name || t('creditCard')}</span>
                      )}
                      {expense.paymentMethod === 'e_wallet' && (
                        <span>📱 {expense.paymentMethodName || t('eWallet')}</span>
                      )}
                      {(!expense.paymentMethod || expense.paymentMethod === 'cash') && (
                        <span>💵 {t('cash')}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {t(`freq${expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1)}` as keyof typeof import('../../locales/translations').enTranslations)}
                    </div>

                    {/* Desktop: Show individual buttons */}
                    <div className="desktop-actions" style={{ gap: '8px' }}>
                      <button
                        onClick={() => onToggleActive(expense.id!, !expense.isActive)}
                        style={expense.isActive ? styles.pauseBtn : styles.resumeBtn}
                      >
                        {expense.isActive ? t('pause') : t('resume')}
                      </button>
                      <button onClick={() => startInlineEdit(expense)} style={styles.editBtn}>
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, recurringId: expense.id! })}
                        style={styles.deleteBtn}
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>

                    {/* Mobile: Show hamburger menu */}
                    <div className="mobile-actions">
                      <div style={styles.menuContainer}>
                        <button
                          className="menu-item-hover"
                          onClick={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id!)}
                          style={styles.menuButton}
                          aria-label="More"
                        >
                          ⋮
                        </button>
                        {openMenuId === expense.id && (
                          <div style={styles.menu}>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                onToggleActive(expense.id!, !expense.isActive);
                              }}
                            >
                              <span style={styles.menuIcon}>{expense.isActive ? '⏸' : '▶'}</span>
                              {expense.isActive ? t('pause') : t('resume')}
                            </button>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                startInlineEdit(expense);
                              }}
                            >
                              <span style={styles.menuIcon}><EditIcon size={16} /></span>
                              {t('edit')}
                            </button>
                            <button
                              className="menu-item-hover"
                              style={{ ...styles.menuItem, color: 'var(--error-text)' }}
                              onClick={() => {
                                setOpenMenuId(null);
                                setDeleteConfirm({ isOpen: true, recurringId: expense.id! });
                              }}
                            >
                              <span style={styles.menuIcon}><DeleteIcon size={16} /></span>
                              {t('delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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
    fontSize: '24px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
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
    backgroundColor: 'var(--bg-secondary)',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    maxHeight: '70vh',
    overflowY: 'auto' as const,
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
    color: 'var(--text-primary)',
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
    backgroundColor: 'var(--card-bg)',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  submitButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: 'var(--accent-primary)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: 'var(--text-secondary)',
  },
  expenseList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  expenseCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    boxShadow: '0 3px 10px var(--shadow)',
    transition: 'all 0.2s ease',
  },
  expenseRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  expenseRow2: {
    display: 'flex',
    alignItems: 'center',
  },
  expenseRow3: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  description: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  category: {
    padding: '5px 10px',
    background: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600' as const,
    boxShadow: '0 1px 3px var(--shadow)',
  },
  amount: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: 'var(--error-text)',
    whiteSpace: 'nowrap' as const,
  },
  status: {
    fontSize: '12px',
  },
  activeStatus: {
    color: 'var(--success-text)',
    fontSize: '11px',
    fontWeight: '500' as const,
  },
  inactiveStatus: {
    color: 'var(--error-text)',
    fontSize: '11px',
    fontWeight: '500' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  pauseBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--warning-bg)',
    color: 'var(--warning-text)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  resumeBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '8px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: '8px',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContainer: {
    position: 'relative' as const,
  },
  menuButton: {
    padding: '8px 12px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold' as const,
    lineHeight: '1',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 9999,
    minWidth: '160px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
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
    backgroundColor: 'var(--card-bg)',
  },
  saveButton: {
    padding: '8px',
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIconButton: {
    padding: '8px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default RecurringExpenseManager;
