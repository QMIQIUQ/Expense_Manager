import React, { useState, useEffect, useRef } from 'react';
import { Expense, Category, Card, EWallet, Bank, Transfer, TimeFormat, DateFormat, AmountItem, PaymentMethodType } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTodayLocal, getCurrentTimeLocal, formatDateWithUserFormat } from '../../utils/dateUtils';
import DatePicker from '../common/DatePicker';
import TimePicker from '../common/TimePicker';
import PaymentMethodSelector from '../common/PaymentMethodSelector';

// Step type definition
type Step = 1 | 2 | 3 | 4 | 5;

interface StepByStepExpenseFormProps {
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  onSubmitAndAddAnother?: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  initialData?: Expense;
  initialTransfer?: Transfer;
  categories: Category[];
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[];
  onCreateEWallet?: () => void;
  onCreateCard?: () => void;
  onAddTransfer?: (transfer: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, silent?: boolean) => Promise<void>;
  initialDate?: string;
  timeFormat?: TimeFormat;
  dateFormat?: DateFormat;
  lastUsedPaymentMethod?: string;
}

const StepByStepExpenseForm: React.FC<StepByStepExpenseFormProps> = ({
  onSubmit,
  onCancel,
  onSubmitAndAddAnother,
  initialData,
  initialTransfer,
  categories,
  cards = [],
  ewallets = [],
  banks = [],
  onAddTransfer,
  onCreateEWallet,
  onCreateCard,
  initialDate,
  timeFormat = '24h',
  dateFormat = 'YYYY-MM-DD',
  lastUsedPaymentMethod,
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  
  // Delay for focusing input after state updates
  const FOCUS_DELAY_MS = 50;

  // Sort categories by recent usage (stored in localStorage)
  const getSortedCategories = (): Category[] => {
    try {
      const recentUsage = JSON.parse(localStorage.getItem('categoryUsage') || '{}');
      return [...categories].sort((a, b) => {
        const aCount = recentUsage[a.name] || 0;
        const bCount = recentUsage[b.name] || 0;
        return bCount - aCount;
      });
    } catch {
      return categories;
    }
  };

  const updateCategoryUsage = (categoryName: string) => {
    try {
      const recentUsage = JSON.parse(localStorage.getItem('categoryUsage') || '{}');
      recentUsage[categoryName] = (recentUsage[categoryName] || 0) + 1;
      localStorage.setItem('categoryUsage', JSON.stringify(recentUsage));
    } catch {
      // Ignore localStorage errors
    }
  };

  const [formData, setFormData] = useState({
    date: initialDate || initialData?.date || getTodayLocal(),
    time: initialData?.time || getCurrentTimeLocal(),
    amount: initialData?.amount ? Math.round(initialData.amount * 100) : 0,
    category: initialData?.category || '',
    description: initialData?.description || '',
    notes: initialData?.notes || '',
    paymentMethod: initialData?.paymentMethod || lastUsedPaymentMethod || 'cash',
    paymentMethodName: initialData?.paymentMethodName || '',
    cardId: initialData?.cardId || '',
    bankId: initialData?.bankId || '',
    needsRepaymentTracking: initialData?.needsRepaymentTracking || false,
  });

  // Multi-amount and tax state
  const [amountItems, setAmountItems] = useState<AmountItem[]>(
    initialData?.amountItems || []
  );
  const [currentAmountInput, setCurrentAmountInput] = useState<number>(0);
  const [enableTax, setEnableTax] = useState(!!initialData?.taxRate);
  const [taxRate, setTaxRate] = useState<number>(initialData?.taxRate || 6);

  const [enableTransfer, setEnableTransfer] = useState(!!initialTransfer);
  const [transferToPaymentMethod, setTransferToPaymentMethod] = useState<'cash' | 'credit_card' | 'e_wallet' | 'bank'>(
    initialTransfer?.toPaymentMethod || 'cash'
  );
  const [transferToCardId, setTransferToCardId] = useState(initialTransfer?.toCardId || '');
  const [transferToEWalletName, setTransferToEWalletName] = useState(initialTransfer?.toPaymentMethodName || '');
  const [transferToBankId, setTransferToBankId] = useState(initialTransfer?.toBankId || '');

  useEffect(() => {
    let timeoutId: number | undefined;
    if (currentStep === 2 && amountInputRef.current) {
      timeoutId = window.setTimeout(() => amountInputRef.current?.focus(), 100);
    } else if (currentStep === 4 && descriptionInputRef.current) {
      timeoutId = window.setTimeout(() => descriptionInputRef.current?.focus(), 100);
    }
    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 5) {
      if (formData.paymentMethod === 'credit_card' && cards.length > 0 && !formData.cardId) {
        setFormData(prev => ({ ...prev, cardId: cards[0].id || '' }));
      } else if (formData.paymentMethod === 'e_wallet' && ewallets.length > 0 && !formData.paymentMethodName) {
        setFormData(prev => ({ ...prev, paymentMethodName: ewallets[0].name }));
      } else if (formData.paymentMethod === 'bank' && banks.length > 0 && !formData.bankId) {
        setFormData(prev => ({ ...prev, bankId: banks[0].id || '' }));
      }
    }
  }, [formData.paymentMethod, formData.cardId, formData.paymentMethodName, formData.bankId, currentStep, cards, ewallets, banks]);

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep((prev) => (prev + 1) as Step);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  // Handle Enter key to go to next step
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentStep === 5) {
        if (isStep5Valid()) handleSubmit();
      } else if (currentStep === 2 && formData.amount > 0) {
        handleNext();
      } else if (currentStep === 4 && formData.description.trim()) {
        handleNext();
      } else if (currentStep === 1) {
        handleNext();
      }
    }
  };

  const handleStepClick = (step: Step) => {
    setCurrentStep(step);
  };

  // Helper to build submit data
  const buildSubmitData = (): Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'> => {
    const submitData: Record<string, unknown> = { 
      ...formData,
      amount: formData.amount / 100
    };

    // Add multi-amount data if applicable
    if (amountItems.length > 0) {
      submitData.amountItems = amountItems;
      submitData.subtotal = Math.round(subtotal * 100) / 100;
      if (enableTax) {
        submitData.taxRate = taxRate;
        submitData.taxAmount = Math.round(taxAmount * 100) / 100;
      }
    }

    if (formData.paymentMethod === 'cash') {
      delete submitData.cardId;
      delete submitData.paymentMethodName;
      delete submitData.bankId;
    } else if (formData.paymentMethod === 'credit_card') {
      delete submitData.paymentMethodName;
      delete submitData.bankId;
    } else if (formData.paymentMethod === 'e_wallet') {
      delete submitData.cardId;
      delete submitData.bankId;
    } else if (formData.paymentMethod === 'bank') {
      delete submitData.cardId;
      delete submitData.paymentMethodName;
    }

    return submitData as Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;
  };

  // Helper to handle transfer logic
  const handleTransferIfNeeded = () => {
    if (enableTransfer && onAddTransfer) {
      const fromPaymentMethod = formData.paymentMethod as 'cash' | 'credit_card' | 'e_wallet' | 'bank';
      const toPaymentMethod = transferToPaymentMethod;
      
      const isSamePaymentSource = (
        fromMethod: 'cash' | 'credit_card' | 'e_wallet' | 'bank',
        toMethod: 'cash' | 'credit_card' | 'e_wallet' | 'bank'
      ): boolean => {
        if (fromMethod !== toMethod) return false;
        switch (toMethod) {
          case 'cash': return true;
          case 'credit_card': return transferToCardId === formData.cardId;
          case 'e_wallet': return transferToEWalletName === formData.paymentMethodName;
          case 'bank': return transferToBankId === formData.bankId;
        }
      };
      
      if (!isSamePaymentSource(fromPaymentMethod, toPaymentMethod)) {
        const transferData: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          amount: formData.amount / 100,
          date: formData.date,
          time: formData.time,
          note: `${t('transfer')} - ${formData.description}`,
          fromPaymentMethod: fromPaymentMethod,
          fromPaymentMethodName: fromPaymentMethod === 'e_wallet' ? formData.paymentMethodName : '',
          toPaymentMethod: toPaymentMethod,
          toPaymentMethodName: toPaymentMethod === 'e_wallet' ? transferToEWalletName : '',
        };
        
        if (fromPaymentMethod === 'credit_card' && formData.cardId) transferData.fromCardId = formData.cardId;
        if (fromPaymentMethod === 'bank' && formData.bankId) transferData.fromBankId = formData.bankId;
        if (toPaymentMethod === 'credit_card' && transferToCardId) transferData.toCardId = transferToCardId;
        if (toPaymentMethod === 'bank' && transferToBankId) transferData.toBankId = transferToBankId;
        
        onAddTransfer(transferData, true).catch((err) => console.error('Failed to create transfer:', err));
      }
    }
  };

  // Reset form for adding another expense
  const resetFormForNewExpense = () => {
    setFormData({
      date: initialDate || getTodayLocal(),
      time: getCurrentTimeLocal(),
      amount: 0,
      category: '', // Keep category for quick re-entry
      description: '',
      notes: '',
      paymentMethod: formData.paymentMethod, // Keep payment method
      paymentMethodName: formData.paymentMethodName,
      cardId: formData.cardId,
      bankId: formData.bankId,
      needsRepaymentTracking: false,
    });
    setAmountItems([]);
    setCurrentAmountInput(0);
    setEnableTax(false);
    setEnableTransfer(false);
    setCurrentStep(2); // Go back to amount step for quick entry
  };

  const handleSubmit = () => {
    // Update category usage for sorting
    if (formData.category) {
      updateCategoryUsage(formData.category);
    }

    handleTransferIfNeeded();
    onSubmit(buildSubmitData());
  };

  const handleSubmitAndAddAnother = () => {
    if (!onSubmitAndAddAnother) return;
    
    // Update category usage for sorting
    if (formData.category) {
      updateCategoryUsage(formData.category);
    }

    handleTransferIfNeeded();
    onSubmitAndAddAnother(buildSubmitData());
    resetFormForNewExpense();
  };

  // Multi-amount handlers
  const handleCurrentAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '');
    const amountInCents = parseInt(digitsOnly) || 0;
    setCurrentAmountInput(amountInCents);
    // Also update formData amount for single item mode
    if (amountItems.length === 0) {
      setFormData((prev) => ({ ...prev, amount: amountInCents }));
    }
  };

  const addAmountItem = (shouldFocusInput: boolean = false) => {
    if (currentAmountInput > 0) {
      const newItem: AmountItem = { amount: currentAmountInput / 100 };
      setAmountItems(prev => [...prev, newItem]);
      setCurrentAmountInput(0);
      // Update total amount
      updateTotalAmount([...amountItems, newItem]);
      // Only auto-focus back to input if explicitly requested (e.g., clicking + button)
      if (shouldFocusInput) {
        setTimeout(() => amountInputRef.current?.focus(), FOCUS_DELAY_MS);
      }
    }
  };

  const removeAmountItem = (index: number) => {
    const newItems = amountItems.filter((_, i) => i !== index);
    setAmountItems(newItems);
    updateTotalAmount(newItems);
  };

  const updateTotalAmount = (items: AmountItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = enableTax ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + taxAmount;
    setFormData(prev => ({ ...prev, amount: Math.round(total * 100) }));
  };

  const handleTaxRateChange = (rate: number) => {
    setTaxRate(rate);
    // Recalculate total
    const subtotal = amountItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (rate / 100);
    const total = subtotal + taxAmount;
    setFormData(prev => ({ ...prev, amount: Math.round(total * 100) }));
  };

  const handleEnableTaxChange = (enabled: boolean) => {
    setEnableTax(enabled);
    // Recalculate total
    const subtotal = amountItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = enabled ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + taxAmount;
    setFormData(prev => ({ ...prev, amount: Math.round(total * 100) }));
  };

  // Calculate subtotal and tax for display
  const subtotal = amountItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = enableTax ? subtotal * (taxRate / 100) : 0;

  // Handle Tab key to add amount item
  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && currentAmountInput > 0) {
      e.preventDefault();
      addAmountItem(false);
      // After Tab, go to next step
      setTimeout(() => handleNext(), FOCUS_DELAY_MS);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Keyboard Enter: add pending amount if any, then go to next step
      if (currentAmountInput > 0) {
        addAmountItem(false);
        // Go to next step after adding
        setTimeout(() => handleNext(), FOCUS_DELAY_MS);
      } else if (formData.amount > 0) {
        // No pending input, just proceed to next step (category)
        handleNext();
      }
    }
  };

  const formatCurrency = (amount: number): string => `$${(amount / 100).toFixed(2)}`;
  const formatCurrencyFromDollars = (amount: number): string => `$${amount.toFixed(2)}`;

  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(c => c.name === categoryName);
    return category?.icon || '📝';
  };

  const safeFormatDateDisplay = (date: string, format?: DateFormat): string => {
    if (date && format) return formatDateWithUserFormat(date, format);
    return date;
  };

  const renderProgressSummary = () => (
    <div style={styles.progressSummary}>
      {currentStep > 1 && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(1)}>
          📅 {safeFormatDateDisplay(formData.date, dateFormat)}
        </div>
      )}
      {currentStep > 2 && formData.amount > 0 && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(2)}>
          💰 {formatCurrency(formData.amount)}
        </div>
      )}
      {currentStep > 3 && formData.category && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(3)}>
          {getCategoryIcon(formData.category)} {formData.category}
        </div>
      )}
      {currentStep > 4 && formData.description && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(4)}>
          📝 {formData.description.slice(0, 15)}{formData.description.length > 15 ? '...' : ''}
        </div>
      )}
    </div>
  );

  const renderProgressIndicator = () => (
    <div style={styles.progressContainer}>
      {[1, 2, 3, 4, 5].map((step) => (
        <div
          key={step}
          style={{
            ...styles.progressBar,
            ...(step <= currentStep ? styles.progressBarActive : {}),
          }}
        />
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        const isNotToday = formData.date !== getTodayLocal();
        return (
          <div style={{ ...styles.stepContent, overflow: 'visible' }}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>📅</span>
              <h2 style={styles.stepHeaderTitle}>{t('date')}</h2>
            </div>
            {isNotToday && (
              <div style={styles.dateWarning}>
                ⚠️ {t('notTodayHint') || '注意：选择的日期不是今天'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minHeight: '400px' }}>
              <DatePicker
                label={t('date')}
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                dateFormat={dateFormat}
                required
              />
              <TimePicker
                label={t('time')}
                value={formData.time}
                onChange={(time) => setFormData(prev => ({ ...prev, time }))}
                timeFormat={timeFormat}
                name="time"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>💰</span>
              <h2 style={styles.stepHeaderTitle}>{t('amount')}</h2>
              {/* Display total in header when there are amount items */}
              {(amountItems.length > 0 || formData.amount > 0) && (
                <span style={styles.headerTotal}>
                  {t('total')}: {formatCurrency(formData.amount)}
                </span>
              )}
            </div>
            
            {/* Amount input with add button */}
            <div style={styles.amountInputRow}>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={currentAmountInput === 0 ? '' : formatCurrency(currentAmountInput)}
                onChange={handleCurrentAmountInputChange}
                onKeyDown={handleAmountKeyDown}
                placeholder="$0.00"
                style={styles.amountInputMulti}
              />
              <button
                type="button"
                onClick={() => addAmountItem(true)}
                disabled={currentAmountInput === 0}
                style={{
                  ...styles.addAmountBtn,
                  ...(currentAmountInput === 0 ? styles.addAmountBtnDisabled : {}),
                }}
              >
                + {t('add')}
              </button>
            </div>

            {/* Amount items list */}
            {amountItems.length > 0 && (
              <div style={styles.amountItemsList}>
                <div style={styles.amountItemsLabel}>{t('addedItems')}:</div>
                {amountItems.map((item, index) => (
                  <div key={index} style={styles.amountItem}>
                    <span>{formatCurrencyFromDollars(item.amount)}</span>
                    <button
                      type="button"
                      onClick={() => removeAmountItem(index)}
                      style={styles.removeAmountBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tax section */}
            {amountItems.length > 0 && (
              <>
                <div style={styles.taxCheckboxRow}>
                  <label style={styles.taxCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={enableTax}
                      onChange={(e) => handleEnableTaxChange(e.target.checked)}
                      style={styles.taxCheckbox}
                    />
                    <span>{t('addTax')}</span>
                  </label>
                </div>

                {enableTax && (
                  <div style={styles.taxRateRow}>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                      style={styles.taxRateInput}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span style={styles.taxRatePercent}>%</span>
                    <button
                      type="button"
                      onClick={() => handleTaxRateChange(6)}
                      style={{
                        ...styles.taxPresetBtn,
                        ...(taxRate === 6 ? styles.taxPresetBtnActive : {}),
                      }}
                    >
                      6%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTaxRateChange(8)}
                      style={{
                        ...styles.taxPresetBtn,
                        ...(taxRate === 8 ? styles.taxPresetBtnActive : {}),
                      }}
                    >
                      8%
                    </button>
                  </div>
                )}

                {/* Summary */}
                <div style={styles.amountSummary}>
                  <div style={styles.summaryRow}>
                    <span>{t('subtotal')}:</span>
                    <span>{formatCurrencyFromDollars(subtotal)}</span>
                  </div>
                  {enableTax && (
                    <div style={styles.summaryRow}>
                      <span>{t('tax')} ({taxRate}%):</span>
                      <span>{formatCurrencyFromDollars(taxAmount)}</span>
                    </div>
                  )}
                  <div style={{ ...styles.summaryRow, ...styles.summaryRowTotal }}>
                    <span>{t('total')}:</span>
                    <span style={styles.summaryTotal}>{formatCurrency(formData.amount)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Simple amount display when no items added */}
            {amountItems.length === 0 && formData.amount > 0 && (
              <div style={styles.simpleAmountDisplay}>
                <span style={styles.simpleAmountLabel}>{t('total')}:</span>
                <span style={styles.simpleAmountValue}>{formatCurrency(formData.amount)}</span>
              </div>
            )}
          </div>
        );

      case 3:
        const sortedCategories = getSortedCategories();
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>🏷️</span>
              <h2 style={styles.stepHeaderTitle}>{t('selectCategory')}</h2>
            </div>
            <div style={styles.categoryScrollContainer}>
              <div style={styles.categoryScroll}>
                {sortedCategories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, category: category.name }));
                      // Auto advance to next step when category is selected
                      setTimeout(() => handleNext(), 150);
                    }}
                    style={{
                      ...styles.categoryCard,
                      ...(formData.category === category.name ? styles.categoryCardActive : {}),
                    }}
                  >
                    <div style={styles.categoryEmoji}>{getCategoryIcon(category.name)}</div>
                    <div style={styles.categoryName}>{category.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div style={styles.stepContent}>
            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>📝 {t('description')}</label>
              <input
                ref={descriptionInputRef}
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('descriptionPlaceholder')}
                style={styles.textInput}
              />
            </div>

            {/* Amount Items Description Section */}
            {amountItems.length > 0 && (
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>💰 {t('amountDetails')} ({t('optional')})</label>
                <div style={styles.amountDescriptionList}>
                  {amountItems.map((item, index) => (
                    <div key={index} style={styles.amountDescriptionRow}>
                      <span style={styles.amountDescriptionAmount}>
                        {formatCurrencyFromDollars(item.amount)}:
                      </span>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => {
                          const newItems = [...amountItems];
                          newItems[index] = { ...item, description: e.target.value };
                          setAmountItems(newItems);
                        }}
                        placeholder={t('itemDescription') || 'Item description...'}
                        style={styles.amountDescriptionInput}
                      />
                    </div>
                  ))}
                  {enableTax && taxAmount > 0 && (
                    <div style={styles.amountDescriptionRow}>
                      <span style={styles.taxLabel}>{t('tax')} ({taxRate}%):</span>
                      <span style={styles.taxValue}>{formatCurrencyFromDollars(taxAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>{t('notes')} ({t('optional')})</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('notesPlaceholder')}
                style={styles.textArea}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>💳</span>
              <h2 style={styles.stepHeaderTitle}>{t('paymentMethod')}</h2>
            </div>
            
            {lastUsedPaymentMethod && !initialData && (
              <div style={styles.autoSelectHint}>
                ✨ Auto-selected
              </div>
            )}

            <PaymentMethodSelector
              paymentMethod={formData.paymentMethod as PaymentMethodType}
              onPaymentMethodChange={(method) => setFormData(prev => ({ ...prev, paymentMethod: method }))}
              cardId={formData.cardId}
              onCardChange={(cardId) => setFormData(prev => ({ ...prev, cardId }))}
              bankId={formData.bankId}
              onBankChange={(bankId) => setFormData(prev => ({ ...prev, bankId }))}
              paymentMethodName={formData.paymentMethodName}
              onPaymentMethodNameChange={(name) => setFormData(prev => ({ ...prev, paymentMethodName: name }))}
              cards={cards}
              banks={banks}
              ewallets={ewallets}
              onCreateCard={onCreateCard}
              onCreateEWallet={onCreateEWallet}
              showLabels={false}
            />

            {/* Toggle options - tap to toggle like settings page */}
            <div style={styles.toggleOptionsContainer}>
              <div
                onClick={() => setFormData(prev => ({ ...prev, needsRepaymentTracking: !prev.needsRepaymentTracking }))}
                style={{
                  ...styles.toggleOption,
                  ...(formData.needsRepaymentTracking ? styles.toggleOptionActive : {}),
                }}
              >
                <span style={styles.toggleOptionIcon}>🔄</span>
                <span style={styles.toggleOptionText}>{t('repayment')}</span>
                <span style={styles.toggleIndicator}>{formData.needsRepaymentTracking ? '✓' : ''}</span>
              </div>
              
              <div
                onClick={() => setEnableTransfer(!enableTransfer)}
                style={{
                  ...styles.toggleOption,
                  ...(enableTransfer ? styles.toggleOptionActive : {}),
                }}
              >
                <span style={styles.toggleOptionIcon}>↔️</span>
                <span style={styles.toggleOptionText}>{t('transfer')}</span>
                <span style={styles.toggleIndicator}>{enableTransfer ? '✓' : ''}</span>
              </div>
            </div>

            {enableTransfer && (
              <div style={styles.transferOptions}>
                <label style={styles.fieldLabel}>{t('transferTo')}</label>
                <div style={styles.paymentMethodGrid}>
                  <div
                    onClick={() => setTransferToPaymentMethod('cash')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'cash' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>💵</div>
                    <div style={styles.paymentMethodNameSmall}>{t('cash')}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('credit_card')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'credit_card' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>💳</div>
                    <div style={styles.paymentMethodNameSmall}>{t('creditCard')}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('e_wallet')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'e_wallet' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>📱</div>
                    <div style={styles.paymentMethodNameSmall}>{t('eWallet')}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('bank')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'bank' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>🏦</div>
                    <div style={styles.paymentMethodNameSmall}>{t('bankTransfer')}</div>
                  </div>
                </div>

                {transferToPaymentMethod === 'credit_card' && cards.length > 0 && (
                  <select
                    value={transferToCardId}
                    onChange={(e) => setTransferToCardId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">{t('selectCard')}</option>
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>{card.name}</option>
                    ))}
                  </select>
                )}

                {transferToPaymentMethod === 'e_wallet' && (
                  <input
                    type="text"
                    value={transferToEWalletName}
                    onChange={(e) => setTransferToEWalletName(e.target.value)}
                    placeholder={t('eWalletName')}
                    style={styles.textInput}
                  />
                )}

                {transferToPaymentMethod === 'bank' && banks.length > 0 && (
                  <select
                    value={transferToBankId}
                    onChange={(e) => setTransferToBankId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">{t('selectBank')}</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Fixed validation logic - using correct payment method values
  const isStep5Valid = () => {
    if (formData.paymentMethod === 'e_wallet' && !formData.paymentMethodName?.trim()) return false;
    if (formData.paymentMethod === 'credit_card' && cards.length > 0 && !formData.cardId) return false;
    if (formData.paymentMethod === 'bank' && banks.length > 0 && !formData.bankId) return false;
    return true;
  };

  return (
    <div style={styles.container} onKeyDown={handleKeyDown}>
      <div style={styles.header}>
        {/* Navigation buttons in header */}
        <button
          onClick={currentStep === 1 ? onCancel : handlePrevious}
          style={styles.headerNavBtn}
          aria-label={currentStep === 1 ? t('cancel') : t('back')}
        >
          {currentStep === 1 ? '✕' : '‹'}
        </button>
        
        <div style={styles.headerCenter}>
          <div style={styles.headerTitle}>
            {initialData ? (t('editExpense') || '编辑支出') : (t('addExpense') || '新增支出')}
          </div>
          {renderProgressIndicator()}
        </div>
        
        <div style={styles.headerRight}>
          {/* Save & Add Another button - only show in Step 5 when creating new expense */}
          {currentStep === 5 && !initialData && onSubmitAndAddAnother && (
            <button
              onClick={handleSubmitAndAddAnother}
              disabled={!isStep5Valid()}
              style={{
                ...styles.headerNavBtn,
                ...styles.headerNavBtnSecondary,
                opacity: isStep5Valid() ? 1 : 0.5,
                cursor: isStep5Valid() ? 'pointer' : 'not-allowed',
              }}
              aria-label={t('saveAndAddAnother') || '储存后新增'}
              title={t('saveAndAddAnother') || '储存后新增'}
            >
              ➕
            </button>
          )}
          <button
            onClick={currentStep === 5 ? handleSubmit : handleNext}
            style={styles.headerNavBtn}
            disabled={
              (currentStep === 2 && formData.amount === 0) ||
              (currentStep === 3 && !formData.category) ||
              (currentStep === 4 && !formData.description.trim()) ||
              (currentStep === 5 && !isStep5Valid())
            }
            aria-label={currentStep === 5 ? t('save') : t('next')}
          >
            {currentStep === 5 ? '✓' : '›'}
          </button>
        </div>
      </div>

      {renderProgressSummary()}
      {renderStepContent()}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '100%',
    width: '100%',
    margin: '0 auto',
    background: 'var(--card-bg, white)',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'var(--bg-secondary, #f8f9fa)',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color, #e9ecef)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  headerNavBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    background: 'var(--card-bg, white)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  headerNavBtnSecondary: {
    background: 'var(--success-bg, #d4edda)',
    border: '1px solid var(--success-text, #28a745)',
    color: 'var(--success-text, #28a745)',
    fontSize: '14px',
  },
  headerNavBtnPrimary: {
    background: 'var(--accent-primary)',
    border: '1px solid var(--accent-primary)',
    color: 'white',
  },
  headerNavBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  headerIcon: {
    fontSize: '20px',
  },
  progressContainer: {
    display: 'flex',
    gap: '4px',
  },
  progressBar: {
    flex: 1,
    height: '3px',
    background: 'var(--border-color, #e9ecef)',
    borderRadius: '2px',
    transition: 'all 0.3s',
  },
  progressBarActive: {
    background: 'var(--accent-primary)',
  },
  progressSummary: {
    display: 'flex',
    gap: '6px',
    padding: '10px 12px',
    overflowX: 'auto',
    background: 'var(--card-bg, white)',
    borderBottom: '1px solid var(--border-color, #e9ecef)',
  },
  summaryChip: {
    padding: '4px 10px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    color: 'var(--text-primary)',
    transition: 'all 0.2s',
  },
  stepContent: {
    padding: '16px',
    flex: 1, // Take available space
    minHeight: '300px',
    maxHeight: 'calc(100vh - 250px)', // Constrain max height to viewport
    overflowY: 'auto',
    position: 'relative' as const, // Establish positioning context for absolute children
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  stepHeaderIcon: {
    fontSize: '18px',
  },
  stepHeaderTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  headerTotal: {
    marginLeft: 'auto',
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--success-text)',
  },
  amountInputContainer: {
    textAlign: 'center',
  },
  amountInput: {
    fontSize: '32px',
    fontWeight: '700',
    textAlign: 'center',
    border: 'none',
    borderBottom: '2px solid var(--accent-primary)',
    padding: '10px',
    width: '100%',
    maxWidth: '280px',
    outline: 'none',
    color: 'var(--text-primary)',
    background: 'transparent',
  },
  categoryScrollContainer: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    marginLeft: '-16px',
    marginRight: '-16px',
    paddingLeft: '16px',
    paddingRight: '16px',
  },
  categoryScroll: {
    display: 'grid',
    gridTemplateRows: 'repeat(2, 1fr)',
    gridAutoFlow: 'column',
    gridAutoColumns: 'minmax(80px, 100px)',
    gap: '8px',
    paddingBottom: '8px',
    paddingRight: '16px',
  },
  categoryCard: {
    padding: '12px 8px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
    overflow: 'hidden',
    minWidth: 0,
  },
  categoryCardActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
  },
  categoryEmoji: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  categoryName: {
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  fieldContainer: {
    marginBottom: '24px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: 'var(--text-primary)',
  },
  textInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  textArea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  paymentMethodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '16px',
  },
  paymentMethodCard: {
    padding: '12px 8px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
  },
  paymentMethodCardActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
  },
  paymentMethodIcon: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  paymentMethodName: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  paymentMethodCardSmall: {
    padding: '16px 12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  paymentMethodIconSmall: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  paymentMethodNameSmall: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  autoSelectHint: {
    padding: '12px 16px',
    background: '#e7f5ff',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1971c2',
    marginBottom: '16px',
    textAlign: 'center',
  },
  checkboxContainer: {
    marginBottom: '16px',
    padding: '16px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    color: 'var(--text-primary)',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  checkboxHint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '8px',
    marginLeft: '32px',
  },
  transferOptions: {
    marginTop: '16px',
    padding: '16px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
  },
  navigation: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid var(--border-color, #e9ecef)',
  },
  buttonSecondary: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    background: 'var(--card-bg, white)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid var(--accent-primary)',
    borderRadius: '8px',
    background: 'var(--accent-primary)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  noItemsContainer: {
    padding: '16px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
  },
  noItemsText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: '0 0 12px 0',
  },
  createButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '6px',
    background: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dateWarning: {
    fontSize: '12px',
    color: 'var(--warning-text)',
    marginBottom: '12px',
    textAlign: 'center',
  },
  toggleOptionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  toggleOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
  },
  toggleOptionActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
  },
  toggleOptionIcon: {
    fontSize: '16px',
  },
  toggleOptionText: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  toggleIndicator: {
    fontSize: '14px',
    color: 'var(--accent-primary)',
    fontWeight: '600',
  },
  // Multi-amount styles
  amountInputRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  amountInputMulti: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '18px',
    fontWeight: '600',
    border: '2px solid var(--border-color, #e9ecef)',
    borderRadius: '12px',
    outline: 'none',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s',
  },
  addAmountBtn: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s',
  },
  addAmountBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  amountItemsList: {
    marginBottom: '12px',
  },
  amountItemsLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  amountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    marginBottom: '4px',
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  removeAmountBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  taxCheckboxRow: {
    marginBottom: '8px',
  },
  taxCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  taxCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  taxRateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  taxRateInput: {
    width: '60px',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
    textAlign: 'center' as const,
  },
  taxRatePercent: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  taxPresetBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    background: 'var(--bg-secondary, #f8f9fa)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  taxPresetBtnActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
    color: 'var(--accent-primary)',
  },
  amountSummary: {
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    marginTop: '8px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  summaryRowTotal: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-color, #e9ecef)',
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  summaryTotal: {
    color: 'var(--accent-primary)',
    fontWeight: '700',
  },
  simpleAmountDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    marginTop: '12px',
  },
  simpleAmountLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  simpleAmountValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--accent-primary)',
  },
  // Amount description styles for Step 4
  amountDescriptionList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
  },
  amountDescriptionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  amountDescriptionAmount: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    minWidth: '70px',
    flexShrink: 0,
  },
  amountDescriptionInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '6px',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  taxLabel: {
    fontSize: '13px',
    fontStyle: 'italic' as const,
    color: 'var(--text-secondary)',
    minWidth: '70px',
    flexShrink: 0,
  },
  taxValue: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  saveAndAddAnotherBtn: {
    width: '100%',
    marginTop: '20px',
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: '600',
    border: '2px dashed var(--accent-primary)',
    borderRadius: '10px',
    background: 'var(--accent-light, rgba(139, 92, 246, 0.1))',
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
};

export default StepByStepExpenseForm;
