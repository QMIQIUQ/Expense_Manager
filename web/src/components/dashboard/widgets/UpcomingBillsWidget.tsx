import React, { useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const UpcomingBillsWidget: React.FC<WidgetProps> = ({
  scheduledPayments = [],
  scheduledPaymentRecords = [],
  onNavigateToScheduledPayment,
  size = 'medium',
}) => {
  const { t } = useLanguage();
  const isCompact = size === 'small';
  const maxItems = isCompact ? 3 : 7;

  // Get bills due in next 7 days
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    return scheduledPayments
      .filter(p => p.isActive && !p.isCompleted)
      .filter(p => {
        // Check if already paid this month
        const isPaid = scheduledPaymentRecords.some(
          r => r.scheduledPaymentId === p.id &&
            r.periodYear === currentYear &&
            r.periodMonth === currentMonth
        );
        if (isPaid) return false;

        // Check if due within next 7 days
        const daysUntil = p.dueDay - currentDay;
        return daysUntil >= 0 && daysUntil <= 7;
      })
      .sort((a, b) => a.dueDay - b.dueDay);
  }, [scheduledPayments, scheduledPaymentRecords]);

  const handleKeyDown = (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  if (upcomingBills.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>✅</span>
        <p>{t('noUpcomingBills')}</p>
      </div>
    );
  }

  return (
    <div className="upcoming-bills-widget">
      {upcomingBills.slice(0, maxItems).map((bill) => {
        const today = new Date();
        const daysUntil = bill.dueDay - today.getDate();
        const isToday = daysUntil === 0;
        const isTomorrow = daysUntil === 1;

        return (
          <div
            key={bill.id}
            className={`upcoming-bill-item ${onNavigateToScheduledPayment ? 'clickable' : ''}`}
            onClick={() => onNavigateToScheduledPayment?.(bill.id!)}
            onKeyDown={onNavigateToScheduledPayment ? handleKeyDown(() => onNavigateToScheduledPayment(bill.id!)) : undefined}
            role={onNavigateToScheduledPayment ? 'button' : undefined}
            tabIndex={onNavigateToScheduledPayment ? 0 : undefined}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              marginBottom: '8px',
              cursor: onNavigateToScheduledPayment ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: isCompact ? '16px' : '20px' }}>
                {isToday ? '🔴' : isTomorrow ? '🟡' : '📅'}
              </span>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isCompact ? '13px' : '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bill.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {isToday
                    ? t('dueToday')
                    : isTomorrow
                      ? t('dueTomorrow')
                      : `${t('dueIn')} ${daysUntil} ${t('days')}`}
                </div>
              </div>
            </div>
            <span style={{ fontWeight: 600, color: isToday ? 'var(--error-text)' : 'var(--text-primary)', fontSize: isCompact ? '13px' : '14px', whiteSpace: 'nowrap' }}>
              ${bill.amount.toFixed(2)}
            </span>
          </div>
        );
      })}
      {upcomingBills.length > maxItems && (
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '4px' }}>
          +{upcomingBills.length - maxItems} {t('more')}
        </div>
      )}
    </div>
  );
};

export default UpcomingBillsWidget;
