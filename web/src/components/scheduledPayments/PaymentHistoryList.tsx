import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrencyCode, ScheduledPaymentRecord } from '../../types';
import { DeleteIcon } from '../icons';
import { formatMoney, normalizeCurrencyCode } from '../../utils/currencyUtils';

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

  if (records.length === 0) {
    return (
      <div 
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          color: 'var(--text-secondary)',
        }}
      >
        <p>{t('noPaymentRecords')}</p>
      </div>
    );
  }

  // Group totals by source currency so historical records are never summed across currencies.
  const currencyTotals = records.reduce<Record<string, { paid: number; expected: number }>>((totals, record) => {
    const currency = normalizeCurrencyCode(record.currency || defaultCurrency);
    const current = totals[currency] || { paid: 0, expected: 0 };
    totals[currency] = {
      paid: current.paid + record.actualAmount,
      expected: current.expected + record.expectedAmount,
    };
    return totals;
  }, {});

  return (
    <div 
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '12px',
      }}
    >
      <h5 style={{ 
        margin: '0 0 12px', 
        fontSize: '14px', 
        fontWeight: 600, 
        color: 'var(--text-primary)' 
      }}>
        📋 {t('paymentHistory')}
      </h5>

      {/* Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginBottom: '12px',
        padding: '8px',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '6px',
        fontSize: '12px',
      }}>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>{t('totalExpected')}:</span>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {Object.entries(currencyTotals).map(([currency, totals]) => (
              <div key={currency}>{formatMoney(totals.expected, currency)}</div>
            ))}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>{t('totalPaid')}:</span>
          <div style={{ fontWeight: 600, color: 'var(--success-text)' }}>
            {Object.entries(currencyTotals).map(([currency, totals]) => (
              <div key={currency}>{formatMoney(totals.paid, currency)}</div>
            ))}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>{t('totalDifference')}:</span>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {Object.entries(currencyTotals).map(([currency, totals]) => {
              const difference = totals.paid - totals.expected;
              return (
                <div key={currency} style={{ color: difference > 0 ? 'var(--info-text)' : difference < 0 ? 'var(--warning-text)' : 'var(--text-primary)' }}>
                  {difference > 0 ? '+' : ''}{formatMoney(difference, currency)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Records List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {records.map((record) => {
          const difference = record.actualAmount - record.expectedAmount;
          
          return (
            <div
              key={record.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {record.periodYear}/{String(record.periodMonth).padStart(2, '0')}
                  </span>
                  {difference !== 0 && (
                    <span 
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        backgroundColor: difference > 0 ? 'var(--info-bg)' : 'var(--warning-bg)',
                        color: difference > 0 ? 'var(--info-text)' : 'var(--warning-text)',
                      }}
                    >
                  {difference > 0 ? t('overpaid') : t('underpaid')} {formatMoney(Math.abs(difference), record.currency || defaultCurrency)}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  📅 {record.paidDate}
                  {record.paymentMethod && (
                    <span style={{ marginLeft: '8px' }}>
                      {record.paymentMethod === 'credit_card' && '💳'}
                      {record.paymentMethod === 'e_wallet' && '📱'}
                      {record.paymentMethod === 'bank' && '🏦'}
                      {record.paymentMethod === 'cash' && '💵'}
                    </span>
                  )}
                  {record.note && (
                    <span style={{ marginLeft: '8px' }}>📝 {record.note}</span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--success-text)' }}>
                    {formatMoney(record.actualAmount, record.currency || defaultCurrency)}
                  </div>
                  {record.expectedAmount !== record.actualAmount && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                      {formatMoney(record.expectedAmount, record.currency || defaultCurrency)}
                    </div>
                  )}
                </div>
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(record.id!)}
                    className="btn-icon btn-icon-danger"
                    title={t('delete')}
                    style={{ padding: '6px' }}
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
