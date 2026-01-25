import React, { useState, useEffect, useRef } from 'react';
import { Expense, Category, Card, EWallet, Bank, Transfer, TimeFormat, DateFormat } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTodayLocal, getCurrentTimeLocal, formatDateDisplay } from '../../utils/dateUtils';
import DatePicker from '../common/DatePicker';

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
  initialDate?: string; // Auto-populate from DateNavigator
  timeFormat?: TimeFormat;
  dateFormat?: DateFormat;
  lastUsedPaymentMethod?: string; // Remember last used payment method
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
  onCreateEWallet,
  onCreateCard,
  onAddTransfer,
  initialDate,
  timeFormat = '24h',
  dateFormat = 'YYYY-MM-DD',
  lastUsedPaymentMethod,
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  // Form data state
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

  // Transfer states
  const [enableTransfer, setEnableTransfer] = useState(!!initialTransfer);
  const [transferToPaymentMethod, setTransferToPaymentMethod] = useState<'cash' | 'credit_card' | 'e_wallet' | 'bank'>(
    initialTransfer?.toPaymentMethod || 'cash'
  );
  const [transferToCardId, setTransferToCardId] = useState(initialTransfer?.toCardId || '');
  const [transferToEWalletName, setTransferToEWalletName] = useState(initialTransfer?.toPaymentMethodName || '');
  const [transferToBankId, setTransferToBankId] = useState(initialTransfer?.toBankId || '');

  // Auto-focus on amount and description fields
  useEffect(() => {
    if (currentStep === 2 && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    } else if (currentStep === 4 && descriptionInputRef.current) {
      setTimeout(() => descriptionInputRef.current?.focus(), 100);
    }
  }, [currentStep]);

  // Auto-select first item when payment category changes
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
  }, [formData.paymentMethod, currentStep, cards, ewallets, banks]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleStepClick = (step: Step) => {
    setCurrentStep(step);
  };

  const handleSubmit = () => {
    // Prepare data based on payment method
    const submitData: any = { 
      ...formData,
      amount: formData.amount / 100
    };

    // Clean up fields based on payment method
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

    // Handle transfer if enabled
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
        
        if (fromPaymentMethod === 'credit_card' && formData.cardId) {
          transferData.fromCardId = formData.cardId;
        }
        if (fromPaymentMethod === 'bank' && formData.bankId) {
          transferData.fromBankId = formData.bankId;
        }
        if (toPaymentMethod === 'credit_card' && transferToCardId) {
          transferData.toCardId = transferToCardId;
        }
        if (toPaymentMethod === 'bank' && transferToBankId) {
          transferData.toBankId = transferToBankId;
        }
        
        onAddTransfer(transferData, true).catch((err) => {
          console.error('Failed to create transfer:', err);
        });
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

  const formatCurrency = (amount: number): string => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const getCategoryEmoji = (categoryName: string): string => {
    const category = categories.find(c => c.name === categoryName);
    return category?.emoji || '📝';
  };

  const getPaymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'cash': return t('cash') || '现金';
      case 'credit_card': return t('creditCard') || '信用卡';
      case 'e_wallet': return t('eWallet') || '电子钱包';
      case 'bank': return t('bank') || '银行';
      default: return method;
    }
  };

  // Render progress summary bar
  const renderProgressSummary = () => {
    return (
      <div style={styles.progressSummary}>
        {currentStep > 1 && (
          <div style={styles.summaryChip} onClick={() => handleStepClick(1)}>
            📅 {formatDateDisplay(formData.date, dateFormat)}
          </div>
        )}
        {currentStep > 2 && formData.amount > 0 && (
          <div style={styles.summaryChip} onClick={() => handleStepClick(2)}>
            💰 {formatCurrency(formData.amount)}
          </div>
        )}
        {currentStep > 3 && formData.category && (
          <div style={styles.summaryChip} onClick={() => handleStepClick(3)}>
            {getCategoryEmoji(formData.category)} {formData.category}
          </div>
        )}
        {currentStep > 4 && formData.description && (
          <div style={styles.summaryChip} onClick={() => handleStepClick(4)}>
            📝 {formData.description.slice(0, 15)}{formData.description.length > 15 ? '...' : ''}
          </div>
        )}
      </div>
    );
  };

  // Render progress indicator
  const renderProgressIndicator = () => {
    return (
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
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepIcon}>📅</div>
            <h2 style={styles.stepTitle}>{t('selectDate') || '选择日期'}</h2>
            <p style={styles.stepSubtitle}>{t('whenDidThisExpenseOccur') || '请选择支出发生的日期'}</p>
            <DatePicker
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ ...prev, date }))}
              dateFormat={dateFormat}
            />
          </div>
        );

      case 2:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepIcon}>💰</div>
            <h2 style={styles.stepTitle}>{t('enterAmount') || '输入金额'}</h2>
            <p style={styles.stepSubtitle}>{t('howMuchDidYouSpend') || '这笔支出的金额是多少？'}</p>
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
              <div style={styles.autoKeyboardHint}>
                ⌨️ {t('keyboardWillAppear') || '键盘自动弹出'}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepIcon}>🏷️</div>
            <h2 style={styles.stepTitle}>{t('selectCategory') || '选择类别'}</h2>
            <p style={styles.stepSubtitle}>{t('whatTypeOfExpense') || '这是什么类型的支出？'}</p>
            <div style={styles.categoryGrid}>
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => setFormData(prev => ({ ...prev, category: category.name }))}
                  style={{
                    ...styles.categoryCard,
                    ...(formData.category === category.name ? styles.categoryCardActive : {}),
                  }}
                >
                  <div style={styles.categoryEmoji}>{category.emoji}</div>
                  <div style={styles.categoryName}>{category.name}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepIcon}>📝</div>
            <h2 style={styles.stepTitle}>{t('addDetails') || '添加描述'}</h2>
            <p style={styles.stepSubtitle}>{t('describeYourExpense') || '简单描述这笔支出'}</p>
            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>{t('description') || '描述'}</label>
              <input
                ref={descriptionInputRef}
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('descriptionPlaceholder') || '例如：午餐'}
                style={styles.textInput}
              />
            </div>
            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>{t('notes') || '备注'} ({t('optional') || '可选'})</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('notesPlaceholder') || '添加额外信息...'}
                style={styles.textArea}
                rows={3}
              />
              <div style={styles.autoKeyboardHint}>
                ⌨️ {t('keyboardWillAppear') || '键盘自动弹出'}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepIcon}>💳</div>
            <h2 style={styles.stepTitle}>{t('paymentMethod') || '支付方式'}</h2>
            <p style={styles.stepSubtitle}>{t('howDidYouPay') || '您是如何支付的？'}</p>
            
            {lastUsedPaymentMethod && (
              <div style={styles.autoSelectHint}>
                ✨ {t('autoSelectedLastUsed') || '已自动选择上次使用的支付方式'}
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
                <div style={styles.paymentMethodName}>{t('cash') || '现金'}</div>
              </div>
              <div
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'credit_card' }))}
                style={{
                  ...styles.paymentMethodCard,
                  ...(formData.paymentMethod === 'credit_card' ? styles.paymentMethodCardActive : {}),
                }}
              >
                <div style={styles.paymentMethodIcon}>💳</div>
                <div style={styles.paymentMethodName}>{t('creditCard') || '信用卡'}</div>
              </div>
              <div
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'e_wallet' }))}
                style={{
                  ...styles.paymentMethodCard,
                  ...(formData.paymentMethod === 'e_wallet' ? styles.paymentMethodCardActive : {}),
                }}
              >
                <div style={styles.paymentMethodIcon}>📱</div>
                <div style={styles.paymentMethodName}>{t('eWallet') || '电子钱包'}</div>
              </div>
              <div
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'bank' }))}
                style={{
                  ...styles.paymentMethodCard,
                  ...(formData.paymentMethod === 'bank' ? styles.paymentMethodCardActive : {}),
                }}
              >
                <div style={styles.paymentMethodIcon}>🏦</div>
                <div style={styles.paymentMethodName}>{t('bank') || '银行'}</div>
              </div>
            </div>

            {/* Payment method details */}
            {formData.paymentMethod === 'credit_card' && cards.length > 0 && (
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>{t('selectCard') || '选择信用卡'}</label>
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

            {formData.paymentMethod === 'e_wallet' && (
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>{t('eWalletName') || '电子钱包名称'}</label>
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
                  <input
                    type="text"
                    value={formData.paymentMethodName}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethodName: e.target.value }))}
                    placeholder="PayPal, Apple Pay, etc."
                    style={styles.textInput}
                  />
                )}
              </div>
            )}

            {formData.paymentMethod === 'bank' && banks.length > 0 && (
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>{t('selectBank') || '选择银行'}</label>
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

            {/* Additional options */}
            <div style={styles.checkboxContainer}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.needsRepaymentTracking}
                  onChange={(e) => setFormData(prev => ({ ...prev, needsRepaymentTracking: e.target.checked }))}
                  style={styles.checkbox}
                />
                <span>{t('trackRepayment') || '追踪还款'}</span>
              </label>
              <p style={styles.checkboxHint}>{t('trackRepaymentHint') || '在仪表板中追踪此笔支出的还款状态'}</p>
            </div>

            <div style={styles.checkboxContainer}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={enableTransfer}
                  onChange={(e) => setEnableTransfer(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>{t('recordTransfer') || '同时记录转账'}</span>
              </label>
              <p style={styles.checkboxHint}>{t('recordTransferHint') || '从此支付方式转账到另一个账户'}</p>
            </div>

            {enableTransfer && (
              <div style={styles.transferOptions}>
                <label style={styles.fieldLabel}>{t('transferTo') || '转账到：'}</label>
                <div style={styles.paymentMethodGrid}>
                  <div
                    onClick={() => setTransferToPaymentMethod('cash')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'cash' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>💵</div>
                    <div style={styles.paymentMethodNameSmall}>{t('cash') || '现金'}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('credit_card')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'credit_card' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>💳</div>
                    <div style={styles.paymentMethodNameSmall}>{t('card') || '卡'}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('e_wallet')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'e_wallet' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>📱</div>
                    <div style={styles.paymentMethodNameSmall}>{t('wallet') || '钱包'}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('bank')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'bank' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>🏦</div>
                    <div style={styles.paymentMethodNameSmall}>{t('bank') || '银行'}</div>
                  </div>
                </div>

                {transferToPaymentMethod === 'credit_card' && cards.length > 0 && (
                  <select
                    value={transferToCardId}
                    onChange={(e) => setTransferToCardId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">{t('selectCard') || '选择信用卡'}</option>
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
                    placeholder={t('eWalletName') || '电子钱包名称'}
                    style={styles.textInput}
                  />
                )}

                {transferToPaymentMethod === 'bank' && banks.length > 0 && (
                  <select
                    value={transferToBankId}
                    onChange={(e) => setTransferToBankId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">{t('selectBank') || '选择银行'}</option>
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

  return (
    <div style={styles.container}>
      {/* Header with progress indicator */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.headerIcon}>🎯</span>
          {t('addExpense') || '新增支出'}
        </div>
        {renderProgressIndicator()}
      </div>

      {/* Progress summary */}
      {renderProgressSummary()}

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      <div style={styles.navigation}>
        <button
          onClick={currentStep === 1 ? onCancel : handlePrevious}
          style={styles.buttonSecondary}
        >
          ← {currentStep === 1 ? (t('cancel') || '取消') : (t('previous') || '上一步')}
        </button>
        <button
          onClick={currentStep === 5 ? handleSubmit : handleNext}
          style={styles.buttonPrimary}
          disabled={
            (currentStep === 2 && formData.amount === 0) ||
            (currentStep === 3 && !formData.category) ||
            (currentStep === 4 && !formData.description.trim()) ||
            (currentStep === 5 &&
              (
                (formData.paymentMethodType === 'ewallet' && !formData.paymentMethodName?.trim()) ||
                (formData.paymentMethodType === 'card' && !formData.cardId) ||
                (formData.paymentMethodType === 'bank' && !formData.bankId)
              )
            )
          }
        >
          {currentStep === 5 ? `✓ ${t('save') || '保存'}` : `${t('next') || '下一步'} →`}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    padding: '24px',
    color: 'white',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  progressContainer: {
    display: 'flex',
    gap: '8px',
  },
  progressBar: {
    flex: 1,
    height: '4px',
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '2px',
    transition: 'all 0.3s',
  },
  progressBarActive: {
    background: 'white',
  },
  progressSummary: {
    display: 'flex',
    gap: '8px',
    padding: '16px',
    overflowX: 'auto',
    background: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
  },
  summaryChip: {
    padding: '8px 16px',
    background: 'white',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: '2px solid var(--accent-primary)',
    color: 'var(--accent-primary)',
    transition: 'all 0.2s',
  },
  stepContent: {
    padding: '32px 24px',
    minHeight: '400px',
  },
  stepIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  stepTitle: {
    fontSize: '24px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '8px',
    color: 'var(--text-primary)',
  },
  stepSubtitle: {
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: '32px',
    color: 'var(--text-secondary)',
  },
  amountInputContainer: {
    textAlign: 'center',
  },
  amountInput: {
    fontSize: '48px',
    fontWeight: '700',
    textAlign: 'center',
    border: 'none',
    borderBottom: '3px solid var(--accent-primary)',
    padding: '16px',
    width: '100%',
    maxWidth: '400px',
    outline: 'none',
    color: 'var(--text-primary)',
  },
  autoKeyboardHint: {
    marginTop: '12px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  categoryCard: {
    padding: '24px 16px',
    background: '#f8f9fa',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  categoryCardActive: {
    background: 'var(--accent-light)',
    border: '2px solid var(--accent-primary)',
  },
  categoryEmoji: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  categoryName: {
    fontSize: '14px',
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
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  textArea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    outline: 'none',
    background: 'white',
  },
  paymentMethodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  paymentMethodCard: {
    padding: '24px 16px',
    background: '#f8f9fa',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  paymentMethodCardActive: {
    background: 'var(--accent-light)',
    border: '2px solid var(--accent-primary)',
  },
  paymentMethodIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  paymentMethodName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  paymentMethodCardSmall: {
    padding: '16px 12px',
    background: '#f8f9fa',
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
    background: '#f8f9fa',
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
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  navigation: {
    display: 'flex',
    gap: '12px',
    padding: '24px',
    borderTop: '1px solid #e9ecef',
  },
  buttonSecondary: {
    flex: 1,
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    background: 'white',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    flex: 1,
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default StepByStepExpenseForm;
