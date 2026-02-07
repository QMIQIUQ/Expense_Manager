import React, { useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import { getTodayLocal } from '../../../utils/dateUtils';

const PendingPaymentsWidget: React.FC<WidgetProps> = ({
  scheduledPayments = [],
  scheduledPaymentRecords = [],
  categories,
  onConfirmScheduledPayment,
  onNavigateToScheduledPayment,
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
      paidDate: getTodayLocal(),
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
      color: 'var(--accent-primary)',
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
    <div className={`pending-payments-list ${isCompact ? 'pending-payments-compact' : ''}`}>
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
            className={`pending-payment-card ${onNavigateToScheduledPayment ? 'clickable' : ''}`}
            onClick={() => onNavigateToScheduledPayment?.(payment.id!)}
            role={onNavigateToScheduledPayment ? 'button' : undefined}
            tabIndex={onNavigateToScheduledPayment ? 0 : undefined}
          >
            <div className="pending-payment-info">
              <span className="pending-payment-icon">{getTypeIcon(payment.type)}</span>
              <div className="pending-payment-details">
                <div className="pending-payment-name">
                  {payment.name}
                </div>
                <div className="pending-payment-meta">
                  <span 
                    className="pending-payment-category"
                    style={{
                      backgroundColor: `${categoryInfo.color}20`,
                      color: categoryInfo.color,
                    }}
                  >
                    {categoryInfo.icon} {payment.category}
                  </span>
                  <span 
                    className={`pending-payment-due ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}`}
                  >
                    {isOverdue 
                      ? `⚠️ ${t('overdue')}` 
                      : isDueSoon 
                        ? `⏰ ${t('dueDay')} ${payment.dueDay}` 
                        : `📅 ${t('dueDay')} ${payment.dueDay}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="pending-payment-actions">
              <span className="pending-payment-amount">
                ${payment.amount.toFixed(2)}
              </span>
              
              {onConfirmScheduledPayment && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickConfirm(payment);
                  }}
                  className="pending-payment-confirm-btn"
                  title={t('confirmPayment')}
                  aria-label={t('confirmPayment')}
                >
                  ✓ {isCompact ? '' : t('confirm')}
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {pendingPayments.length > maxItems && (
        <div className="pending-payments-more">
          +{pendingPayments.length - maxItems} {t('more')}
        </div>
      )}
    </div>
  );
};

export default PendingPaymentsWidget;
