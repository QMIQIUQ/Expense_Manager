import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import { formatDateLocal } from '../../../utils/dateUtils';

const SpendingTrendWidget: React.FC<WidgetProps> = ({ expenses }) => {
  const { t } = useLanguage();

  // Calculate last 7 days spending trend
  const spendingTrend = React.useMemo(() => {
    const last7Days: { [date: string]: number } = {};
    const today = new Date();

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatDateLocal(date);
      last7Days[dateStr] = 0;
    }

    // Accumulate expenses
    expenses.forEach((exp) => {
      if (Object.prototype.hasOwnProperty.call(last7Days, exp.date)) {
        last7Days[exp.date] += exp.amount;
      }
    });

    return Object.entries(last7Days).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: parseFloat(amount.toFixed(2)),
    }));
  }, [expenses]);

  if (spendingTrend.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>📈</span>
        <p>{t('noTrendData')}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={spendingTrend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="var(--accent-primary)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SpendingTrendWidget;
