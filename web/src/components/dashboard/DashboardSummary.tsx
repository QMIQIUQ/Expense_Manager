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
    <div style={styles.container}>
      <div style={styles.summaryCards}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>💰</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Monthly Expense</div>
            <div style={styles.cardValue}>${stats.monthly.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ ...styles.cardIcon, backgroundColor: '#e8f5e9' }}>💵</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('monthlyIncome')}</div>
            <div style={{ ...styles.cardValue, color: '#4caf50' }}>
              ${stats.monthlyIncome.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div
            style={{
              ...styles.cardIcon,
              backgroundColor: stats.netCashflow >= 0 ? '#e8f5e9' : '#ffebee',
            }}
          >
            {stats.netCashflow >= 0 ? '📈' : '📉'}
          </div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('netCashflow')}</div>
            <div
              style={{
                ...styles.cardValue,
                color: stats.netCashflow >= 0 ? '#4caf50' : '#f44336',
              }}
            >
              ${stats.netCashflow.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ ...styles.cardIcon, backgroundColor: '#fff3e0' }}>💸</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('unrecovered')}</div>
            <div style={{ ...styles.cardValue, color: '#ff9800' }}>
              ${stats.totalUnrecovered.toFixed(2)}
            </div>
          </div>
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
          <div style={styles.trackedExpensesSection}>
            <h3 style={styles.sectionTitle}>
              💰 {t('trackedExpenses')} ({trackedExpenses.length})
            </h3>
            <div style={styles.trackedExpensesList}>
              {trackedExpenses.map(expense => {
                const repaid = repaymentTotals[expense.id!] || 0;
                const remaining = expense.amount - repaid;
                const percentage = (repaid / expense.amount) * 100;
                
                return (
                  <div key={expense.id} style={styles.trackedExpenseCard}>
                    <div style={styles.trackedExpenseHeader}>
                      <div style={styles.trackedExpenseInfo}>
                        <span style={styles.trackedExpenseTitle}>{expense.description}</span>
                        <span style={styles.trackedExpenseDate}>{expense.date}</span>
                      </div>
                      {onMarkTrackingCompleted && (
                        <button
                          onClick={() => onMarkTrackingCompleted(expense.id!)}
                          style={styles.completeButton}
                          title={t('markAsCompleted')}
                        >
                          ✓
                        </button>
                      )}
                    </div>
                    <div style={styles.trackedExpenseAmounts}>
                      <div style={styles.trackedAmountItem}>
                        <span style={styles.trackedAmountLabel}>{t('totalAmount')}:</span>
                        <span style={styles.trackedAmountValue}>${expense.amount.toFixed(2)}</span>
                      </div>
                      <div style={styles.trackedAmountItem}>
                        <span style={styles.trackedAmountLabel}>{t('repaid')}:</span>
                        <span style={{ ...styles.trackedAmountValue, color: '#4CAF50' }}>${repaid.toFixed(2)}</span>
                      </div>
                      <div style={styles.trackedAmountItem}>
                        <span style={styles.trackedAmountLabel}>{t('remaining')}:</span>
                        <span style={{ ...styles.trackedAmountValue, color: '#ff9800' }}>${remaining.toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${percentage}%`,
                          backgroundColor: '#4CAF50',
                        }}
                      />
                    </div>
                    <span style={styles.categoryPercentage}>
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
        <div style={styles.categoryBreakdown}>
          <h3 style={styles.sectionTitle}>{t('topCategories')}</h3>
          <div style={styles.categoryList}>
            {categories.map(([category, amount]) => {
              const percentage = (amount / stats.total) * 100;
              return (
                <div key={category} style={styles.categoryItem}>
                  <div style={styles.categoryInfo}>
                    <span style={styles.categoryName}>{category}</span>
                    <span style={styles.categoryAmount}>${amount.toFixed(2)}</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                  <span style={styles.categoryPercentage}>{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pieData.length > 0 && (
        <div style={styles.pieChartContainer}>
          <h3 style={styles.sectionTitle}>{t('categoryDistribution')}</h3>
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
        <div style={styles.trendChartContainer}>
          <h3 style={styles.sectionTitle}>{t('spendingTrend')} (7 Days)</h3>
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
        <div style={styles.recentExpensesContainer}>
          <h3 style={styles.sectionTitle}>{t('recentExpenses')}</h3>
          <div style={styles.recentExpensesList}>
            {recentExpenses.map((expense) => (
              <div key={expense.id} style={styles.recentExpenseItem}>
                <div style={styles.recentExpenseInfo}>
                  <span style={styles.recentExpenseDesc}>{expense.description}</span>
                  <span style={styles.recentExpenseCategory}>{expense.category}</span>
                </div>
                <div style={styles.recentExpenseRight}>
                  <span style={styles.recentExpenseAmount}>${expense.amount.toFixed(2)}</span>
                  <span style={styles.recentExpenseDate}>
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

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '30px',
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
  },
  card: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    minWidth: 0,
    overflow: 'hidden',
  },
  cardIcon: {
    fontSize: '28px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--icon-bg)',
    borderRadius: '8px',
    alignSelf: 'center',
  },
  cardContent: {
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  cardLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    fontWeight: '500' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardValue: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: 'var(--text-primary)',
    wordBreak: 'break-word' as const,
    lineHeight: '1.2',
    width: '100%',
  },
  categoryBreakdown: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px',
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  categoryItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  categoryInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
    minWidth: 0,
  },
  categoryAmount: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#f44336',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '4px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    transition: 'width 0.3s ease',
  },
  categoryPercentage: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    alignSelf: 'flex-end',
  },
  pieChartContainer: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px',
    minWidth: 0,
    overflow: 'hidden',
  },
  trendChartContainer: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px',
    minWidth: 0,
    overflow: 'hidden',
  },
  recentExpensesContainer: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px',
  },
  recentExpensesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  recentExpenseItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    gap: '10px',
  },
  recentExpenseInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  recentExpenseDesc: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  recentExpenseCategory: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: 'var(--info-bg)',
    borderRadius: '4px',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  recentExpenseRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
  },
  recentExpenseAmount: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#f44336',
  },
  recentExpenseDate: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  // Tracked Expenses Styles
  trackedExpensesSection: {
    backgroundColor: 'var(--warning-bg)',
    border: '2px solid #ffc107',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  trackedExpensesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  trackedExpenseCard: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
  },
  trackedExpenseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  trackedExpenseInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  },
  trackedExpenseTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  trackedExpenseDate: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  completeButton: {
    padding: '6px 12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600' as const,
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  trackedExpenseAmounts: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '12px',
  },
  trackedAmountItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  trackedAmountLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  trackedAmountValue: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
};

export default DashboardSummary;
