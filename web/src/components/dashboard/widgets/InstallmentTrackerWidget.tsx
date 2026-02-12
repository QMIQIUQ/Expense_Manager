import React, { useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const InstallmentTrackerWidget: React.FC<WidgetProps> = ({
  scheduledPayments = [],
  scheduledPaymentRecords = [],
  onNavigateToScheduledPayment,
  size = 'medium',
}) => {
  const { t } = useLanguage();
  const isCompact = size === 'small';
  const maxItems = isCompact ? 2 : 5;

  // Get active installment-type payments with progress
  const installments = useMemo(() => {
    return scheduledPayments
      .filter(p => p.isActive && !p.isCompleted && p.type === 'installment')
      .map(p => {
        const paidRecords = scheduledPaymentRecords.filter(r => r.scheduledPaymentId === p.id);
        const paidCount = paidRecords.length;
        const totalInstallments = p.totalInstallments || 0;
        const totalPaid = paidRecords.reduce((sum, r) => sum + (r.actualAmount || r.expectedAmount), 0);
        const totalAmount = p.totalAmount || (p.amount * totalInstallments);
        const remaining = Math.max(0, totalAmount - totalPaid);
        const progress = totalInstallments > 0 ? (paidCount / totalInstallments) * 100 : 0;

        return {
          ...p,
          paidCount,
          totalInstallments,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          progress: Math.round(progress * 100) / 100,
        };
      })
      .sort((a, b) => b.progress - a.progress);
  }, [scheduledPayments, scheduledPaymentRecords]);

  const handleKeyDown = (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  if (installments.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>📋</span>
        <p>{t('noInstallments')}</p>
      </div>
    );
  }

  return (
    <div className="installment-tracker-widget">
      {installments.slice(0, maxItems).map((inst) => (
        <div
          key={inst.id}
          className={`installment-item ${onNavigateToScheduledPayment ? 'clickable' : ''}`}
          onClick={() => onNavigateToScheduledPayment?.(inst.id!)}
          onKeyDown={onNavigateToScheduledPayment ? handleKeyDown(() => onNavigateToScheduledPayment(inst.id!)) : undefined}
          role={onNavigateToScheduledPayment ? 'button' : undefined}
          tabIndex={onNavigateToScheduledPayment ? 0 : undefined}
          style={{
            padding: '12px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            marginBottom: '8px',
            cursor: onNavigateToScheduledPayment ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isCompact ? '13px' : '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📅 {inst.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {inst.paidCount}/{inst.totalInstallments} {t('installmentsPaid')} · ${inst.amount.toFixed(2)}/{t('period')}
              </div>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap', marginLeft: '8px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isCompact ? '13px' : '14px' }}>
                ${inst.remaining.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('remaining')}</div>
            </div>
          </div>
          <div className="progress-bar" style={{ height: '6px', borderRadius: '3px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, inst.progress)}%`,
                backgroundColor: inst.progress >= 80 ? 'var(--success-text)' : 'var(--accent-primary)',
                height: '100%',
                borderRadius: '3px',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>{inst.progress.toFixed(0)}%</span>
            <span>${inst.totalPaid.toFixed(2)} / ${inst.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      ))}
      {installments.length > maxItems && (
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '4px' }}>
          +{installments.length - maxItems} {t('more')}
        </div>
      )}
    </div>
  );
};

export default InstallmentTrackerWidget;
