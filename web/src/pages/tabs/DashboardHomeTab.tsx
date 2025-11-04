import React from 'react';
import DashboardSummary from '../../components/dashboard/DashboardSummary';
import { Expense } from '../../types';

interface Props {
  expenses: Expense[];
}

const DashboardHomeTab: React.FC<Props> = ({ expenses }) => {
  return (
    <div>
      <DashboardSummary expenses={expenses} />
    </div>
  );
};

export default DashboardHomeTab;
