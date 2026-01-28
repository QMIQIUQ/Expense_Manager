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
        <label style={styles.label}>{t('paymentMethod')}</label>
      )}
      
      {/* Payment Method Grid */}
      <div style={styles.paymentMethodGrid}>
        <div
          onClick={() => handlePaymentMethodClick('cash')}
          style={{
            ...cardStyle,
            ...(paymentMethod === 'cash' ? styles.paymentMethodCardActive : {}),
            ...(disabled ? styles.disabled : {}),
          }}
        >
          <div style={iconStyle}>💵</div>
          <div style={nameStyle}>{t('cash')}</div>
        </div>
        <div
          onClick={() => handlePaymentMethodClick('credit_card')}
          style={{
            ...cardStyle,
            ...(paymentMethod === 'credit_card' ? styles.paymentMethodCardActive : {}),
            ...(disabled ? styles.disabled : {}),
          }}
        >
          <div style={iconStyle}>💳</div>
          <div style={nameStyle}>{t('creditCard')}</div>
        </div>
        <div
          onClick={() => handlePaymentMethodClick('e_wallet')}
          style={{
            ...cardStyle,
            ...(paymentMethod === 'e_wallet' ? styles.paymentMethodCardActive : {}),
            ...(disabled ? styles.disabled : {}),
          }}
        >
          <div style={iconStyle}>📱</div>
          <div style={nameStyle}>{t('eWallet')}</div>
        </div>
        <div
          onClick={() => handlePaymentMethodClick('bank')}
          style={{
            ...cardStyle,
            ...(paymentMethod === 'bank' ? styles.paymentMethodCardActive : {}),
            ...(disabled ? styles.disabled : {}),
          }}
        >
          <div style={iconStyle}>🏦</div>
          <div style={nameStyle}>{t('bankTransfer')}</div>
        </div>
      </div>

      {/* Credit Card Selector */}
      {paymentMethod === 'credit_card' && cards.length > 0 && (
        <div style={styles.fieldContainer}>
          <label style={styles.fieldLabel}>{t('selectCard')}</label>
          <select
            value={cardId || ''}
            onChange={(e) => onCardChange?.(e.target.value)}
            style={styles.select}
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
            <button type="button" onClick={onCreateCard} style={styles.createButton} disabled={disabled}>
              + {t('addCard')}
            </button>
          )}
        </div>
      )}

      {/* E-Wallet Selector */}
      {paymentMethod === 'e_wallet' && (
        <div style={styles.fieldContainer}>
          <label style={styles.fieldLabel}>{t('eWalletName')}</label>
          {ewallets.length > 0 ? (
            <select
              value={paymentMethodName || ''}
              onChange={(e) => onPaymentMethodNameChange?.(e.target.value)}
              style={styles.select}
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
                style={styles.textInput}
                disabled={disabled}
              />
              {onCreateEWallet && (
                <button type="button" onClick={onCreateEWallet} style={{...styles.createButton, marginTop: '8px'}} disabled={disabled}>
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
          <label style={styles.fieldLabel}>{t('selectBank')}</label>
          <select
            value={bankId || ''}
            onChange={(e) => onBankChange?.(e.target.value)}
            style={styles.select}
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
            <button type="button" onClick={onCreateBank} style={styles.createButton} disabled={disabled}>
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
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '8px',
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
  paymentMethodCardSmall: {
    padding: '8px 6px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '6px',
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
  paymentMethodIconSmall: {
    fontSize: '16px',
    marginBottom: '2px',
  },
  paymentMethodName: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  paymentMethodNameSmall: {
    fontSize: '10px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  fieldContainer: {
    marginBottom: '16px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  noItemsContainer: {
    textAlign: 'center',
    padding: '16px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  noItemsText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: '0 0 8px 0',
  },
  createButton: {
    padding: '8px 16px',
    background: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default PaymentMethodSelector;
