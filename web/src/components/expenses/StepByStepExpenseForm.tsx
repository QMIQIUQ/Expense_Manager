import React, { useState, useEffect, useRef } from 'react';
import { Expense, Category, Card, EWallet, Bank, Transfer, TimeFormat, DateFormat } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTodayLocal, getCurrentTimeLocal, formatDateWithUserFormat } from '../../utils/dateUtils';
import DatePicker from '../common/DatePicker';
import TimePicker from '../common/TimePicker';

// Step type definition
type Step = 1 | 2 | 3 | 4 | 5;

interface StepByStepExpenseFormProps {
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
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

  const handleStepClick = (step: Step) => {
    setCurrentStep(step);
  };

  const handleSubmit = () => {
    const submitData: Record<string, unknown> = { 
      ...formData,
      amount: formData.amount / 100
    };

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

    onSubmit(submitData as Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '');
    const amountInCents = parseInt(digitsOnly) || 0;
    setFormData((prev) => ({ ...prev, amount: amountInCents }));
  };

  const formatCurrency = (amount: number): string => `$${(amount / 100).toFixed(2)}`;

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
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>📅</span>
              <h2 style={styles.stepHeaderTitle}>{t('date')}</h2>
            </div>
            {isNotToday && (
              <div style={styles.dateWarning}>
                ⚠️ {t('notTodayHint') || '注意：选择的日期不是今天'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
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
            </div>
            <div style={styles.amountInputContainer}>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={formData.amount === 0 ? '' : formatCurrency(formData.amount)}
                onChange={handleAmountChange}
                placeholder="$0.00"
                style={styles.amountInput}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>🏷️</span>
              <h2 style={styles.stepHeaderTitle}>{t('selectCategory')}</h2>
            </div>
            <div style={styles.categoryScrollContainer}>
              <div style={styles.categoryScroll}>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => setFormData(prev => ({ ...prev, category: category.name }))}
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
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>📝</span>
              <h2 style={styles.stepHeaderTitle}>{t('description')}</h2>
            </div>
            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>{t('description')}</label>
              <input
                ref={descriptionInputRef}
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('descriptionPlaceholder')}
                style={styles.textInput}
              />
            </div>
            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>{t('notes')} ({t('optional')})</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('notesPlaceholder')}
                style={styles.textArea}
                rows={3}
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
            
            {lastUsedPaymentMethod && (
              <div style={styles.autoSelectHint}>
                ✨ Auto-selected
              </div>
            )}

            <div style={styles.paymentMethodGrid}>
              <div
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash' }))}
                style={{
                  ...styles.paymentMethodCard,
                  ...(formData.paymentMethod === 'cash' ? styles.paymentMethodCardActive : {}),
                }}
              >
                <div style={styles.paymentMethodIcon}>💵</div>
                <div style={styles.paymentMethodName}>{t('cash')}</div>
              </div>
              <div
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'credit_card' }))}
                style={{
                  ...styles.paymentMethodCard,
                  ...(formData.paymentMethod === 'credit_card' ? styles.paymentMethodCardActive : {}),
                }}
              >
                <div style={styles.paymentMethodIcon}>💳</div>
                <div style={styles.paymentMethodName}>{t('creditCard')}</div>
              </div>
              <div
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'e_wallet' }))}
                style={{
                  ...styles.paymentMethodCard,
                  ...(formData.paymentMethod === 'e_wallet' ? styles.paymentMethodCardActive : {}),
                }}
              >
                <div style={styles.paymentMethodIcon}>📱</div>
                <div style={styles.paymentMethodName}>{t('eWallet')}</div>
              </div>
              <div
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'bank' }))}
                style={{
                  ...styles.paymentMethodCard,
                  ...(formData.paymentMethod === 'bank' ? styles.paymentMethodCardActive : {}),
                }}
              >
                <div style={styles.paymentMethodIcon}>🏦</div>
                <div style={styles.paymentMethodName}>{t('bankTransfer')}</div>
              </div>
            </div>

            {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>{t('selectCard')}</label>
                <select
                  value={formData.cardId}
                  onChange={(e) => setFormData(prev => ({ ...prev, cardId: e.target.value }))}
                  style={styles.select}
                >
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.paymentMethod === 'credit_card' && cards.length === 0 && (
              <div style={styles.noItemsContainer}>
                <p style={styles.noItemsText}>{t('noCardsYet')}</p>
                {onCreateCard && (
                  <button type="button" onClick={onCreateCard} style={styles.createButton}>
                    + {t('addCard')}
                  </button>
                )}
              </div>
            )}

            {formData.paymentMethod === 'e_wallet' && (
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>{t('eWalletName')}</label>
                {ewallets.length > 0 ? (
                  <select
                    value={formData.paymentMethodName}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethodName: e.target.value }))}
                    style={styles.select}
                  >
                    {ewallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.name}>{wallet.name}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={formData.paymentMethodName}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentMethodName: e.target.value }))}
                      placeholder={t('eWalletPlaceholder')}
                      style={styles.textInput}
                    />
                    {onCreateEWallet && (
                      <button type="button" onClick={onCreateEWallet} style={{...styles.createButton, marginTop: '8px'}}>
                        + {t('addEWallet')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {formData.paymentMethod === 'bank' && banks.length > 0 && (
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>{t('selectBank')}</label>
                <select
                  value={formData.bankId}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankId: e.target.value }))}
                  style={styles.select}
                >
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.checkboxContainer}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.needsRepaymentTracking}
                  onChange={(e) => setFormData(prev => ({ ...prev, needsRepaymentTracking: e.target.checked }))}
                  style={styles.checkbox}
                />
                <span>{t('repayment')}</span>
              </label>
            </div>

            <div style={styles.checkboxContainer}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={enableTransfer}
                  onChange={(e) => setEnableTransfer(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>{t('transfer')}</span>
              </label>
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
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.headerIcon}>🎯</span>
          {initialData ? (t('editExpense') || '编辑支出') : (t('addExpense') || '新增支出')}
        </div>
        {renderProgressIndicator()}
      </div>

      {renderProgressSummary()}
      {renderStepContent()}

      <div style={styles.navigation}>
        <button
          onClick={currentStep === 1 ? onCancel : handlePrevious}
          style={styles.buttonSecondary}
        >
          {currentStep === 1 ? t('cancel') : t('back')}
        </button>
        <button
          onClick={currentStep === 5 ? handleSubmit : handleNext}
          style={styles.buttonPrimary}
          disabled={
            (currentStep === 2 && formData.amount === 0) ||
            (currentStep === 3 && !formData.category) ||
            (currentStep === 4 && !formData.description.trim()) ||
            (currentStep === 5 && !isStep5Valid())
          }
        >
          {currentStep === 5 ? t('save') : t('next')}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    background: 'var(--card-bg, white)',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  header: {
    background: 'var(--bg-secondary, #f8f9fa)',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color, #e9ecef)',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  headerIcon: {
    fontSize: '20px',
  },
  progressContainer: {
    display: 'flex',
    gap: '6px',
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
    gap: '8px',
    padding: '12px 16px',
    overflowX: 'auto',
    background: 'var(--card-bg, white)',
    borderBottom: '1px solid var(--border-color, #e9ecef)',
  },
  summaryChip: {
    padding: '6px 12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    color: 'var(--text-primary)',
    transition: 'all 0.2s',
  },
  stepContent: {
    padding: '20px',
    minHeight: '320px',
    height: '320px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  stepHeaderIcon: {
    fontSize: '22px',
  },
  stepHeaderTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  amountInputContainer: {
    textAlign: 'center',
  },
  amountInput: {
    fontSize: '36px',
    fontWeight: '700',
    textAlign: 'center',
    border: 'none',
    borderBottom: '2px solid var(--accent-primary)',
    padding: '12px',
    width: '100%',
    maxWidth: '300px',
    outline: 'none',
    color: 'var(--text-primary)',
    background: 'transparent',
  },
  categoryScrollContainer: {
    marginLeft: '0',
    marginRight: '0',
  },
  categoryScroll: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  categoryCard: {
    padding: '12px 8px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
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
};

export default StepByStepExpenseForm;
