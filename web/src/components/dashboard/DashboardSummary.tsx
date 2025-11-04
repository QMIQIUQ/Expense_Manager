import React from 'react';
import { Expense } from '../../types';

interface DashboardSummaryProps {
  expenses: Expense[];
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ expenses }) => {
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

  return (
    <div style={styles.container}>
      <div style={styles.summaryCards}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>💰</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Total Expenses</div>
            <div style={styles.cardValue}>${stats.total.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>📅</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>This Month</div>
            <div style={styles.cardValue}>${stats.monthly.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>📊</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Today</div>
            <div style={styles.cardValue}>${stats.daily.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>🏷️</div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Categories</div>
            <div style={styles.cardValue}>{Object.keys(stats.byCategory).length}</div>
          </div>
        </div>
      </div>

      {categories.length > 0 && (
        <div style={styles.categoryBreakdown}>
          <h3 style={styles.sectionTitle}>Top Spending Categories</h3>
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  cardIcon: {
    fontSize: '32px',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: '10px',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
    fontWeight: '500' as const,
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: '#333',
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
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#333',
  },
  categoryAmount: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#f44336',
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
};

export default DashboardSummary;
