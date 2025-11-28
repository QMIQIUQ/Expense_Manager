import React, { useMemo } from 'react';
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
    if (daysUntilDue === 0) return { text: t('today'), color: 'var(--error-text)' };
    if (daysUntilDue === 1) return { text: t('tomorrow'), color: 'var(--warning-text)' };
    return { text: `${t('dueIn')} ${daysUntilDue} ${t('days')}`, color: 'var(--text-secondary)' };
  };

  if (upcomingPayments.length === 0) {
    return (
      <div 
        className="p-4 rounded-lg text-center"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <span className="text-2xl">🔔</span>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('noUpcomingReminders')}
        </p>
      </div>
    );
  }

  return (
    <div 
      className="p-4 rounded-lg"
      style={{ backgroundColor: 'var(--card-bg)' }}
    >
      <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        🔔 {t('upcomingPayments')}
      </h3>
      
      <div className="flex flex-col gap-2">
        {upcomingPayments.map(({ payment, daysUntilDue }) => {
          const categoryInfo = getCategoryInfo(payment.category);
          const dueLabel = getDueDateLabel(daysUntilDue);

          return (
            <button
              key={payment.id}
              onClick={() => onPaymentClick?.(payment)}
              className="flex items-center justify-between p-3 rounded-lg text-left transition-all hover:opacity-80"
              style={{ 
                backgroundColor: daysUntilDue === 0 
                  ? 'var(--error-bg)' 
                  : daysUntilDue === 1 
                    ? 'var(--warning-bg)' 
                    : 'var(--bg-secondary)' 
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${categoryInfo.color}20` }}
                >
                  {categoryInfo.icon}
                </div>
                <div className="min-w-0">
                  <div 
                    className="font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {payment.name}
                  </div>
                  <div 
                    className="text-sm"
                    style={{ color: dueLabel.color }}
                  >
                    {dueLabel.text}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div 
                  className="font-semibold"
                  style={{ color: 'var(--error-text)' }}
                >
                  {formatCurrency(payment.amount, payment.currency)}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('dueDay')} {payment.dueDay}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingReminders;
