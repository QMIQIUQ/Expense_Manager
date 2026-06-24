import React from 'react';
import DashboardSummary from '../../components/dashboard/DashboardSummary';
import { CurrencyCode, Expense } from '../../types';

interface Props {
  expenses: Expense[];
  displayCurrency?: CurrencyCode;
}

const DashboardHomeTab: React.FC<Props> = ({ expenses, displayCurrency }) => {
  return (
    <div>
      <DashboardSummary expenses={expenses} displayCurrency={displayCurrency} />
    </div>
  );
};

export default DashboardHomeTab;
