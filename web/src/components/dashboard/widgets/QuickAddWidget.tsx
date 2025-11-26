import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { WidgetProps } from './types';
import { QuickExpensePreset, QuickExpensePresetInput, DEFAULT_QUICK_EXPENSE_ICONS } from '../../../types/quickExpense';
import { quickExpenseService } from '../../../services/quickExpenseService';
import { PlusIcon, EditIcon, DeleteIcon } from '../../icons';

const QuickAddWidget: React.FC<WidgetProps> = ({
  categories,
  cards,
  ewallets,
  banks,
  quickExpensePresets = [],
  onQuickExpenseAdd,
  onQuickExpensePresetsChange,
  onQuickAdd,
}) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { showNotification, updateNotification } = useNotification();
  const [localPresets, setLocalPresets] = useState<QuickExpensePreset[]>(quickExpensePresets);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<QuickExpensePresetInput>({
    name: '',
    amount: 0,
    categoryId: '',
    description: '',
    paymentMethod: 'cash',
    icon: '💰',
  });

  // Sync local presets with props
  useEffect(() => {
    setLocalPresets(quickExpensePresets);
  }, [quickExpensePresets]);

  // Focus on name input when adding new preset
  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAdding]);

  const resetForm = () => {
    setFormData({
      name: '',
      amount: 0,
      categoryId: '',
      description: '',
      paymentMethod: 'cash',
      icon: '💰',
    });
    setIsAdding(false);
    setEditingPresetId(null);
    setShowIconPicker(false);
  };

  const handleQuickExpenseClick = async (preset: QuickExpensePreset) => {
    if (!onQuickExpenseAdd || isLoading) return;
    
    setIsLoading(preset.id);
    try {
      await onQuickExpenseAdd(preset);
    } catch (error) {
      console.error('Failed to add quick expense:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleSavePreset = async () => {
    if (!currentUser || !formData.name || !formData.categoryId || formData.amount <= 0) return;

    const cleanedData: QuickExpensePresetInput = {
      name: formData.name,
      amount: formData.amount,
      categoryId: formData.categoryId,
      paymentMethod: formData.paymentMethod,
      icon: formData.icon,
    };
    
    if (formData.description) cleanedData.description = formData.description;
    if (formData.cardId) cleanedData.cardId = formData.cardId;
    if (formData.ewalletId) cleanedData.ewalletId = formData.ewalletId;
    if (formData.bankId) cleanedData.bankId = formData.bankId;

    const isEditing = !!editingPresetId;
    const tempId = `temp-${Date.now()}`;
    const maxOrder = localPresets.length > 0 ? Math.max(...localPresets.map(p => p.order)) : -1;
    
    // Create optimistic preset
    const optimisticPreset: QuickExpensePreset = {
      id: isEditing ? editingPresetId : tempId,
      userId: currentUser.uid,
      ...cleanedData,
      order: isEditing ? (localPresets.find(p => p.id === editingPresetId)?.order ?? maxOrder + 1) : maxOrder + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Optimistic update
    if (isEditing) {
      // Update existing preset in local state
      setLocalPresets(prev => prev.map(p => p.id === editingPresetId ? optimisticPreset : p));
    } else {
      // Add new preset to local state
      setLocalPresets(prev => [...prev, optimisticPreset]);
    }

    // 2. Show pending notification
    const notificationId = showNotification('pending', t('saving'), { duration: 0 });

    // 3. Reset form immediately for better UX
    resetForm();

    try {
      if (isEditing) {
        await quickExpenseService.update(editingPresetId, cleanedData);
        // 4. Update notification to success
        updateNotification(notificationId, {
          type: 'success',
          message: t('updateSuccess'),
          duration: 3000,
        });
      } else {
        const newPreset = await quickExpenseService.create(currentUser.uid, cleanedData);
        // Replace temp preset with real preset
        setLocalPresets(prev => prev.map(p => p.id === tempId ? newPreset : p));
        // 4. Update notification to success
        updateNotification(notificationId, {
          type: 'success',
          message: t('createSuccess'),
          duration: 3000,
        });
      }
      // Notify parent to sync
      onQuickExpensePresetsChange?.();
    } catch (error) {
      console.error('Failed to save preset:', error);
      // 5. Rollback on error
      if (isEditing) {
        // Restore original preset (sync from parent on next render)
        setLocalPresets(quickExpensePresets);
      } else {
        // Remove temp preset
        setLocalPresets(prev => prev.filter(p => p.id !== tempId));
      }
      // Update notification to error
      updateNotification(notificationId, {
        type: 'error',
        message: t('errorSavingData'),
        duration: 5000,
      });
    }
  };

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 1. Save original preset for rollback
    const deletedPreset = localPresets.find(p => p.id === presetId);
    
    // 2. Optimistic delete
    setLocalPresets(prev => prev.filter(p => p.id !== presetId));
    
    // 3. Show pending notification
    const notificationId = showNotification('pending', t('deleting'), { duration: 0 });

    try {
      await quickExpenseService.delete(presetId);
      // 4. Update notification to success
      updateNotification(notificationId, {
        type: 'success',
        message: t('deleteSuccess'),
        duration: 3000,
      });
      onQuickExpensePresetsChange?.();
    } catch (error) {
      console.error('Failed to delete preset:', error);
      // 5. Rollback on error
      if (deletedPreset) {
        setLocalPresets(prev => [...prev, deletedPreset]);
      }
      // Update notification to error
      updateNotification(notificationId, {
        type: 'error',
        message: t('errorDeletingData'),
        duration: 5000,
      });
    }
  };

  const handleEditPreset = (preset: QuickExpensePreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetId(preset.id);
    setFormData({
      name: preset.name,
      amount: preset.amount,
      categoryId: preset.categoryId,
      description: preset.description || '',
      paymentMethod: preset.paymentMethod || 'cash',
      cardId: preset.cardId,
      ewalletId: preset.ewalletId,
      bankId: preset.bankId,
      icon: preset.icon || '💰',
    });
    setIsAdding(true);
  };

  const handleStartAdding = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      resetForm();
    } else if (e.key === 'Enter' && formData.name && formData.categoryId && formData.amount > 0) {
      handleSavePreset();
    }
  };

  // Inline edit form
  const renderInlineForm = () => (
    <div className="quick-expense-inline-form" onKeyDown={handleKeyDown}>
      <div className="inline-form-row">
        {/* Icon picker */}
        <div className="inline-icon-picker">
          <button 
            type="button"
            className="icon-picker-trigger"
            onClick={() => setShowIconPicker(!showIconPicker)}
          >
            {formData.icon}
          </button>
          {showIconPicker && (
            <div className="icon-picker-dropdown">
              {DEFAULT_QUICK_EXPENSE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-option-small ${formData.icon === icon ? 'selected' : ''}`}
                  onClick={() => {
                    setFormData({ ...formData, icon });
                    setShowIconPicker(false);
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Name input */}
        <input
          ref={nameInputRef}
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('quickExpenseNamePlaceholder')}
          className="inline-input inline-input-name"
        />

        {/* Amount input */}
        <div className="inline-amount-wrapper">
          <span className="currency-symbol">$</span>
          <input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            className="inline-input inline-input-amount"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="inline-form-row">
        {/* Category */}
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          className="inline-select"
        >
          <option value="">{t('selectCategory')}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>

        {/* Payment Method */}
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ 
            ...formData, 
            paymentMethod: e.target.value as 'cash' | 'credit_card' | 'e_wallet' | 'bank',
            cardId: undefined,
            ewalletId: undefined,
            bankId: undefined,
          })}
          className="inline-select"
        >
          <option value="cash">{t('cash')}</option>
          <option value="credit_card">{t('creditCard')}</option>
          <option value="e_wallet">{t('eWallet')}</option>
          <option value="bank">{t('bankAccount')}</option>
        </select>

        {/* Sub-payment selector */}
        {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
          <select
            value={formData.cardId || ''}
            onChange={(e) => setFormData({ ...formData, cardId: e.target.value || undefined })}
            className="inline-select"
          >
            <option value="">{t('selectCard')}</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>{card.name}</option>
            ))}
          </select>
        )}

        {formData.paymentMethod === 'e_wallet' && ewallets.length > 0 && (
          <select
            value={formData.ewalletId || ''}
            onChange={(e) => setFormData({ ...formData, ewalletId: e.target.value || undefined })}
            className="inline-select"
          >
            <option value="">{t('selectEWallet')}</option>
            {ewallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
            ))}
          </select>
        )}

        {formData.paymentMethod === 'bank' && banks.length > 0 && (
          <select
            value={formData.bankId || ''}
            onChange={(e) => setFormData({ ...formData, bankId: e.target.value || undefined })}
            className="inline-select"
          >
            <option value="">{t('selectBank')}</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>{bank.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="inline-form-actions">
        <button 
          onClick={handleSavePreset} 
          className="inline-btn inline-btn-save"
          disabled={!formData.name || !formData.categoryId || formData.amount <= 0}
        >
          {editingPresetId ? t('confirmEdit') : t('save')}
        </button>
        <button 
          onClick={resetForm} 
          className="inline-btn inline-btn-cancel"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="quick-expense-widget">
      {/* Quick expense buttons grid */}
      <div className="quick-expense-grid">
        {localPresets.map((preset) => {
          const category = categories.find((c) => c.id === preset.categoryId);
          return (
            <div key={preset.id} className="quick-expense-item">
              <button
                className={`quick-expense-btn ${isLoading === preset.id ? 'loading' : ''}`}
                onClick={() => handleQuickExpenseClick(preset)}
                disabled={!!isLoading}
              >
                <span className="quick-expense-icon">{preset.icon || category?.icon || '💰'}</span>
                <span className="quick-expense-name">{preset.name}</span>
                <span className="quick-expense-amount">${preset.amount.toFixed(2)}</span>
              </button>
              <div className="quick-expense-item-actions">
                <button
                  className="btn-icon btn-icon-primary"
                  onClick={(e) => handleEditPreset(preset, e)}
                  aria-label={t('edit')}
                  title={t('edit')}
                >
                  <EditIcon size={16} />
                </button>
                <button
                  className="btn-icon btn-icon-danger"
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  aria-label={t('delete')}
                  title={t('delete')}
                >
                  <DeleteIcon size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add new preset button - inline */}
        {!isAdding && (
          <button 
            className="quick-expense-add-btn" 
            onClick={handleStartAdding}
            aria-label={t('addQuickExpense')}
          >
            <PlusIcon size={20} />
            <span>{t('addQuickExpense')}</span>
          </button>
        )}
      </div>

      {/* Inline form */}
      {isAdding && renderInlineForm()}

      {/* Regular add expense button */}
      {onQuickAdd && (
        <button onClick={onQuickAdd} className="quick-add-regular-btn">
          <span>📝</span>
          <span>{t('addExpenseManually')}</span>
        </button>
      )}
    </div>
  );
};

export default QuickAddWidget;
