import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ScheduledPayment, Category } from '../../types';
import { formatCurrency } from './ScheduledPaymentForm';

interface UpcomingRemindersProps {
  scheduledPayments: ScheduledPayment[];
  categories: Category[];
  onPaymentClick?: (payment: ScheduledPayment) => void;
}

const UpcomingReminders: React.FC<UpcomingRemindersProps> = ({
  scheduledPayments,
  categories,
  onPaymentClick,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // Get payments with upcoming due dates
  const upcomingPayments = useMemo(() => {
    return scheduledPayments
      .filter(payment => {
        if (!payment.isActive || payment.isCompleted) return false;
        if (!payment.enableReminders) return false;
        
        const reminderDays = payment.reminderDaysBefore || 3;
        const dueDay = payment.dueDay;
        
        // Calculate days until due
        let daysUntilDue: number;
        if (dueDay >= currentDay) {
          daysUntilDue = dueDay - currentDay;
        } else {
          // Due date is next month
          daysUntilDue = (daysInMonth - currentDay) + dueDay;
        }
        
        // Show if within reminder window
        return daysUntilDue <= reminderDays && daysUntilDue >= 0;
      })
      .map(payment => {
        const dueDay = payment.dueDay;
        let daysUntilDue: number;
        if (dueDay >= currentDay) {
          daysUntilDue = dueDay - currentDay;
        } else {
          daysUntilDue = (daysInMonth - currentDay) + dueDay;
        }
        return { payment, daysUntilDue };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [scheduledPayments, currentDay, daysInMonth]);

  // Get category info
  const getCategoryInfo = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return {
      icon: category?.icon || '📋',
      color: category?.color || '#6366f1',
    };
  };

  // Get due date label
  const getDueDateLabel = (daysUntilDue: number) => {
    if (daysUntilDue === 0) return { text: t('dueToday'), color: 'var(--error-text)' };
    if (daysUntilDue === 1) return { text: t('dueTomorrow'), color: 'var(--warning-text)' };
    return { text: `${t('dueIn')} ${daysUntilDue} ${t('days')}`, color: 'var(--text-secondary)' };
  };

  // Don't render anything if no upcoming payments
  if (upcomingPayments.length === 0) {
    return null;
  }

  return (
    <div 
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: 'var(--card-bg)' }}
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left transition-all hover:opacity-80"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <h3 className="font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          🔔 {t('upcomingPayments')}
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: 'var(--error-bg)', 
              color: 'var(--error-text)' 
            }}
          >
            {upcomingPayments.length}
          </span>
        </h3>
        <span 
          className="text-lg transition-transform"
          style={{ 
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'var(--text-secondary)'
          }}
        >
          ▼
        </span>
      </button>
      
      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {upcomingPayments.map(({ payment, daysUntilDue }) => {
            const categoryInfo = getCategoryInfo(payment.category);
            const dueLabel = getDueDateLabel(daysUntilDue);

          return (
            <button
              key={payment.id}
              onClick={() => onPaymentClick?.(payment)}
              className="recent-expense-item"
              style={{ 
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                borderColor: daysUntilDue === 0 
                  ? 'var(--error-border)' 
                  : daysUntilDue === 1 
                    ? 'var(--warning-border)' 
                    : undefined
              }}
            >
              <div className="recent-expense-info">
                <span 
                  className="recent-expense-category"
                  style={{ 
                    backgroundColor: daysUntilDue === 0 
                      ? 'var(--error-bg)' 
                      : daysUntilDue === 1 
                        ? 'var(--warning-bg)' 
                        : undefined,
                    color: daysUntilDue === 0 
                      ? 'var(--error-text)' 
                      : daysUntilDue === 1 
                        ? 'var(--warning-text)' 
                        : undefined
                  }}
                >
                  {categoryInfo.icon} {payment.category}
                </span>
                <span className="recent-expense-desc">{payment.name}</span>
              </div>
              
              <div className="recent-expense-right">
                <span className="recent-expense-amount error-text">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
                <span 
                  className="recent-expense-date"
                  style={{ color: dueLabel.color }}
                >
                  {dueLabel.text}
                </span>
              </div>
            </button>
          );
        })}
        </div>
      )}
    </div>
  );
};

export default UpcomingReminders;
