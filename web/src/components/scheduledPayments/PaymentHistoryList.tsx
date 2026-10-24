import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { CurrencyCode, ScheduledPaymentRecord } from '../../types';
import { DeleteIcon } from '../icons';
import { formatMoney, normalizeCurrencyCode } from '../../utils/currencyUtils';
import { useCurrencyConversionMapState, type CurrencyConversionEntry } from '../../hooks/useCurrencyConversionMap';

interface PaymentHistoryListProps {
  records: ScheduledPaymentRecord[];
  defaultCurrency?: CurrencyCode;
  onDelete?: (recordId: string) => void;
}

const PaymentHistoryList: React.FC<PaymentHistoryListProps> = ({
  records,
  defaultCurrency = 'MYR',
  onDelete,
}) => {
  const { t } = useLanguage();
  const { displayCurrency } = useUserSettings();

  const conversionEntries = useMemo<CurrencyConversionEntry[]>(() => records.flatMap((record, index) => {
    const key = record.id || `record-${index}`;
    const sourceCurrency = record.currency || defaultCurrency;
    const date = record.paidDate || record.dueDate;
    return [
      { key: `${key}:expected`, amount: record.expectedAmount, sourceCurrency, date },
      { key: `${key}:actual`, amount: record.actualAmount, sourceCurrency, date },
    ];
  }), [defaultCurrency, records]);
  const conversion = useCurrencyConversionMapState(conversionEntries, displayCurrency);
  const convertedTotal = (kind: 'expected' | 'actual'): number | null => {
    const values = records.map((record, index) => {
      const key = `${record.id || `record-${index}`}:${kind}`;
      return conversion.amountsByKey[key];
    });
    return values.every(Number.isFinite) ? values.reduce((sum, amount) => sum + amount, 0) : null;
  };
  const totalExpected = convertedTotal('expected');
  const totalPaid = convertedTotal('actual');
  const formatConverted = (amount: number, record: ScheduledPaymentRecord, index: number, kind: 'expected' | 'actual'): string => {
    const sourceCurrency = normalizeCurrencyCode(record.currency || defaultCurrency);
    const key = `${record.id || `record-${index}`}:${kind}`;
    const convertedAmount = conversion.amountsByKey[key];
    if (sourceCurrency === displayCurrency && Number.isFinite(convertedAmount)) return formatMoney(amount, displayCurrency);
    if (Number.isFinite(convertedAmount)) return formatMoney(convertedAmount, displayCurrency);
    if (conversion.isLoading) return '…';
    return `${formatMoney(amount, sourceCurrency)} (${t('conversionUnavailable') || 'conversion unavailable'})`;
  };

  if (records.length === 0) {
    return (
      <div 
        style={{
          padding: 'var(--ui-space-24px)',
          textAlign: 'center',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--ui-radius-8px)',
          color: 'var(--text-secondary)',
        }}
      >
        <p>{t('noPaymentRecords')}</p>
      </div>
    );
  }

  return (
    <div 
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--ui-radius-8px)',
        padding: 'var(--ui-space-12px)',
      }}
    >
      <h5 style={{ 
        margin: 'var(--ui-space-0px) var(--ui-space-0px) var(--ui-space-12px)',
        fontSize: 'var(--ui-font-14px)',
        fontWeight: 600, 
        color: 'var(--text-primary)' 
      }}>
        📋 {t('paymentHistory')}
      </h5>

      {/* Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--ui-space-8px)',
        marginBottom: 'var(--ui-space-12px)',
        padding: 'var(--ui-space-8px)',
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--ui-radius-6px)',
        fontSize: 'var(--ui-font-12px)',
      }}>
        {!conversion.isLoading && conversion.failedKeys.length > 0 && (
          <div style={{ gridColumn: '1 / -1', color: 'var(--warning-text)' }}>
            {t('conversionUnavailable') || 'Conversion unavailable'}
          </div>
        )}
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>{t('totalExpected')}:</span>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {totalExpected === null ? (conversion.isLoading ? '…' : '—') : formatMoney(totalExpected, displayCurrency)}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>{t('totalPaid')}:</span>
          <div style={{ fontWeight: 600, color: 'var(--success-text)' }}>
            {totalPaid === null ? (conversion.isLoading ? '…' : '—') : formatMoney(totalPaid, displayCurrency)}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>{t('totalDifference')}:</span>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {totalExpected === null || totalPaid === null
              ? (conversion.isLoading ? '…' : '—')
              : (() => {
                const difference = totalPaid - totalExpected;
                return <span style={{ color: difference > 0 ? 'var(--info-text)' : difference < 0 ? 'var(--warning-text)' : 'var(--text-primary)' }}>
                  {difference > 0 ? '+' : ''}{formatMoney(difference, displayCurrency)}
                </span>;
              })()}
          </div>
        </div>
      </div>

      {/* Records List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-8px)' }}>
        {records.map((record, index) => {
          const difference = conversion.amountsByKey[`${record.id || `record-${index}`}:actual`]
            - conversion.amountsByKey[`${record.id || `record-${index}`}:expected`];
          
          return (
            <div
              key={record.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--ui-space-10px) var(--ui-space-12px)',
                backgroundColor: 'var(--card-bg)',
                borderRadius: 'var(--ui-radius-6px)',
                fontSize: 'var(--ui-font-13px)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-space-8px)', marginBottom: 'var(--ui-space-4px)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {record.periodYear}/{String(record.periodMonth).padStart(2, '0')}
                  </span>
                  {difference !== 0 && (
                    <span 
                      style={{
                        padding: 'var(--ui-space-2px) var(--ui-space-6px)',
                        borderRadius: 'var(--ui-radius-4px)',
                        fontSize: 'var(--ui-font-11px)',
                        fontWeight: 500,
                        backgroundColor: difference > 0 ? 'var(--info-bg)' : 'var(--warning-bg)',
                        color: difference > 0 ? 'var(--info-text)' : 'var(--warning-text)',
                      }}
                    >
                  {difference > 0 ? t('overpaid') : t('underpaid')} {Number.isFinite(difference)
                    ? formatMoney(Math.abs(difference), displayCurrency)
                    : `${formatMoney(Math.abs(record.actualAmount - record.expectedAmount), normalizeCurrencyCode(record.currency || defaultCurrency))} (${t('conversionUnavailable') || 'conversion unavailable'})`}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--ui-font-12px)' }}>
                  📅 {record.paidDate}
                  {record.paymentMethod && (
                    <span style={{ marginLeft: 'var(--ui-space-8px)' }}>
                      {record.paymentMethod === 'credit_card' && '💳'}
                      {record.paymentMethod === 'e_wallet' && '📱'}
                      {record.paymentMethod === 'bank' && '🏦'}
                      {record.paymentMethod === 'cash' && '💵'}
                    </span>
                  )}
                  {record.note && (
                    <span style={{ marginLeft: 'var(--ui-space-8px)' }}>📝 {record.note}</span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-space-12px)' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--success-text)' }}>
                    {formatConverted(record.actualAmount, record, index, 'actual')}
                  </div>
                  {record.expectedAmount !== record.actualAmount && (
                    <div style={{ fontSize: 'var(--ui-font-11px)', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                      {formatConverted(record.expectedAmount, record, index, 'expected')}
                    </div>
                  )}
                </div>
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(record.id!)}
                    className="btn-icon btn-icon-danger"
                    title={t('delete')}
                    style={{ padding: 'var(--ui-space-6px)' }}
                  >
                    <DeleteIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentHistoryList;
