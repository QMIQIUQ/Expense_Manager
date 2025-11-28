import React, { useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const PendingPaymentsWidget: React.FC<WidgetProps> = ({
  scheduledPayments = [],
  scheduledPaymentRecords = [],
  categories,
  onConfirmScheduledPayment,
  size = 'medium',
}) => {
  const { t } = useLanguage();
  
  const isCompact = size === 'small';
  const maxItems = useMemo(() => {
    switch (size) {
      case 'small':
        return 2;
      case 'large':
        return 6;
      default:
        return 4;
    }
  }, [size]);

  // Get pending payments for current month
  const pendingPayments = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    return scheduledPayments
      .filter(payment => payment.isActive && !payment.isCompleted)
      .filter(payment => {
        // Check if this month's payment has been made
        const isPaid = scheduledPaymentRecords.some(
          record =>
            record.scheduledPaymentId === payment.id &&
            record.periodYear === currentYear &&
            record.periodMonth === currentMonth
        );
        return !isPaid;
      })
      .sort((a, b) => a.dueDay - b.dueDay);
  }, [scheduledPayments, scheduledPaymentRecords]);

  // Quick confirm handler
  const handleQuickConfirm = (payment: typeof pendingPayments[0]) => {
    if (!onConfirmScheduledPayment) return;
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    onConfirmScheduledPayment(payment.id!, {
      expectedAmount: payment.amount,
      actualAmount: payment.amount,
      difference: 0,
      periodYear: currentYear,
      periodMonth: currentMonth,
      dueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(payment.dueDay).padStart(2, '0')}`,
      paidDate: today.toISOString().split('T')[0],
      paymentMethod: payment.paymentMethod,
      cardId: payment.cardId,
      paymentMethodName: payment.paymentMethodName,
      bankId: payment.bankId,
    });
  };

  if (pendingPayments.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>✅</span>
        <p>{t('noPendingPayments') || 'No pending payments this month!'}</p>
      </div>
    );
  }

  // Get category info for a payment
  const getCategoryInfo = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category ? {
      icon: category.icon,
      color: category.color,
    } : {
      icon: '📋',
      color: '#6366f1',
    };
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription': return '🔄';
      case 'installment': return '📅';
      case 'debt': return '💳';
      default: return '📋';
    }
  };

  return (
    <div className={`pending-payments-list ${isCompact ? 'pending-payments-compact' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {pendingPayments.slice(0, maxItems).map((payment) => {
        const categoryInfo = getCategoryInfo(payment.category);
        const today = new Date();
        const currentDay = today.getDate();
        const daysUntilDue = payment.dueDay - currentDay;
        const isOverdue = daysUntilDue < 0;
        const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

        return (
          <div
            key={payment.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isCompact ? '10px' : '12px 14px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '10px',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '16px' }}>{getTypeIcon(payment.type)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ 
                  fontWeight: 500, 
                  color: 'var(--text-primary)',
                  fontSize: isCompact ? '13px' : '14px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {payment.name}
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)',
                  marginTop: '2px'
                }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: `${categoryInfo.color}20`,
                    color: categoryInfo.color,
                    fontSize: '11px',
                  }}>
                    {categoryInfo.icon} {payment.category}
                  </span>
                  <span style={{
                    color: isOverdue ? 'var(--error-text)' : isDueSoon ? 'var(--warning-text)' : 'var(--text-secondary)',
                    fontWeight: isOverdue || isDueSoon ? 500 : 400,
                  }}>
                    {isOverdue 
                      ? `⚠️ ${t('overdue')}` 
                      : isDueSoon 
                        ? `⏰ ${t('dueDay')} ${payment.dueDay}` 
                        : `📅 ${t('dueDay')} ${payment.dueDay}`}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ 
                fontWeight: 600, 
                color: 'var(--error-text)',
                fontSize: isCompact ? '14px' : '15px',
                whiteSpace: 'nowrap',
              }}>
                ${payment.amount.toFixed(2)}
              </span>
              
              {onConfirmScheduledPayment && (
                <button
                  onClick={() => handleQuickConfirm(payment)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--success-bg)',
                    color: 'var(--success-text)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  title={t('confirmPayment')}
                >
                  ✓ {isCompact ? '' : t('confirm')}
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {pendingPayments.length > maxItems && (
        <div style={{ 
          textAlign: 'center', 
          padding: '8px', 
          color: 'var(--text-secondary)',
          fontSize: '12px',
        }}>
          +{pendingPayments.length - maxItems} {t('more')}
        </div>
      )}
    </div>
  );
};

export default PendingPaymentsWidget;
