import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PaymentMethodType, Card, EWallet, Bank } from '../../types';

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethodType;
  onPaymentMethodChange: (method: PaymentMethodType) => void;
  cardId?: string;
  onCardChange?: (cardId: string) => void;
  bankId?: string;
  onBankChange?: (bankId: string) => void;
  paymentMethodName?: string;
  onPaymentMethodNameChange?: (name: string) => void;
  cards?: Card[];
  banks?: Bank[];
  ewallets?: EWallet[];
  onCreateCard?: () => void;
  onCreateBank?: () => void;
  onCreateEWallet?: () => void;
  showLabels?: boolean;
  compact?: boolean;
  variant?: 'buttons' | 'select';
  disabled?: boolean;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  cardId,
  onCardChange,
  bankId,
  onBankChange,
  paymentMethodName,
  onPaymentMethodNameChange,
  cards = [],
  banks = [],
  ewallets = [],
  onCreateCard,
  onCreateBank,
  onCreateEWallet,
  showLabels = true,
  compact = false,
  variant = 'buttons',
  disabled = false,
}) => {
  const { t } = useLanguage();

  // Auto-select first item when payment method changes
  React.useEffect(() => {
    if (paymentMethod === 'credit_card' && cards.length > 0 && !cardId && cards[0].id) {
      onCardChange?.(cards[0].id);
    }
    if (paymentMethod === 'bank' && banks.length > 0 && !bankId && banks[0].id) {
      onBankChange?.(banks[0].id);
    }
    if (paymentMethod === 'e_wallet' && ewallets.length > 0 && !paymentMethodName) {
      onPaymentMethodNameChange?.(ewallets[0].name);
    }
  }, [paymentMethod, cards, banks, ewallets, cardId, bankId, paymentMethodName, onCardChange, onBankChange, onPaymentMethodNameChange]);

  const handlePaymentMethodClick = (method: PaymentMethodType) => {
    if (disabled) return;
    onPaymentMethodChange(method);
  };

  const cardStyle = compact ? styles.paymentMethodCardSmall : styles.paymentMethodCard;
  const iconStyle = compact ? styles.paymentMethodIconSmall : styles.paymentMethodIcon;
  const nameStyle = compact ? styles.paymentMethodNameSmall : styles.paymentMethodName;

  return (
    <div style={styles.container}>
      {showLabels && (
        <label className="ui-form-label ui-form-label--field">{t('paymentMethod')}</label>
      )}
      
      {variant === 'select' ? (
        <div style={styles.fieldContainer}>
          <label className="ui-form-label ui-form-label--secondary ui-form-label--field" style={{ marginBottom: 'var(--ui-space-1-5)' }}>{t('paymentMethod')}</label>
          <select
            value={paymentMethod}
            onChange={(event) => handlePaymentMethodClick(event.target.value as PaymentMethodType)}
            aria-label={t('paymentMethod')}
            className="ui-control--standard ui-control--full-width"
            disabled={disabled}
          >
            <option value="cash">💵 {t('cash')}</option>
            <option value="credit_card">💳 {t('creditCard')}</option>
            <option value="e_wallet">📱 {t('eWallet')}</option>
            <option value="bank">🏦 {t('bankTransfer')}</option>
          </select>
        </div>
      ) : (
      /* Payment Method Grid */
      <div style={styles.paymentMethodGrid}>
        <button
          type="button"
          onClick={() => handlePaymentMethodClick('cash')}
          style={{
            ...cardStyle,
            ...(paymentMethod === 'cash' ? styles.paymentMethodCardActive : {}),
            ...(disabled ? styles.disabled : {}),
          }}
          aria-pressed={paymentMethod === 'cash'}
          disabled={disabled}
        >
          <div style={iconStyle}>💵</div>
          <div style={nameStyle}>{t('cash')}</div>
        </button>
        <button
          type="button"
          onClick={() => handlePaymentMethodClick('credit_card')}
          style={{
            ...cardStyle,
            ...(paymentMethod === 'credit_card' ? styles.paymentMethodCardActive : {}),
            ...(disabled ? styles.disabled : {}),
          }}
          aria-pressed={paymentMethod === 'credit_card'}
          disabled={disabled}
        >
          <div style={iconStyle}>💳</div>
          <div style={nameStyle}>{t('creditCard')}</div>
        </button>
        <button
          type="button"
          onClick={() => handlePaymentMethodClick('e_wallet')}
          style={{
            ...cardStyle,
            ...(paymentMethod === 'e_wallet' ? styles.paymentMethodCardActive : {}),
            ...(disabled ? styles.disabled : {}),
          }}
          aria-pressed={paymentMethod === 'e_wallet'}
          disabled={disabled}
        >
          <div style={iconStyle}>📱</div>
          <div style={nameStyle}>{t('eWallet')}</div>
        </button>
        <button
          type="button"
          onClick={() => handlePaymentMethodClick('bank')}
          style={{
            ...cardStyle,
            ...(paymentMethod === 'bank' ? styles.paymentMethodCardActive : {}),
            ...(disabled ? styles.disabled : {}),
          }}
          aria-pressed={paymentMethod === 'bank'}
          disabled={disabled}
        >
          <div style={iconStyle}>🏦</div>
          <div style={nameStyle}>{t('bankTransfer')}</div>
        </button>
      </div>
      )}

      {/* Credit Card Selector */}
      {paymentMethod === 'credit_card' && cards.length > 0 && (
        <div style={styles.fieldContainer}>
          <label className="ui-form-label ui-form-label--secondary ui-form-label--field" style={{ marginBottom: 'var(--ui-space-1-5)' }}>{t('selectCard')}</label>
          <select
            value={cardId || ''}
            onChange={(e) => onCardChange?.(e.target.value)}
            className="ui-control--standard ui-control--full-width"
            disabled={disabled}
          >
            {cards.map((card) => (
              <option key={card.id} value={card.id}>{card.name}</option>
            ))}
          </select>
        </div>
      )}

      {paymentMethod === 'credit_card' && cards.length === 0 && (
        <div style={styles.noItemsContainer}>
          <p style={styles.noItemsText}>{t('noCardsYet')}</p>
          {onCreateCard && (
            <button type="button" onClick={onCreateCard} className="ui-action--compact" style={styles.createButton} disabled={disabled}>
              + {t('addCard')}
            </button>
          )}
        </div>
      )}

      {/* E-Wallet Selector */}
      {paymentMethod === 'e_wallet' && (
        <div style={styles.fieldContainer}>
          <label className="ui-form-label ui-form-label--secondary ui-form-label--field" style={{ marginBottom: 'var(--ui-space-1-5)' }}>{t('eWalletName')}</label>
          {ewallets.length > 0 ? (
            <select
              value={paymentMethodName || ''}
              onChange={(e) => onPaymentMethodNameChange?.(e.target.value)}
                className="ui-control--standard ui-control--full-width"
              disabled={disabled}
            >
              {ewallets.map((wallet) => (
                <option key={wallet.id} value={wallet.name}>{wallet.name}</option>
              ))}
            </select>
          ) : (
            <div>
              <input
                type="text"
                value={paymentMethodName || ''}
                onChange={(e) => onPaymentMethodNameChange?.(e.target.value)}
                placeholder={t('eWalletPlaceholder')}
              className="ui-control--standard ui-control--full-width"
                disabled={disabled}
              />
              {onCreateEWallet && (
                <button type="button" onClick={onCreateEWallet} className="ui-action--compact" style={{ ...styles.createButton, marginTop: 'var(--ui-space-8px)' }} disabled={disabled}>
                  + {t('addEWallet')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bank Selector */}
      {paymentMethod === 'bank' && banks.length > 0 && (
        <div style={styles.fieldContainer}>
          <label className="ui-form-label ui-form-label--secondary ui-form-label--field" style={{ marginBottom: 'var(--ui-space-1-5)' }}>{t('selectBank')}</label>
          <select
            value={bankId || ''}
            onChange={(e) => onBankChange?.(e.target.value)}
            className="ui-control--standard ui-control--full-width"
            disabled={disabled}
          >
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>{bank.name}</option>
            ))}
          </select>
        </div>
      )}

      {paymentMethod === 'bank' && banks.length === 0 && (
        <div style={styles.noItemsContainer}>
          <p style={styles.noItemsText}>{t('selectBank')}</p>
          {onCreateBank && (
            <button type="button" onClick={onCreateBank} className="ui-action--compact" style={styles.createButton} disabled={disabled}>
              + {t('addBank')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
  },
  label: {
    display: 'block',
    fontSize: 'var(--ui-font-14px)',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: 'var(--ui-space-8px)',
  },
  paymentMethodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 'var(--ui-space-10px)',
    marginBottom: 'var(--ui-space-16px)',
  },
  paymentMethodCard: {
    padding: 'var(--ui-space-12px) var(--ui-space-8px)',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: 'var(--ui-radius-8px)',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
  },
  paymentMethodCardSmall: {
    padding: 'var(--ui-space-8px) var(--ui-space-6px)',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: 'var(--ui-radius-6px)',
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
    fontSize: 'var(--ui-font-20px)',
    marginBottom: 'var(--ui-space-4px)',
  },
  paymentMethodIconSmall: {
    fontSize: 'var(--ui-font-16px)',
    marginBottom: 'var(--ui-space-2px)',
  },
  paymentMethodName: {
    fontSize: 'var(--ui-font-12px)',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  paymentMethodNameSmall: {
    fontSize: 'var(--ui-font-10px)',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  fieldContainer: {
    marginBottom: 'var(--ui-space-16px)',
  },
  noItemsContainer: {
    textAlign: 'center',
    padding: 'var(--ui-space-16px)',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: 'var(--ui-radius-8px)',
    marginBottom: 'var(--ui-space-16px)',
  },
  noItemsText: {
    fontSize: 'var(--ui-font-13px)',
    color: 'var(--text-secondary)',
    margin: 'var(--ui-space-0px) var(--ui-space-0px) var(--ui-space-8px) var(--ui-space-0px)',
  },
  createButton: {
    background: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    fontWeight: '500',
    cursor: 'pointer',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default PaymentMethodSelector;
