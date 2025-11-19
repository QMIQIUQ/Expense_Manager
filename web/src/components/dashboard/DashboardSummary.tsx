import React from 'react';
import { Expense, Income, Repayment } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardSummaryProps {
  expenses: Expense[];
  incomes?: Income[];
  repayments?: Repayment[];
  onMarkTrackingCompleted?: (expenseId: string) => void;
  billingCycleDay?: number; // Day of month (1-31) when billing cycle starts
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ expenses, incomes = [], repayments = [], onMarkTrackingCompleted, billingCycleDay = 1 }) => {
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 640);
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Color palette for pie chart
  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  
  // Calculate billing cycle date range
  const getBillingCycleDates = () => {
    const now = new Date();
    const currentDay = now.getDate();
    
    let cycleStart: Date;
    let cycleEnd: Date;
    
    if (currentDay >= billingCycleDay) {
      // Current cycle: billingCycleDay of this month to (billingCycleDay - 1) of next month
      cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay - 1);
    } else {
      // Previous cycle: billingCycleDay of last month to (billingCycleDay - 1) of this month
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay - 1);
    }
    
    return { cycleStart, cycleEnd };
  };
  
  const calculateStats = () => {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = incomes.reduce((sum, inc) => inc.amount + sum, 0);

    const { cycleStart, cycleEnd } = getBillingCycleDates();
    
    // Calculate monthly expenses based on billing cycle
    const monthly = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= cycleStart && expDate <= cycleEnd;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate monthly income based on billing cycle
    const monthlyIncome = incomes
      .filter((inc) => {
        const incDate = new Date(inc.date);
        return incDate >= cycleStart && incDate <= cycleEnd;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    const today = new Date().toISOString().split('T')[0];
    const daily = expenses
      .filter((exp) => exp.date === today)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const byCategory: { [key: string]: number } = {};
    expenses.forEach((exp) => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      byCategory[exp.category] += exp.amount;
    });

    // Total unrecovered is now calculated from tracked expenses only
    const repaymentsByExpense: { [expenseId: string]: number } = {};
    repayments.forEach((rep) => {
      if (rep.expenseId) {
        repaymentsByExpense[rep.expenseId] =
          (repaymentsByExpense[rep.expenseId] || 0) + rep.amount;
      }
    });

    const totalUnrecovered = expenses
      .filter(exp => exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted)
      .reduce((sum, exp) => {
        const repaid = repaymentsByExpense[exp.id || ''] || 0;
        const remaining = Math.max(0, exp.amount - repaid);
        return sum + remaining;
      }, 0);

    const netCashflow = monthlyIncome - monthly;

    return {
      total,
      totalIncome,
      monthly,
      monthlyIncome,
      daily,
      byCategory,
      totalUnrecovered,
      netCashflow,
    };
  };

  const stats = calculateStats();
  const categories = Object.entries(stats.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Prepare pie chart data - show all categories for complete view
  const pieData = Object.entries(stats.byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({
      name,
      value,
      percentage: ((value / stats.total) * 100).toFixed(1)
    }));

  // Prepare spending trend data (last 7 days)
  const getSpendingTrend = () => {
    const last7Days: { [date: string]: number } = {};
    const today = new Date();
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days[dateStr] = 0;
    }
    
    // Accumulate expenses
    expenses.forEach(exp => {
      if (Object.prototype.hasOwnProperty.call(last7Days, exp.date)) {
        last7Days[exp.date] += exp.amount;
      }
    });
    
    return Object.entries(last7Days).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: parseFloat(amount.toFixed(2))
    }));
  };

  const trendData = getSpendingTrend();

  // Get recent expenses (last 5)
  const recentExpenses = [...expenses]
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="dashboard-summary">
      <div className="summary-cards-grid">
        <div className="summary-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">Monthly Expense</div>
            <div className="card-value">${stats.monthly.toFixed(2)}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon success-bg">💵</div>
          <div className="card-content">
            <div className="card-label">{t('monthlyIncome')}</div>
            <div className="card-value success-text">
              ${stats.monthlyIncome.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className={`card-icon ${stats.netCashflow >= 0 ? 'success-bg' : 'error-bg'}`}>
            {stats.netCashflow >= 0 ? '📈' : '📉'}
          </div>
          <div className="card-content">
            <div className="card-label">{t('netCashflow')}</div>
            <div className={`card-value ${stats.netCashflow >= 0 ? 'success-text' : 'error-text'}`}>
              ${stats.netCashflow.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="summary-card" style={{ position: 'relative' }}>
          <div className="card-icon warning-bg">💸</div>
          <div className="card-content">
            <div className="card-label">{t('unrecovered')}</div>
            <div className="card-value warning-text">
              ${stats.totalUnrecovered.toFixed(2)}
            </div>
          </div>
          {(() => {
            const trackedCount = expenses.filter(exp => 
              exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted
            ).length;
            if (trackedCount > 0) {
              return (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'var(--warning-text)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}>
                  {trackedCount}
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Tracked Expenses Section - NEW */}
      {(() => {
        const trackedExpenses = expenses.filter(exp => 
          exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted
        );
        const repaymentTotals: { [expenseId: string]: number } = {};
        repayments.forEach(rep => {
          if (rep.expenseId) {
            repaymentTotals[rep.expenseId] = (repaymentTotals[rep.expenseId] || 0) + rep.amount;
          }
        });
        
        if (trackedExpenses.length === 0) return null;
        
        return (
          <div className="tracked-expenses-section">
            <h3 className="section-title">
              💰 {t('trackedExpenses')} ({trackedExpenses.length})
            </h3>
            <div className="tracked-expenses-list">
              {trackedExpenses.map(expense => {
                const repaid = repaymentTotals[expense.id!] || 0;
                const remaining = expense.amount - repaid;
                const percentage = (repaid / expense.amount) * 100;
                
                return (
                  <div key={expense.id} className="tracked-expense-card">
                    <div className="tracked-expense-header">
                      <div className="tracked-expense-info">
                        <span className="tracked-expense-title">{expense.description}</span>
                        <span className="tracked-expense-date">{expense.date}</span>
                      </div>
                      {onMarkTrackingCompleted && (
                        <button
                          onClick={() => onMarkTrackingCompleted(expense.id!)}
                          className="btn-complete"
                          title={t('markAsCompleted')}
                        >
                          ✓
                        </button>
                      )}
                    </div>
                    <div className="tracked-expense-amounts">
                      <div className="tracked-amount-item">
                        <span className="tracked-amount-label">{t('totalAmount')}:</span>
                        <span className="tracked-amount-value">${expense.amount.toFixed(2)}</span>
                      </div>
                      <div className="tracked-amount-item">
                        <span className="tracked-amount-label">{t('repaid')}:</span>
                        <span className="tracked-amount-value success-text">${repaid.toFixed(2)}</span>
                      </div>
                      <div className="tracked-amount-item">
                        <span className="tracked-amount-label">{t('remaining')}:</span>
                        <span className="tracked-amount-value warning-text">${remaining.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill success-bg"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="category-percentage">
                      {percentage.toFixed(1)}% {t('collected')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {categories.length > 0 && (
        <div className="category-breakdown card">
          <h3 className="section-title">{t('topCategories')}</h3>
          <div className="category-list">
            {categories.map(([category, amount]) => {
              const percentage = (amount / stats.total) * 100;
              return (
                <div key={category} className="category-item">
                  <div className="category-info">
                    <span className="category-name">{category}</span>
                    <span className="category-amount error-text">${amount.toFixed(2)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="category-percentage">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pieData.length > 0 && (
        <div className="chart-container card">
          <h3 className="section-title">{t('categoryDistribution')}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy={isMobile ? "40%" : "45%"}
                labelLine={false}
                label={false}
                outerRadius={isMobile ? 70 : 110}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend 
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ 
                  fontSize: isMobile ? '11px' : '12px',
                  paddingTop: '10px',
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word'
                }}
                formatter={(value: string) => {
                  const item = pieData.find(d => d.name === value);
                  return item ? `${value} (${item.percentage}%)` : value;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {trendData.length > 0 && (
        <div className="chart-container card">
          <h3 className="section-title">{t('spendingTrend')} (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
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
              <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {recentExpenses.length > 0 && (
        <div className="recent-expenses-container card">
          <h3 className="section-title">{t('recentExpenses')}</h3>
          <div className="recent-expenses-list">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="recent-expense-item">
                <div className="recent-expense-info">
                  <span className="recent-expense-desc">{expense.description}</span>
                  <span className="recent-expense-category">{expense.category}</span>
                </div>
                <div className="recent-expense-right">
                  <span className="recent-expense-amount error-text">${expense.amount.toFixed(2)}</span>
                  <span className="recent-expense-date">
                    {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSummary;
