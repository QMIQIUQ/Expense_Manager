import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Expense, Repayment } from '../../types';
import { ChartBarIcon, BarChartSimpleIcon } from '../icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface BudgetHistoryProps {
  categoryName: string;
  budgetAmount: number;
  expenses: Expense[];
  repayments: Repayment[];
  billingCycleDay: number;
  periodsToShow?: number;
  showAdvanced?: boolean;
}

interface PeriodData {
  label: string;
  spent: number;
  percentage: number;
  budget: number;
  startDate: Date;
  endDate: Date;
}

export const BudgetHistory: React.FC<BudgetHistoryProps> = ({
  categoryName,
  budgetAmount,
  expenses,
  repayments,
  billingCycleDay,
  periodsToShow = 6,
  showAdvanced = false,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'bar' | 'chart'>('bar');

  // Build repayment lookup
  const repaymentsByExpense: { [expenseId: string]: number } = {};
  for (const rep of repayments) {
    repaymentsByExpense[rep.expenseId] = (repaymentsByExpense[rep.expenseId] || 0) + rep.amount;
  }

  const getNetAmount = (exp: Expense): number => {
    const repaid = repaymentsByExpense[exp.id || ''] || 0;
    return Math.max(0, exp.amount - repaid);
  };

  // Calculate historical periods
  const getHistoricalPeriods = (): PeriodData[] => {
    const periods: PeriodData[] = [];
    const now = new Date();

    for (let i = 1; i <= periodsToShow; i++) {
      // Calculate cycle start for past month i
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, billingCycleDay);
      const cycleStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), billingCycleDay);
      const cycleEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, billingCycleDay);

      // Calculate spending for this period (cycleEnd is exclusive)
      const spent = expenses
        .filter((exp) => {
          const expDate = new Date(exp.date);
          return (
            exp.category === categoryName &&
            expDate >= cycleStart &&
            expDate < cycleEnd
          );
        })
        .reduce((sum, exp) => sum + getNetAmount(exp), 0);

      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      // Format label (e.g., "Nov" or "11月")
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = monthNames[cycleStart.getMonth()];

      periods.push({
        label,
        spent,
        percentage,
        budget: budgetAmount,
        startDate: cycleStart,
        endDate: cycleEnd,
      });
    }

    // Reverse to show oldest first
    return periods.reverse();
  };

  const periods = getHistoricalPeriods();

  // Calculate statistics for advanced view (before hasData check)
  const stats = React.useMemo(() => {
    const spentValues = periods.map((p) => p.spent);
    const total = spentValues.reduce((a, b) => a + b, 0);
    const avg = total / periods.length;
    const max = Math.max(...spentValues);
    const min = Math.min(...spentValues);
    const overBudgetCount = periods.filter((p) => p.percentage > 100).length;
    
    return { total, avg, max, min, overBudgetCount };
  }, [periods]);

  // Check if there's any data
  const hasData = periods.some((p) => p.spent > 0);

  if (!hasData) {
    return null;
  }

  const getBarColor = (percentage: number): string => {
    if (percentage >= 100) return 'var(--error-text)';
    if (percentage >= 80) return 'var(--warning-text)';
    return 'var(--success-text)';
  };

  const maxPercentage = Math.max(...periods.map((p) => p.percentage), 100);

  // Custom tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = periods.find((p) => p.label === label);
      if (!data) return null;
      
      return (
        <div style={tooltipStyles.container}>
          <p style={tooltipStyles.label}>{label}</p>
          <p style={tooltipStyles.value}>
            ${data.spent.toFixed(2)} / ${data.budget.toFixed(2)}
          </p>
          <p style={{ ...tooltipStyles.percentage, color: getBarColor(data.percentage) }}>
            {data.percentage.toFixed(0)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="budget-history">
      <div className="budget-history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="budget-history-title">{t('budgetHistory') || 'History'}</span>
        {showAdvanced && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setViewMode('bar')}
              style={{
                ...viewButtonStyle,
                backgroundColor: viewMode === 'bar' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'bar' ? 'white' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '28px',
              }}
            >
              <BarChartSimpleIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode('chart')}
              style={{
                ...viewButtonStyle,
                backgroundColor: viewMode === 'chart' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'chart' ? 'white' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '28px',
              }}
            >
              <ChartBarIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Statistics (only in advanced mode) - Show BEFORE charts */}
      {showAdvanced && (
        <div style={statsStyles.container}>
          <div style={statsStyles.item}>
            <span style={statsStyles.label}>{t('average') || 'Avg'}</span>
            <span style={statsStyles.value}>${stats.avg.toFixed(0)}</span>
          </div>
          <div style={statsStyles.item}>
            <span style={statsStyles.label}>{t('highest') || 'High'}</span>
            <span style={statsStyles.value}>${stats.max.toFixed(0)}</span>
          </div>
          <div style={statsStyles.item}>
            <span style={statsStyles.label}>{t('lowest') || 'Low'}</span>
            <span style={statsStyles.value}>${stats.min.toFixed(0)}</span>
          </div>
          <div style={statsStyles.item}>
            <span style={statsStyles.label}>{t('overBudget') || 'Over budget'}</span>
            <span style={{ ...statsStyles.value, color: stats.overBudgetCount > 0 ? 'var(--error-text)' : 'var(--success-text)' }}>
              {stats.overBudgetCount}/{periods.length}
            </span>
          </div>
        </div>
      )}

      {/* Simple Bar View (default) */}
      {viewMode === 'bar' && (
        <div className="budget-history-chart">
          {periods.map((period, index) => {
            const maxBarHeight = 60; // max height in pixels
            const barHeight = Math.max(4, (period.percentage / maxPercentage) * maxBarHeight);
            return (
              <div key={index} className="budget-history-bar-container">
                <div 
                  className="budget-history-bar"
                  style={{
                    height: `${Math.min(barHeight, maxBarHeight)}px`,
                    backgroundColor: getBarColor(period.percentage),
                  }}
                  title={`${period.label}: $${period.spent.toFixed(0)} (${period.percentage.toFixed(0)}%)`}
                />
                <span className="budget-history-label">{period.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Advanced Chart View (Recharts) */}
      {viewMode === 'chart' && showAdvanced && (
        <div style={{ width: '100%', height: 150, marginTop: '8px' }}>
          <ResponsiveContainer>
            <BarChart data={periods} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--border-color)' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--border-color)' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={budgetAmount} 
                stroke="var(--error-text)" 
                strokeDasharray="3 3" 
                label={{ value: 'Budget', fontSize: 10, fill: 'var(--error-text)' }}
              />
              <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                {periods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="budget-history-legend">
        <span className="budget-history-100-line">100%</span>
      </div>
    </div>
  );
};

const viewButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  fontSize: '10px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const tooltipStyles = {
  container: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  } as React.CSSProperties,
  label: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  value: {
    margin: '4px 0 0 0',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  percentage: {
    margin: '2px 0 0 0',
    fontSize: '13px',
    fontWeight: 600,
  } as React.CSSProperties,
};

const statsStyles = {
  container: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 0',
    marginTop: '8px',
    marginBottom: '12px',
    borderTop: '1px solid var(--border-color)',
  } as React.CSSProperties,
  item: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
  } as React.CSSProperties,
  label: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
  } as React.CSSProperties,
  value: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  } as React.CSSProperties,
};

export default BudgetHistory;
