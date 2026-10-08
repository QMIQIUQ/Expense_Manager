import React from 'react';
import DashboardSummary from '../../components/dashboard/DashboardSummary';
import { Category, CurrencyCode, Expense } from '../../types';

interface Props {
  expenses: Expense[];
  categories: Category[];
  displayCurrency?: CurrencyCode;
}

const DashboardHomeTab: React.FC<Props> = ({ expenses, categories, displayCurrency }) => {
  return (
    <div>
      <DashboardSummary expenses={expenses} categories={categories} displayCurrency={displayCurrency} />
    </div>
  );
};

export default DashboardHomeTab;
