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

  // Get category info
  const category = categories.find(c => c.name === payment.category);
  const categoryStyle = category ? {
    background: `${category.color}20`,
    color: category.color,
  } : {
    background: '#e0e7ff',
    color: '#4338ca',
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
    <div 
      className="scheduled-payment-card"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header Row: Type, Category, Status, Amount */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '16px' }}>{getTypeIcon()}</span>
          <span 
            style={{
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 600,
              ...categoryStyle,
            }}
          >
            {category?.icon} {payment.category}
          </span>
          {payment.isActive ? (
            <span style={{ color: 'var(--success-text)', fontSize: '11px', fontWeight: 500 }}>
              ● {t('active')}
            </span>
          ) : (
            <span style={{ color: 'var(--error-text)', fontSize: '11px', fontWeight: 500 }}>
              ● {t('inactive')}
            </span>
          )}
          {payment.isCompleted && (
            <span style={{ color: 'var(--success-text)', fontSize: '11px', fontWeight: 500 }}>
              ✓ {t('completed')}
            </span>
          )}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--error-text)', whiteSpace: 'nowrap' }}>
          ${payment.amount.toFixed(2)}
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
            /{payment.frequency === 'monthly' ? t('freqMonthly') : t('freqYearly')}
          </span>
        </div>
      </div>

      {/* Name and Description */}
      <div>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {payment.name}
        </h4>
        {payment.description && (
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {payment.description}
          </p>
        )}
      </div>

      {/* Payment Info Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
        <span>📅 {t('dueDay')}: {payment.dueDay}</span>
        {payment.paymentMethod && (
          <span>
            {payment.paymentMethod === 'credit_card' && '💳'}
            {payment.paymentMethod === 'e_wallet' && '📱'}
            {payment.paymentMethod === 'bank' && '🏦'}
            {payment.paymentMethod === 'cash' && '💵'}
            {' '}
            {payment.paymentMethod === 'credit_card' && cards.find(c => c.id === payment.cardId)?.name}
            {payment.paymentMethod === 'e_wallet' && payment.paymentMethodName}
            {payment.paymentMethod === 'bank' && banks.find(b => b.id === payment.bankId)?.name}
            {payment.paymentMethod === 'cash' && t('cash')}
          </span>
        )}
        {summary?.nextDueDate && (
          <span style={{ color: 'var(--warning-text)' }}>
            ⏰ {t('nextDue')}: {summary.nextDueDate}
          </span>
        )}
      </div>

      {/* Progress Bar for Installment/Debt */}
      {progress && (
        <div style={{ marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {t('totalPaid')}: ${progress.totalPaid.toFixed(2)} / ${progress.totalAmount.toFixed(2)}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {progress.percentage.toFixed(0)}%
            </span>
          </div>
          <div style={{ 
            height: '6px', 
            backgroundColor: 'var(--bg-secondary)', 
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${progress.percentage}%`,
                backgroundColor: progress.percentage >= 100 ? 'var(--success-text)' : 'var(--accent-primary)',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} 
            />
          </div>
          {progress.remaining > 0 && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--warning-text)' }}>
              {t('remainingAmount')}: ${progress.remaining.toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
          gap: '8px',
          padding: '8px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>{t('totalPaid')}:</span>
            <div style={{ fontWeight: 600, color: 'var(--success-text)' }}>${summary.totalPaid.toFixed(2)}</div>
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

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
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
          📋 {showHistory ? t('hideHistory') : t('viewHistory')}
        </button>

        {/* Desktop Actions */}
        <div className="desktop-actions" style={{ display: 'flex', gap: '8px' }}>
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
        <div className="mobile-actions" style={{ position: 'relative' }}>
          <button
            className="menu-trigger-button"
            onClick={() => setOpenMenuId(openMenuId === payment.id ? null : payment.id!)}
            aria-label="More"
          >
            ⋮
          </button>
          {openMenuId === payment.id && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '4px',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 9999,
              minWidth: '160px',
            }}>
              <button
                className="menu-item-hover"
                style={{
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
                  textAlign: 'left',
                }}
                onClick={() => {
                  setOpenMenuId(null);
                  onToggleActive(!payment.isActive);
                }}
              >
                <span>{payment.isActive ? '⏸' : '▶'}</span>
                {payment.isActive ? t('pause') : t('resume')}
              </button>
              <button
                className="menu-item-hover"
                style={{
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
                  textAlign: 'left',
                }}
                onClick={() => {
                  setOpenMenuId(null);
                  onEdit();
                }}
              >
                <EditIcon size={16} />
                {t('edit')}
              </button>
              <button
                className="menu-item-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--error-text)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => {
                  setOpenMenuId(null);
                  onDelete();
                }}
              >
                <DeleteIcon size={16} />
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
  );
};

export default ScheduledPaymentCard;
