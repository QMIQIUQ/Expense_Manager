import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ScheduledPayment, ScheduledPaymentRecord, Category } from '../../types';
import { getCurrencySymbol } from './ScheduledPaymentForm';

interface PaymentAnalyticsProps {
  scheduledPayments: ScheduledPayment[];
  paymentRecords: ScheduledPaymentRecord[];
  categories: Category[];
}

const PaymentAnalytics: React.FC<PaymentAnalyticsProps> = ({
  scheduledPayments,
  paymentRecords,
  categories,
}) => {
  const { t } = useLanguage();

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Get predominant currency (most used currency among active payments)
    const activePayments = scheduledPayments.filter(p => p.isActive && !p.isCompleted);
    const currencyCounts: { [key: string]: number } = {};
    activePayments.forEach(p => {
      const curr = p.currency || 'MYR';
      currencyCounts[curr] = (currencyCounts[curr] || 0) + 1;
    });
    const predominantCurrency = Object.entries(currencyCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'MYR';
    const currencySymbol = getCurrencySymbol(predominantCurrency);

    // Total scheduled amount this month
    const totalScheduledMonthly = activePayments.reduce((sum, p) => {
      if (p.frequency === 'monthly') return sum + p.amount;
      if (p.frequency === 'yearly') return sum + (p.amount / 12);
      return sum;
    }, 0);

    // This month's records
    const thisMonthRecords = paymentRecords.filter(
      r => r.periodYear === currentYear && r.periodMonth === currentMonth
    );

    // Total paid this month
    const totalPaidThisMonth = thisMonthRecords.reduce((sum, r) => sum + r.actualAmount, 0);

    // On-time vs late payments
    let onTimeCount = 0;
    let lateCount = 0;
    paymentRecords.forEach(record => {
      const dueDate = new Date(record.dueDate);
      const paidDate = new Date(record.paidDate);
      if (paidDate <= dueDate) {
        onTimeCount++;
      } else {
        lateCount++;
      }
    });

    // Payment accuracy (expected vs actual)
    const totalExpected = paymentRecords.reduce((sum, r) => sum + r.expectedAmount, 0);
    const totalActual = paymentRecords.reduce((sum, r) => sum + r.actualAmount, 0);
    const accuracy = totalExpected > 0 ? (Math.min(totalActual, totalExpected) / totalExpected) * 100 : 100;

    // Average payment amount
    const avgPayment = paymentRecords.length > 0 
      ? totalActual / paymentRecords.length 
      : 0;

    // Category breakdown
    const byCategory: { [key: string]: { count: number; amount: number; color: string } } = {};
    activePayments.forEach(payment => {
      if (!byCategory[payment.category]) {
        const cat = categories.find(c => c.name === payment.category);
        byCategory[payment.category] = { count: 0, amount: 0, color: cat?.color || '#6366f1' };
      }
      byCategory[payment.category].count++;
      byCategory[payment.category].amount += payment.amount;
    });

    // Payment method breakdown
    const byPaymentMethod: { [key: string]: { count: number; amount: number } } = {};
    activePayments.forEach(payment => {
      const method = payment.paymentMethod || 'cash';
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, amount: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].amount += payment.amount;
    });

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; expected: number; actual: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthName = date.toLocaleDateString('default', { month: 'short' });
      
      const monthRecords = paymentRecords.filter(
        r => r.periodYear === year && r.periodMonth === month
      );
      
      const expected = monthRecords.reduce((sum, r) => sum + r.expectedAmount, 0);
      const actual = monthRecords.reduce((sum, r) => sum + r.actualAmount, 0);
      
      monthlyTrend.push({ month: monthName, expected, actual });
    }

    return {
      totalScheduledMonthly,
      totalPaidThisMonth,
      onTimeCount,
      lateCount,
      accuracy,
      avgPayment,
      byCategory,
      byPaymentMethod,
      monthlyTrend,
      totalPayments: paymentRecords.length,
      currencySymbol,
    };
  }, [scheduledPayments, paymentRecords, categories]);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'credit_card': return '💳';
      case 'e_wallet': return '📱';
      case 'bank': return '🏦';
      default: return '💰';
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return t('cash');
      case 'credit_card': return t('creditCard');
      case 'e_wallet': return t('eWallet');
      case 'bank': return t('bankTransfer');
      default: return method;
    }
  };

  // Find max value for trend chart scaling
  const maxTrendValue = Math.max(
    ...analytics.monthlyTrend.map(m => Math.max(m.expected, m.actual)),
    1
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="form-card">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('totalScheduled')}</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {analytics.currencySymbol}{analytics.totalScheduledMonthly.toFixed(2)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>/month</div>
        </div>

        <div className="form-card">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('onTimePayments')}</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--success-text)' }}>
            {analytics.onTimeCount}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {analytics.totalPayments > 0 
              ? `${((analytics.onTimeCount / analytics.totalPayments) * 100).toFixed(0)}%`
              : '0%'
            }
          </div>
        </div>

        <div className="form-card">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('latePayments')}</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--warning-text)' }}>
            {analytics.lateCount}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {analytics.totalPayments > 0 
              ? `${((analytics.lateCount / analytics.totalPayments) * 100).toFixed(0)}%`
              : '0%'
            }
          </div>
        </div>

        <div className="form-card">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('paymentAccuracy')}</div>
          <div className="text-2xl font-bold mt-1" style={{ 
            color: analytics.accuracy >= 95 ? 'var(--success-text)' : 
                   analytics.accuracy >= 80 ? 'var(--warning-text)' : 'var(--error-text)' 
          }}>
            {analytics.accuracy.toFixed(1)}%
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('expectedVsActual')}</div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="form-card">
        <h3 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          📈 {t('monthlyTrend')}
        </h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {analytics.monthlyTrend.map((month, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="flex gap-1 items-end h-24 w-full justify-center">
                <div 
                  className="w-3 rounded-t"
                  style={{
                    height: `${(month.expected / maxTrendValue) * 100}%`,
                    backgroundColor: 'var(--accent-light)',
                    minHeight: '4px',
                  }}
                  title={`Expected: ${analytics.currencySymbol}${month.expected.toFixed(2)}`}
                />
                <div 
                  className="w-3 rounded-t"
                  style={{
                    height: `${(month.actual / maxTrendValue) * 100}%`,
                    backgroundColor: 'var(--accent-primary)',
                    minHeight: '4px',
                  }}
                  title={`Actual: ${analytics.currencySymbol}${month.actual.toFixed(2)}`}
                />
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                {month.month}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--accent-light)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Expected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Actual</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-card">
          <h3 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            📊 {t('categoryBreakdown')}
          </h3>
          <div className="flex flex-col gap-3">
            {Object.entries(analytics.byCategory).map(([category, data]) => {
              const percentage = (data.amount / analytics.totalScheduledMonthly) * 100;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{category}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {analytics.currencySymbol}{data.amount.toFixed(2)}
                    </span>
                  </div>
                  <div 
                    className="h-2 rounded-full"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: data.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(analytics.byCategory).length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                No data available
              </p>
            )}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="form-card">
          <h3 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            💳 {t('paymentMethodBreakdown')}
          </h3>
          <div className="flex flex-col gap-3">
            {Object.entries(analytics.byPaymentMethod).map(([method, data]) => {
              const percentage = (data.amount / analytics.totalScheduledMonthly) * 100;
              return (
                <div key={method} className="flex items-center gap-3">
                  <span className="text-xl">{getPaymentMethodIcon(method)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {getPaymentMethodName(method)}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {analytics.currencySymbol}{data.amount.toFixed(2)} ({data.count})
                      </span>
                    </div>
                    <div 
                      className="h-2 rounded-full"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: 'var(--accent-primary)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {Object.keys(analytics.byPaymentMethod).length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                No data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Average Payment */}
      <div className="form-card text-center">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('averagePayment')}</div>
        <div className="text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
          {analytics.currencySymbol}{analytics.avgPayment.toFixed(2)}
        </div>
        <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('paymentCount')}: {analytics.totalPayments}
        </div>
      </div>
    </div>
  );
};

export default PaymentAnalytics;
