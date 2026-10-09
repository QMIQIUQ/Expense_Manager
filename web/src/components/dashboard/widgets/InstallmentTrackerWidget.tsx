import React, { useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import { formatMoney } from '../../../utils/currencyUtils';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { useCurrencyConversionMapState, type CurrencyConversionEntry } from '../../../hooks/useCurrencyConversionMap';
import { getTodayLocal } from '../../../utils/dateUtils';

const InstallmentTrackerWidget: React.FC<WidgetProps> = ({
  scheduledPayments = [],
  scheduledPaymentRecords = [],
  onNavigateToScheduledPayment,
  displayCurrency,
  size = 'medium',
}) => {
  const { t } = useLanguage();
  const { displayCurrency: savedDisplayCurrency } = useUserSettings();
  const targetCurrency = displayCurrency || savedDisplayCurrency;
  const isCompact = size === 'small';
  const maxItems = isCompact ? 2 : 5;

  // Get active installment-type payments with progress
  const activeInstallments = useMemo(
    () => scheduledPayments.filter(p => p.isActive && !p.isCompleted && p.type === 'installment'),
    [scheduledPayments]
  );
  const conversionEntries = useMemo<CurrencyConversionEntry[]>(() => {
    const today = getTodayLocal();
    const entries: CurrencyConversionEntry[] = [];
    activeInstallments.forEach((payment, index) => {
      const paymentKey = payment.id || `installment-${index}`;
      const currency = payment.currency || 'MYR';
      const totalInstallments = payment.totalInstallments || 0;
      entries.push(
        { key: `${paymentKey}:period`, amount: payment.amount, sourceCurrency: currency, date: today },
        { key: `${paymentKey}:total`, amount: payment.totalAmount || payment.amount * totalInstallments, sourceCurrency: currency, date: today },
      );
      scheduledPaymentRecords
        .filter((record) => record.scheduledPaymentId === payment.id)
        .forEach((record, recordIndex) => {
          entries.push({
            key: `${paymentKey}:paid:${record.id || recordIndex}`,
            amount: record.actualAmount ?? record.expectedAmount,
            sourceCurrency: record.currency || currency,
            date: record.paidDate || today,
          });
        });
    });
    return entries;
  }, [activeInstallments, scheduledPaymentRecords]);
  const conversion = useCurrencyConversionMapState(conversionEntries, targetCurrency);
  const installments = useMemo(() => activeInstallments.map((payment, index) => {
    const paymentKey = payment.id || `installment-${index}`;
    const paidRecords = scheduledPaymentRecords.filter((record) => record.scheduledPaymentId === payment.id);
    const paidAmounts = paidRecords.map((record, recordIndex) => conversion.amountsByKey[`${paymentKey}:paid:${record.id || recordIndex}`]);
    const totalPaid = paidAmounts.every(Number.isFinite) ? paidAmounts.reduce((sum, amount) => sum + amount, 0) : paidRecords.length === 0 ? 0 : null;
    const totalAmount = conversion.amountsByKey[`${paymentKey}:total`];
    const periodAmount = conversion.amountsByKey[`${paymentKey}:period`];
    const safeTotalAmount = Number.isFinite(totalAmount) ? totalAmount : null;
    const remaining = safeTotalAmount !== null && totalPaid !== null ? Math.max(0, safeTotalAmount - totalPaid) : null;
    const totalInstallments = payment.totalInstallments || 0;
    const progress = totalInstallments > 0 ? (paidRecords.length / totalInstallments) * 100 : null;

    return {
      ...payment,
      paidCount: paidRecords.length,
      totalInstallments,
      totalPaid,
      totalAmount: safeTotalAmount,
      periodAmount: Number.isFinite(periodAmount) ? periodAmount : null,
      remaining,
      progress: progress === null ? null : Math.round(progress * 100) / 100,
    };
  }).sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)), [activeInstallments, conversion.amountsByKey, scheduledPaymentRecords]);
  const formatDisplayAmount = (amount: number | null): string => amount === null
    ? conversion.isLoading ? '…' : '—'
    : formatMoney(amount, targetCurrency);

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
      {!conversion.isLoading && conversion.failedKeys.length > 0 && (
        <div className="text-xs mb-2" style={{ color: 'var(--warning-text)' }}>{t('conversionUnavailable')}</div>
      )}
      {installments.slice(0, maxItems).map((inst) => (
        <div
          key={inst.id}
          className={`installment-item ${onNavigateToScheduledPayment ? 'clickable' : ''}`}
          onClick={() => onNavigateToScheduledPayment?.(inst.id!)}
          onKeyDown={onNavigateToScheduledPayment ? handleKeyDown(() => onNavigateToScheduledPayment(inst.id!)) : undefined}
          role={onNavigateToScheduledPayment ? 'button' : undefined}
          tabIndex={onNavigateToScheduledPayment ? 0 : undefined}
          aria-label={onNavigateToScheduledPayment ? `${inst.name} - ${inst.paidCount}/${inst.totalInstallments}` : undefined}
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
                {inst.paidCount}/{inst.totalInstallments} {t('installmentsPaid')} · {formatDisplayAmount(inst.periodAmount)}/{t('period')}
              </div>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap', marginLeft: '8px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isCompact ? '13px' : '14px' }}>
                {formatDisplayAmount(inst.remaining)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('remaining')}</div>
            </div>
          </div>
          <div className="progress-bar" style={{ height: '6px', borderRadius: '3px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, inst.progress ?? 0)}%`,
                backgroundColor: inst.progress !== null && inst.progress >= 80 ? 'var(--success-text)' : 'var(--accent-primary)',
                height: '100%',
                borderRadius: '3px',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>{inst.progress === null ? '—' : `${inst.progress.toFixed(0)}%`}</span>
            <span>{formatDisplayAmount(inst.totalPaid)} / {formatDisplayAmount(inst.totalAmount)}</span>
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
