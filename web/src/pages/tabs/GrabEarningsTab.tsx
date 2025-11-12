import React, { useState } from 'react';
import GrabEarningForm from '../../components/grab/GrabEarningForm';
import GrabEarningList from '../../components/grab/GrabEarningList';
import GrabDashboardCards from '../../components/grab/GrabDashboardCards';
import { GrabEarning, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  grabEarnings: GrabEarning[];
  expenses: Expense[];
  monthlyExpenses: number;
  onAddGrabEarning: (data: Omit<GrabEarning, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onInlineUpdate: (id: string, updates: Partial<GrabEarning>) => void;
  onDeleteGrabEarning: (id: string) => void;
}

const GrabEarningsTab: React.FC<Props> = ({
  grabEarnings,
  expenses,
  monthlyExpenses,
  onAddGrabEarning,
  onInlineUpdate,
  onDeleteGrabEarning,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (data: Omit<GrabEarning, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    onAddGrabEarning(data);
    setIsAdding(false);
  };

  return (
    <div style={styles.container}>
      {/* Dashboard cards */}
      <GrabDashboardCards earnings={grabEarnings} monthlyExpenses={monthlyExpenses} />

      {/* Header with add button */}
      <div style={styles.header}>
        <h3 style={styles.title}>{t('grabEarningsHistory')}</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            + {t('addGrabEarning')}
          </button>
        )}
      </div>

      {/* Add form */}
      {isAdding && (
        <div style={styles.formContainer}>
          <GrabEarningForm
            onSubmit={handleSubmit}
            onCancel={() => setIsAdding(false)}
            expenses={expenses}
          />
        </div>
      )}

      {/* Earnings list */}
      <GrabEarningList
        earnings={grabEarnings}
        expenses={expenses}
        onDelete={onDeleteGrabEarning}
        onInlineUpdate={onInlineUpdate}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: '#333',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  formContainer: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
  },
};

export default GrabEarningsTab;
