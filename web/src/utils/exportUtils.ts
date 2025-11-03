import { Expense } from '../types';

export const exportToCSV = (expenses: Expense[], filename: string = 'expenses.csv') => {
  const headers = ['Date', 'Description', 'Category', 'Amount', 'Notes'];
  const rows = expenses.map((exp) => [
    exp.date,
    exp.description,
    exp.category,
    exp.amount.toFixed(2),
    exp.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const filterExpensesByDateRange = (
  expenses: Expense[],
  startDate: string,
  endDate: string
): Expense[] => {
  return expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return expDate >= start && expDate <= end;
  });
};
