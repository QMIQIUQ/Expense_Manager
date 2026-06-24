import React from 'react';
import type { Expense, Income, Repayment } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getTodayLocal, formatDateLocal, formatDateShort, formatDateWithUserFormat } from '../../utils/dateUtils';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getExpenseBaseCurrency } from '../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../hooks/useCurrencyConversionMap';
import type { CurrencyCode } from '../../types';

interface DashboardSummaryProps {
  expenses: Expense[];
  incomes?: Income[];
  repayments?: Repayment[];
  onMarkTrackingCompleted?: (expenseId: string) => void;
  billingCycleDay?: number; // Day of month (1-31) when billing cycle starts
  displayCurrency?: CurrencyCode;
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ expenses, incomes = [], repayments = [], onMarkTrackingCompleted, billingCycleDay = 1, displayCurrency }) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 640);
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Color palette for pie chart
  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  
  // Memoize billing cycle calculation (only recalculates when billingCycleDay changes)
  const { cycleStart, cycleEnd } = React.useMemo(() => {
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
  }, [billingCycleDay]);

  const expenseById = React.useMemo(() => new Map(expenses.map((expense) => [expense.id || '', expense])), [expenses]);

  const expenseDisplayEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return expenses
      .filter((expense) => !!expense.id)
      .map((expense) => ({
        key: expense.id as string,
        amount: getExpenseBaseAmount(expense),
        sourceCurrency: getExpenseBaseCurrency(expense),
        date: expense.date,
      }));
  }, [displayCurrency, expenses]);

  const repaymentDisplayEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return repayments
      .filter((repayment) => !!repayment.id)
      .map((repayment) => {
        const linkedExpense = expenseById.get(repayment.expenseId || '');
        return {
          key: repayment.id as string,
          amount: repayment.amount,
          sourceCurrency: linkedExpense ? getExpenseBaseCurrency(linkedExpense) : DEFAULT_BASE_CURRENCY,
          date: repayment.date,
        };
      });
  }, [displayCurrency, expenseById, repayments]);

  const expenseDisplayAmountsById = useCurrencyConversionMap(expenseDisplayEntries, displayCurrency);
  const repaymentDisplayAmountsById = useCurrencyConversionMap(repaymentDisplayEntries, displayCurrency);

  const getDisplayExpenseAmount = React.useCallback((expense: Expense): number => {
    if (!displayCurrency) return getExpenseBaseAmount(expense);
    return expenseDisplayAmountsById[expense.id || ''] ?? getExpenseBaseAmount(expense);
  }, [displayCurrency, expenseDisplayAmountsById]);

  const getDisplayRepaymentTotal = React.useCallback((expenseId: string): number => {
    if (!displayCurrency) {
      return repayments
        .filter((repayment) => repayment.expenseId === expenseId)
        .reduce((sum, repayment) => sum + repayment.amount, 0);
    }

    return repayments
      .filter((repayment) => repayment.expenseId === expenseId)
      .reduce((sum, repayment) => sum + (repaymentDisplayAmountsById[repayment.id || ''] ?? repayment.amount), 0);
  }, [displayCurrency, repaymentDisplayAmountsById, repayments]);
  
  // Memoize expensive calculations (only recalculates when dependencies change)
  const stats = React.useMemo(() => {
    // Build repayment totals first (needed for net expense calculations)
    const repaymentsByExpense: { [expenseId: string]: number } = {};
    repayments.forEach((rep) => {
      if (rep.expenseId) {
        repaymentsByExpense[rep.expenseId] =
          (repaymentsByExpense[rep.expenseId] || 0) + rep.amount;
      }
    });

    // Helper to get net expense amount (expense - repayments, min 0)
    const getNetAmount = (exp: Expense) => {
      const repaid = repaymentsByExpense[exp.id || ''] || 0;
      return Math.max(0, getExpenseBaseAmount(exp) - repaid);
    };

    // Total expenses (deducting repayments)
    const total = expenses.reduce((sum, exp) => sum + getNetAmount(exp), 0);
    const totalIncome = incomes.reduce((sum, inc) => inc.amount + sum, 0);
    
    // Calculate monthly expenses based on billing cycle (deducting repayments)
    const monthly = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= cycleStart && expDate <= cycleEnd;
      })
      .reduce((sum, exp) => sum + getNetAmount(exp), 0);

    // Calculate monthly income based on billing cycle
    const monthlyIncome = incomes
      .filter((inc) => {
        const incDate = new Date(inc.date);
        return incDate >= cycleStart && incDate <= cycleEnd;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    const today = getTodayLocal();
    // Daily expenses (deducting repayments)
    const daily = expenses
      .filter((exp) => exp.date === today)
      .reduce((sum, exp) => sum + getNetAmount(exp), 0);

    // Category breakdown (deducting repayments)
    const byCategory: { [key: string]: number } = {};
    expenses.forEach((exp) => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      byCategory[exp.category] += getNetAmount(exp);
    });

    // Total unrecovered from tracked expenses only
    const totalUnrecovered = expenses
      .filter(exp => exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted)
      .reduce((sum, exp) => {
        const repaid = repaymentsByExpense[exp.id || ''] || 0;
        const remaining = Math.max(0, exp.amount - repaid);
        return sum + remaining;
      }, 0);

    // Net cashflow now reflects repayment-adjusted expenses
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
  }, [expenses, incomes, repayments, cycleStart, cycleEnd]);

  const displayMonthlyExpense = React.useMemo(() => {
    if (!displayCurrency) return stats.monthly;
    return expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= cycleStart && expDate <= cycleEnd;
      })
      .reduce((sum, exp) => sum + Math.max(0, getDisplayExpenseAmount(exp) - getDisplayRepaymentTotal(exp.id || '')), 0);
  }, [cycleEnd, cycleStart, displayCurrency, expenses, getDisplayExpenseAmount, getDisplayRepaymentTotal, stats.monthly]);

  const displayTotalUnrecovered = React.useMemo(() => {
    if (!displayCurrency) return stats.totalUnrecovered;
    return expenses
      .filter(exp => exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted)
      .reduce((sum, exp) => {
        const repaid = getDisplayRepaymentTotal(exp.id || '');
        return sum + Math.max(0, getDisplayExpenseAmount(exp) - repaid);
      }, 0);
  }, [displayCurrency, expenses, getDisplayExpenseAmount, getDisplayRepaymentTotal, stats.totalUnrecovered]);

  const displayByCategory = React.useMemo(() => {
    if (!displayCurrency) return stats.byCategory;
    const byCategory: { [key: string]: number } = {};
    expenses.forEach((exp) => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      const repaid = getDisplayRepaymentTotal(exp.id || '');
      byCategory[exp.category] += Math.max(0, getDisplayExpenseAmount(exp) - repaid);
    });
    return byCategory;
  }, [displayCurrency, expenses, getDisplayExpenseAmount, getDisplayRepaymentTotal, stats.byCategory]);
  // Memoize category calculations
  const categories = React.useMemo(() => 
    Object.entries(displayByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5),
    [displayByCategory]
  );

  // Memoize pie chart data preparation
  const pieData = React.useMemo(() => 
    Object.entries(stats.byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / stats.total) * 100).toFixed(1)
      })),
    [stats.byCategory, stats.total]
  );

  // Memoize spending trend data (last 7 days)
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
    expenses.forEach(exp => {
      if (Object.prototype.hasOwnProperty.call(last7Days, exp.date)) {
        last7Days[exp.date] += getExpenseBaseAmount(exp);
      }
    });
    
    return Object.entries(last7Days).map(([date, amount]) => ({
      date: formatDateShort(date, dateFormat),
      amount: parseFloat(amount.toFixed(2))
    }));
  }, [expenses, dateFormat]);

  // Memoize recent expenses sorting (last 5)
  const recentExpenses = React.useMemo(() => 
    [...expenses]
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, 5),
    [expenses]
  );

  return (
    <div className="dashboard-summary">
      <div className="summary-cards-grid">
        <div className="summary-card">
          <div className="card-icon error-bg">💰</div>
          <div className="card-content">
            <div className="card-label">{t('monthlyExpense') || 'Monthly Expense'}</div>
            <div className="card-value error-text">{formatMoney(displayMonthlyExpense, displayCurrency || DEFAULT_BASE_CURRENCY)}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon success-bg">💵</div>
          <div className="card-content">
            <div className="card-label">{t('monthlyIncome')}</div>
            <div className="card-value success-text">
              {formatMoney(stats.monthlyIncome, DEFAULT_BASE_CURRENCY)}
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
              {formatMoney(stats.netCashflow, DEFAULT_BASE_CURRENCY)}
            </div>
          </div>
        </div>

        <div className="summary-card" style={{ position: 'relative' }}>
          <div className="card-icon warning-bg">💸</div>
          <div className="card-content">
            <div className="card-label">{t('unrecovered')}</div>
            <div className="card-value warning-text">
              {formatMoney(displayTotalUnrecovered, displayCurrency || DEFAULT_BASE_CURRENCY)}
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
        
        if (trackedExpenses.length === 0) return null;
        
        return (
          <div className="tracked-expenses-section">
            <h3 className="section-title">
              💰 {t('trackedExpenses')} ({trackedExpenses.length})
            </h3>
            <div className="tracked-expenses-list">
              {trackedExpenses.map(expense => {
        const repaid = getDisplayRepaymentTotal(expense.id || '');
                const totalAmount = getDisplayExpenseAmount(expense);
                const remaining = totalAmount - repaid;
                const percentage = totalAmount > 0 ? (repaid / totalAmount) * 100 : 0;
                const displayCurrencyCode = displayCurrency || expense.baseCurrency || expense.currency || DEFAULT_BASE_CURRENCY;
                
                return (
                  <div key={expense.id} className="tracked-expense-card">
                    <div className="tracked-expense-header">
                      <div className="tracked-expense-info">
                        <span className="tracked-expense-title">{expense.description}</span>
                        <span className="tracked-expense-date">{formatDateWithUserFormat(expense.date, dateFormat)}</span>
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
                        <span className="tracked-amount-value">{formatMoney(totalAmount, displayCurrencyCode)}</span>
                      </div>
                      <div className="tracked-amount-item">
                        <span className="tracked-amount-label">{t('repaid')}:</span>
                        <span className="tracked-amount-value success-text">{formatMoney(repaid, displayCurrencyCode)}</span>
                      </div>
                      <div className="tracked-amount-item">
                        <span className="tracked-amount-label">{t('remaining')}:</span>
                        <span className="tracked-amount-value warning-text">{formatMoney(Math.max(0, remaining), displayCurrencyCode)}</span>
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
                    <span className="category-amount error-text">{formatMoney(amount, displayCurrency || DEFAULT_BASE_CURRENCY)}</span>
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
                fill={COLORS[0]}
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatMoney(value, DEFAULT_BASE_CURRENCY)}
              />
              <Legend 
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ 
                  fontSize: isMobile ? '11px' : '12px',
                  paddingTop: '10px',
                  maxWidth: '100%'
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

      {spendingTrend.length > 0 && (
        <div className="chart-container card">
          <h3 className="section-title">{t('spendingTrend')} (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
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
              <Tooltip formatter={(value: number) => formatMoney(value, DEFAULT_BASE_CURRENCY)} />
              <Line type="monotone" dataKey="amount" stroke="var(--accent-primary)" strokeWidth={2} />
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
                  <span className="recent-expense-amount error-text">{formatMoney(getDisplayExpenseAmount(expense), displayCurrency || expense.baseCurrency || expense.currency || DEFAULT_BASE_CURRENCY)}</span>
                  <span className="recent-expense-date">
                    {formatDateShort(expense.date, dateFormat)}
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
