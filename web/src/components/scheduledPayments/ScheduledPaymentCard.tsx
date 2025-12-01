import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ScheduledPayment, 
  ScheduledPaymentRecord,
  ScheduledPaymentSummary,
  Category,
  Card,
  Bank,
  EWallet
} from '../../types';
import { EditIcon, DeleteIcon } from '../icons';
import PaymentRecordForm from './PaymentRecordForm';
import PaymentHistoryList from './PaymentHistoryList';
import { getCurrencySymbol } from './ScheduledPaymentForm';

// Responsive styles matching RecurringExpenseManager
const responsiveCardStyles = `
  .scheduled-payment-card .desktop-actions {
    display: none;
    gap: 8px;
  }
  .scheduled-payment-card .mobile-actions {
    display: block;
  }
  @media (min-width: 640px) {
    .scheduled-payment-card .desktop-actions {
      display: flex;
    }
    .scheduled-payment-card .mobile-actions {
      display: none;
    }
  }
`;

interface ScheduledPaymentCardProps {
  payment: ScheduledPayment;
  summary?: ScheduledPaymentSummary;
  records?: ScheduledPaymentRecord[];
  categories: Category[];
  cards?: Card[];
  banks?: Bank[];
  ewallets?: EWallet[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
  onConfirmPayment: (data: {
    expectedAmount: number;
    actualAmount: number;
    difference: number;
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    paidDate: string;
    paymentMethod?: string;
    cardId?: string;
    paymentMethodName?: string;
    bankId?: string;
    note?: string;
  }) => void;
  onDeletePaymentRecord?: (recordId: string) => void;
  isPeriodPaid?: boolean;
}

const ScheduledPaymentCard: React.FC<ScheduledPaymentCardProps> = ({
  payment,
  summary,
  records = [],
  categories,
  cards = [],
  banks = [],
  ewallets = [],
  onEdit,
  onDelete,
  onToggleActive,
  onConfirmPayment,
  onDeletePaymentRecord,
  isPeriodPaid = false,
}) => {
  const { t } = useLanguage();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  // Get category color from user's category settings
  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category && category.color) {
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 99, g: 102, b: 241 };
      };
      
      const rgb = hexToRgb(category.color);
      const bg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
      const text = category.color;
      
      return { background: bg, color: text };
    }
    return { background: '#e0e7ff', color: '#4338ca' };
  };

  // Type icon
  const getTypeIcon = () => {
    switch (payment.type) {
      case 'subscription': return '🔄';
      case 'installment': return '📅';
      case 'debt': return '💳';
      default: return '📋';
    }
  };

  // Calculate progress for installment/debt
  const getProgress = () => {
    if (!summary) return null;
    if (payment.type === 'subscription') return null;
    
    if (payment.totalAmount && summary.totalPaid !== undefined) {
      const totalWithInterest = payment.totalAmount * (1 + (payment.interestRate || 0) / 100);
      const percentage = Math.min(100, (summary.totalPaid / totalWithInterest) * 100);
      return {
        percentage,
        totalPaid: summary.totalPaid,
        totalAmount: totalWithInterest,
        remaining: summary.remainingAmount || 0,
      };
    }
    return null;
  };

  const progress = getProgress();
  const currencySymbol = getCurrencySymbol(payment.currency);
  const categoryStyle = getCategoryColor(payment.category);

  const handlePaymentSubmit = (data: {
    expectedAmount: number;
    actualAmount: number;
    difference?: number;
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    paidDate: string;
    paymentMethod?: string;
    cardId?: string;
    paymentMethodName?: string;
    bankId?: string;
    note?: string;
  }) => {
    onConfirmPayment({
      ...data,
      difference: data.actualAmount - data.expectedAmount,
    });
    setShowPaymentForm(false);
  };

  return (
    <>
      <style>{responsiveCardStyles}</style>
      <div className="scheduled-payment-card">
        {/* Row 1: Type Icon, Category, Status, Amount */}
        <div style={styles.row1}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '16px' }}>{getTypeIcon()}</span>
            <span 
              className="category-chip"
              style={{
                ...styles.category,
                ...categoryStyle
              }}
            >
              {categories.find(c => c.name === payment.category)?.icon} {payment.category}
            </span>
            {payment.isActive ? (
              <span style={styles.activeStatus}>● {t('active')}</span>
            ) : (
              <span style={styles.inactiveStatus}>● {t('inactive')}</span>
            )}
            {payment.isCompleted && (
              <span style={styles.completedStatus}>✓ {t('completed')}</span>
            )}
          </div>
          <div style={styles.amount}>
            {currencySymbol}{payment.amount.toFixed(2)}
            <span style={styles.frequency}>/{payment.frequency === 'monthly' ? t('freqMonthly') : t('freqYearly')}</span>
          </div>
        </div>

        {/* Row 2: Name and Description */}
        <div style={styles.row2}>
          <h4 style={styles.name}>{payment.name}</h4>
          {payment.description && (
            <p style={styles.description}>{payment.description}</p>
          )}
        </div>

        {/* Row 3: Payment Info */}
        <div style={styles.row3}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>
            {payment.paymentMethod === 'credit_card' && (
              <span>💳 {cards.find(c => c.id === payment.cardId)?.name || t('creditCard')}</span>
            )}
            {payment.paymentMethod === 'e_wallet' && (
              <span>📱 {payment.paymentMethodName || t('eWallet')}</span>
            )}
            {payment.paymentMethod === 'bank' && (
              <span>🏦 {banks.find(b => b.id === payment.bankId)?.name || t('bankTransfer')}</span>
            )}
            {(!payment.paymentMethod || payment.paymentMethod === 'cash') && (
              <span>💵 {t('cash')}</span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            📅 {t('dueDay')}: {payment.dueDay}
          </div>
          {summary?.nextDueDate && (
            <div style={{ fontSize: '12px', color: 'var(--warning-text)' }}>
              ⏰ {t('nextDue')}: {summary.nextDueDate}
            </div>
          )}
        </div>

        {/* Progress Bar for Installment/Debt */}
        {progress && (
          <div style={styles.progressContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {t('totalPaid')}: {currencySymbol}{progress.totalPaid.toFixed(2)} / {currencySymbol}{progress.totalAmount.toFixed(2)}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {progress.percentage.toFixed(0)}%
              </span>
            </div>
            <div style={styles.progressBar}>
              <div 
                style={{ 
                  ...styles.progressFill,
                  width: `${progress.percentage}%`,
                  backgroundColor: progress.percentage >= 100 ? 'var(--success-text)' : 'var(--accent-primary)',
                }} 
              />
            </div>
            {progress.remaining > 0 && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--warning-text)' }}>
                {t('remainingAmount')}: {currencySymbol}{progress.remaining.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {summary && (
          <div style={styles.summaryGrid}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>{t('totalPaid')}:</span>
              <div style={{ fontWeight: 600, color: 'var(--success-text)' }}>{currencySymbol}{summary.totalPaid.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>{t('paymentCount')}:</span>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{summary.paymentCount}</div>
            </div>
            {summary.remainingPayments !== undefined && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>{t('remainingPayments')}:</span>
                <div style={{ fontWeight: 600, color: 'var(--warning-text)' }}>{summary.remainingPayments}</div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Row */}
        <div style={styles.actionsRow}>
          {/* Confirm Payment Button */}
          {payment.isActive && !payment.isCompleted && (
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              disabled={isPeriodPaid}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: isPeriodPaid ? 'var(--success-bg)' : 'var(--accent-light)',
                color: isPeriodPaid ? 'var(--success-text)' : 'var(--accent-primary)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isPeriodPaid ? 'default' : 'pointer',
                opacity: isPeriodPaid ? 0.8 : 1,
              }}
            >
              {isPeriodPaid ? (
                <>✓ {t('paidThisMonth')}</>
              ) : (
                <>💰 {t('confirmPayment')}</>
              )}
            </button>
          )}

          {/* View History Button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📋 {showHistory ? t('hidePaymentHistory') : t('viewPaymentHistory')}
          </button>

          {/* Desktop Actions */}
          <div className="desktop-actions">
            <button
              onClick={() => onToggleActive(!payment.isActive)}
              className={`btn-icon ${payment.isActive ? 'btn-icon-warning' : 'btn-icon-success'}`}
              title={payment.isActive ? t('pause') : t('resume')}
            >
              {payment.isActive ? '⏸' : '▶'}
            </button>
            <button onClick={onEdit} className="btn-icon btn-icon-primary" title={t('edit')}>
              <EditIcon size={18} />
            </button>
            <button onClick={onDelete} className="btn-icon btn-icon-danger" title={t('delete')}>
              <DeleteIcon size={18} />
            </button>
          </div>

          {/* Mobile Menu */}
          <div className="mobile-actions" style={styles.menuContainer}>
            <button
              className="menu-trigger-button"
              onClick={() => setOpenMenuId(openMenuId === payment.id ? null : payment.id!)}
              aria-label="More"
            >
              ⋮
            </button>
            {openMenuId === payment.id && (
              <div style={styles.menu}>
                <button
                  className="menu-item-hover"
                  style={styles.menuItem}
                  onClick={() => {
                    setOpenMenuId(null);
                    onToggleActive(!payment.isActive);
                  }}
                >
                  <span style={styles.menuIcon}>{payment.isActive ? '⏸' : '▶'}</span>
                  {payment.isActive ? t('pause') : t('resume')}
                </button>
                <button
                  className="menu-item-hover"
                  style={styles.menuItem}
                  onClick={() => {
                    setOpenMenuId(null);
                    onEdit();
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
                    onDelete();
                  }}
                >
                  <span style={styles.menuIcon}><DeleteIcon size={16} /></span>
                  {t('delete')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Form */}
        {showPaymentForm && (
          <PaymentRecordForm
            scheduledPayment={payment}
            cards={cards}
            banks={banks}
            ewallets={ewallets}
            onSubmit={handlePaymentSubmit}
            onCancel={() => setShowPaymentForm(false)}
          />
        )}

        {/* Payment History */}
        {showHistory && (
          <PaymentHistoryList
            records={records}
            onDelete={onDeletePaymentRecord}
          />
        )}
      </div>
    </>
  );
};

const styles = {
  row1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  row2: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  row3: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  category: {
    padding: '5px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600' as const,
    boxShadow: '0 1px 3px var(--shadow)',
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
  completedStatus: {
    color: 'var(--success-text)',
    fontSize: '11px',
    fontWeight: '500' as const,
  },
  amount: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: 'var(--error-text)',
    whiteSpace: 'nowrap' as const,
  },
  frequency: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '400' as const,
  },
  name: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  description: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  progressContainer: {
    marginTop: '4px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '3px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '8px',
    padding: '8px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    fontSize: '12px',
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  menuContainer: {
    position: 'relative' as const,
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
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
};

export default ScheduledPaymentCard;
