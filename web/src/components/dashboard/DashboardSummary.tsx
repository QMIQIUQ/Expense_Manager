import React from 'react';
import { Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardSummaryProps {
  expenses: Expense[];
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ expenses }) => {
  const { t } = useLanguage();
  
  // Color palette for pie chart
  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  
  const calculateStats = () => {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const now = new Date();
    const monthly = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return (
          expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

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

    return { total, monthly, daily, byCategory };
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
            <div style={styles.cardLabel}>{t('totalExpenses')}</div>
            <div style={styles.cardValue}>${stats.total.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>📅</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('thisMonth')}</div>
            <div style={styles.cardValue}>${stats.monthly.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>📊</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('today')}</div>
            <div style={styles.cardValue}>${stats.daily.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>🏷️</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>{t('categories')}</div>
            <div style={styles.cardValue}>{Object.keys(stats.byCategory).length}</div>
          </div>
        </div>
      </div>

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
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
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
              <Legend />
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
              <XAxis dataKey="date" />
              <YAxis />
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
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
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
    backgroundColor: '#f0f0f0',
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
    color: '#666',
    marginBottom: '4px',
    fontWeight: '500' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardValue: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#333',
    wordBreak: 'break-word' as const,
    lineHeight: '1.2',
    width: '100%',
  },
  categoryBreakdown: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#333',
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
    color: '#333',
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
    backgroundColor: '#e0e0e0',
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
    color: '#666',
    alignSelf: 'flex-end',
  },
  pieChartContainer: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
  },
  trendChartContainer: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
  },
  recentExpensesContainer: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
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
    backgroundColor: '#f8f9fa',
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
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  recentExpenseCategory: {
    fontSize: '12px',
    color: '#666',
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    width: 'fit-content',
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
    color: '#999',
  },
};

export default DashboardSummary;
