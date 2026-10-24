import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { WidgetProps } from './types';
import { QuickExpensePreset, QuickExpensePresetInput } from '../../../types/quickExpense';
import { quickExpenseService } from '../../../services/quickExpenseService';
import { PlusIcon, EditIcon, DeleteIcon } from '../../icons';
import PaymentMethodSelector from '../../common/PaymentMethodSelector';
import CurrencySelector from '../../common/CurrencySelector';
import { PaymentMethodType } from '../../../types';
import { DEFAULT_BASE_CURRENCY, formatMoney, getCurrencySymbol } from '../../../utils/currencyUtils';
import { sortCategories } from '../../../utils/categoryOrder';
import { getCurrencyMinorDigits, roundMoney } from '../../../domain/money';
import DisplayCurrencyAmount from '../../common/DisplayCurrencyAmount';
import { getTodayLocal } from '../../../utils/dateUtils';
import { queueFailedWrite, writeLocalFirst } from '../../../utils/localFirstMutation';
import { applyPendingOperations } from '../../../utils/pendingOperations';

const isRetryableNetworkError = (error: unknown): boolean => {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code).toLowerCase().split('/').pop()
    : '';
  if (['permission-denied', 'invalid-argument', 'failed-precondition'].includes(code || '')) return false;
  return ['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code || '') ||
    (typeof navigator !== 'undefined' && !navigator.onLine);
};

// Portal-based floating menu component for better z-index handling
interface FloatingMenuProps {
  anchorId: string;
  children: React.ReactNode;
  onClose: () => void;
}

const FloatingMenu: React.FC<FloatingMenuProps> = ({ anchorId, children, onClose }) => {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;
    
    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const anchor = document.getElementById(anchorId);
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        anchor && 
        !anchor.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anchorId, onClose]);

  if (!position) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="quick-expense-floating-menu"
      style={{
        position: 'fixed',
        top: position.top,
        right: position.right,
        zIndex: 10000,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

const EMPTY_PRESETS: QuickExpensePreset[] = [];
const QuickAddWidget: React.FC<WidgetProps> = ({
  categories,
  cards,
  ewallets,
  banks,
  quickExpensePresets = EMPTY_PRESETS,
  onQuickExpenseAdd,
  onQuickExpensePresetsChange,
  displayCurrency,
  size = 'medium',
  // onQuickAdd is available in WidgetProps but not used in this component
}) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { showNotification, updateNotification } = useNotification();
  const [localPresets, setLocalPresets] = useState<QuickExpensePreset[]>(quickExpensePresets);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Determine display settings based on size
  const isCompact = size === 'small';
  
  // Form state
  const [formData, setFormData] = useState<QuickExpensePresetInput>({
    name: '',
    amount: 0,
    currency: DEFAULT_BASE_CURRENCY,
    categoryId: '',
    description: '',
    paymentMethod: 'cash',
    icon: '💰',
  });
  const currencyDigits = getCurrencyMinorDigits(formData.currency);

  // Sync local presets with props
  useEffect(() => {
    setLocalPresets(applyPendingOperations('quickExpensePresets', currentUser?.uid || '', quickExpensePresets));
  }, [quickExpensePresets, currentUser?.uid]);

  useEffect(() => {
    const handlePresetSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string }>).detail;
      if (detail?.entity === 'quickExpensePreset' && detail.userId === currentUser?.uid) {
        onQuickExpensePresetsChange?.();
      }
    };
    window.addEventListener('offline-operation-synced', handlePresetSynced);
    return () => window.removeEventListener('offline-operation-synced', handlePresetSynced);
  }, [currentUser?.uid, onQuickExpensePresetsChange]);

  // Focus on name input when adding new preset
  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAdding]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openMenuId) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [openMenuId]);

  const resetForm = () => {
    setFormData({
      name: '',
      amount: 0,
      currency: DEFAULT_BASE_CURRENCY,
      categoryId: '',
      description: '',
      paymentMethod: 'cash',
      icon: '💰',
    });
    setIsAdding(false);
    setEditingPresetId(null);
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
      currency: formData.currency,
      categoryId: formData.categoryId,
      paymentMethod: formData.paymentMethod,
      icon: formData.icon,
    };
    
    if (formData.description) cleanedData.description = formData.description;
    if (formData.cardId) cleanedData.cardId = formData.cardId;
    if (formData.ewalletId) cleanedData.ewalletId = formData.ewalletId;
    if (formData.bankId) cleanedData.bankId = formData.bankId;

    const isEditing = !!editingPresetId;
    const presetId = isEditing ? editingPresetId! : quickExpenseService.createId();
    const editedPresetId = editingPresetId;
    const maxOrder = localPresets.length > 0 ? Math.max(...localPresets.map(p => p.order)) : -1;
    
    // Create optimistic preset
    const optimisticPreset: QuickExpensePreset = {
      id: presetId,
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
        await writeLocalFirst({ type: 'update', entity: 'quickExpensePreset', payload: { ...cleanedData, id: presetId, userId: currentUser.uid } },
          () => quickExpenseService.update(presetId, cleanedData));
        // 4. Update notification to success
        updateNotification(notificationId, {
          type: 'success',
          message: t('updateSuccess'),
          duration: 3000,
        });
      } else {
        await writeLocalFirst({ type: 'create', entity: 'quickExpensePreset', payload: { ...cleanedData, id: presetId, order: maxOrder + 1, userId: currentUser.uid } },
          () => quickExpenseService.create(currentUser.uid, { ...cleanedData, id: presetId, order: maxOrder + 1 }));
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
      if (isRetryableNetworkError(error)) {
        const queuedId = await queueFailedWrite(error, {
          type: isEditing ? 'update' : 'create',
          entity: 'quickExpensePreset',
          payload: isEditing
            ? { ...cleanedData, id: presetId, userId: currentUser.uid }
            : { ...cleanedData, id: presetId, userId: currentUser.uid, order: maxOrder + 1 },
        });
        if (queuedId) {
          updateNotification(notificationId, { type: 'info', message: t('operationSavedOffline'), duration: 5000 });
          return;
        }
      }
      // 5. Rollback on error
      if (isEditing) {
        const originalPreset = quickExpensePresets.find((preset) => preset.id === editedPresetId);
        setLocalPresets((previous) => applyPendingOperations('quickExpensePresets', currentUser.uid,
          originalPreset
            ? previous.map((preset) => preset.id === presetId ? { ...preset, ...originalPreset } : preset)
            : previous.filter((preset) => preset.id !== presetId)));
      } else {
        // Remove temp preset
        setLocalPresets((previous) => applyPendingOperations('quickExpensePresets', currentUser.uid,
          previous.filter((preset) => preset.id !== presetId)));
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
    if (!currentUser) return;
    e.stopPropagation();
    setOpenMenuId(null);
    
    // 1. Save original preset for rollback
    const deletedPreset = localPresets.find(p => p.id === presetId);
    
    // 2. Optimistic delete
    setLocalPresets(prev => prev.filter(p => p.id !== presetId));
    const deletedIndex = localPresets.findIndex((preset) => preset.id === presetId);
    
    // 3. Show pending notification
    const notificationId = showNotification('pending', t('deleting'), { duration: 0 });

    try {
      await writeLocalFirst({ type: 'delete', entity: 'quickExpensePreset', payload: { id: presetId, userId: currentUser.uid } },
        () => quickExpenseService.delete(presetId));
      // 4. Update notification to success
      updateNotification(notificationId, {
        type: 'success',
        message: t('deleteSuccess'),
        duration: 3000,
      });
      onQuickExpensePresetsChange?.();
    } catch (error) {
      console.error('Failed to delete preset:', error);
      if (isRetryableNetworkError(error)) {
        const queuedId = await queueFailedWrite(error, {
          type: 'delete',
          entity: 'quickExpensePreset',
          payload: { id: presetId, userId: currentUser.uid },
        });
        if (queuedId) {
          updateNotification(notificationId, { type: 'info', message: t('operationSavedOffline'), duration: 5000 });
          return;
        }
      }
      // 5. Rollback on error
      if (deletedPreset) setLocalPresets((previous) => applyPendingOperations('quickExpensePresets', currentUser.uid,
        previous.some((preset) => preset.id === presetId)
          ? previous
          : [...previous.slice(0, Math.min(deletedIndex, previous.length)), deletedPreset, ...previous.slice(Math.min(deletedIndex, previous.length))]));
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
    setOpenMenuId(null);
    setEditingPresetId(preset.id);
    setFormData({
      name: preset.name,
      amount: preset.amount,
      currency: preset.currency || DEFAULT_BASE_CURRENCY,
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

  const toggleMenu = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === presetId ? null : presetId);
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
      {/* Row 1: Name */}
      <div className="inline-form-field">
        <label className="inline-form-label ui-form-label">{t('presetName')}</label>
        <input
          ref={nameInputRef}
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('quickExpenseNamePlaceholder')}
          className="inline-input ui-control--compact ui-control--full-width"
        />
      </div>

      {/* Row 2: Amount */}
      <div className="inline-form-field">
        <label className="inline-form-label ui-form-label">{t('amount')}</label>
        <div className="inline-amount-wrapper">
          <span className="currency-symbol">{getCurrencySymbol(formData.currency)}</span>
          <input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? 0 : roundMoney(parseFloat(e.target.value), formData.currency) })}
            placeholder={formatMoney(0, formData.currency)}
            className="inline-input inline-input-amount"
            step={currencyDigits === 0 ? '1' : '0.01'}
            min="0"
          />
        </div>
      </div>

      {/* Row 2b: Currency */}
      <div className="inline-form-field">
        <CurrencySelector
          value={formData.currency || DEFAULT_BASE_CURRENCY}
          onChange={(currency) => setFormData((previous) => ({ ...previous, currency, amount: roundMoney(previous.amount, currency) }))}
          label={t('currency')}
          compact={true}
        />
      </div>

      {/* Row 3: Category + Payment Method (2 columns on desktop) */}
      <div className="inline-form-grid">
        <div className="inline-form-field">
          <label className="inline-form-label ui-form-label">{t('category')}</label>
          <select
            value={formData.categoryId}
            onChange={(e) => {
              const categoryId = e.target.value;
              const cat = categories.find(c => c.id === categoryId);
              setFormData({ 
                ...formData, 
                categoryId, 
                icon: cat?.icon || formData.icon || '💰'
              });
            }}
            className="inline-select ui-control--compact ui-control--full-width"
          >
            <option value="">{t('selectCategory')}</option>
            {sortCategories(categories).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Row 4: Payment Method (button-based selector) */}
      <div className="inline-form-field">
        <PaymentMethodSelector
          paymentMethod={formData.paymentMethod as PaymentMethodType}
          onPaymentMethodChange={(method) => setFormData({
            ...formData,
            paymentMethod: method,
            cardId: undefined,
            ewalletId: undefined,
            bankId: undefined,
          })}
          cardId={formData.cardId}
          onCardChange={(id) => setFormData({ ...formData, cardId: id || undefined })}
          bankId={formData.bankId}
          onBankChange={(id) => setFormData({ ...formData, bankId: id || undefined })}
          paymentMethodName={
            formData.paymentMethod === 'e_wallet' 
              ? ewallets.find(w => w.id === formData.ewalletId)?.name 
              : undefined
          }
          onPaymentMethodNameChange={(name) => {
            const wallet = ewallets.find(w => w.name === name);
            setFormData({ ...formData, ewalletId: wallet?.id || undefined });
          }}
          cards={cards}
          banks={banks}
          ewallets={ewallets}
          compact={true}
          showLabels={true}
        />
      </div>

      {/* Actions */}
      <div className="inline-form-actions">
        <button 
          onClick={handleSavePreset} 
          className="inline-btn inline-btn-save"
          disabled={!formData.name || !formData.categoryId || formData.amount <= 0}
        >
          {editingPresetId ? t('update') : t('save')}
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
    <div className={`quick-expense-widget ${isCompact ? 'quick-expense-compact' : ''}`}>
      {/* Quick expense buttons grid */}
      <div className="quick-expense-grid">
        {localPresets.map((preset) => {
          const category = categories.find((c) => c.id === preset.categoryId);
          const menuAnchorId = `quick-menu-${preset.id}`;
          
          return (
            <div
              key={preset.id}
              className="quick-expense-card"
            >
              {/* Main button area - clickable to add expense */}
              <button
                className={`quick-expense-card-btn ${isLoading === preset.id ? 'loading' : ''}`}
                onClick={() => handleQuickExpenseClick(preset)}
                disabled={!!isLoading}
              >
                <span className="quick-expense-card-category">
                  {category?.name || t('uncategorized')}
                </span>
                <span className="quick-expense-card-amount">
                  <DisplayCurrencyAmount
                    amount={preset.amount}
                    currency={preset.currency}
                    targetCurrency={displayCurrency}
                    date={getTodayLocal()}
                  />
                </span>
                <span className="quick-expense-card-name">
                  {preset.name}
                </span>
              </button>
              
              {/* Menu trigger button */}
              <button
                id={menuAnchorId}
                className="quick-expense-card-menu-btn"
                onClick={(e) => toggleMenu(preset.id, e)}
                aria-label={t('more')}
              >
                ⋮
              </button>
              
              {/* Portal-based floating menu */}
              {openMenuId === preset.id && (
                <FloatingMenu 
                  anchorId={menuAnchorId} 
                  onClose={() => setOpenMenuId(null)}
                >
                  <button
                    className="quick-expense-menu-item"
                    onClick={(e) => handleEditPreset(preset, e)}
                  >
                    <EditIcon size={16} />
                    <span>{t('edit')}</span>
                  </button>
                  <button
                    className="quick-expense-menu-item danger"
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                  >
                    <DeleteIcon size={16} />
                    <span>{t('delete')}</span>
                  </button>
                </FloatingMenu>
              )}
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
            <PlusIcon size={isCompact ? 16 : 20} />
            <span>{isCompact ? t('add') : t('addQuickExpense')}</span>
          </button>
        )}
      </div>

      {/* Inline form */}
      {isAdding && renderInlineForm()}
    </div>
  );
};

export default QuickAddWidget;
