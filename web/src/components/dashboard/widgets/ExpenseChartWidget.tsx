import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const ExpenseChartWidget: React.FC<WidgetProps> = ({ expenses }) => {
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 640);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate category totals
  const pieData = React.useMemo(() => {
    const byCategory: { [key: string]: number } = {};
    let total = 0;

    expenses.forEach((exp) => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      byCategory[exp.category] += exp.amount;
      total += exp.amount;
    });

    const pieData = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
      }));

    return pieData;
  }, [expenses]);

  if (pieData.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>📊</span>
        <p>{t('noExpenseData')}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy={isMobile ? '40%' : '45%'}
          labelLine={false}
          label={false}
          outerRadius={isMobile ? 70 : 100}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{
            fontSize: isMobile ? '11px' : '12px',
            paddingTop: '10px',
          }}
          formatter={(value: string) => {
            const item = pieData.find(d => d.name === value);
            return item ? `${value} (${item.percentage}%)` : value;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpenseChartWidget;
