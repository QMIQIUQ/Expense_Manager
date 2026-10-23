import React from 'react';
import type { Expense } from '../../types';
import { summarizeExpenseSplit } from '../../utils/expenseSplitCalculator';
import { useExpenseRepayments } from '../../hooks/useExpenseRepayments';
import { formatCurrency, fromMinorUnits } from '../../domain/money';
import { useLanguage } from '../../contexts/LanguageContext';

export const ExpenseSplitSummary: React.FC<{ expense: Expense }> = ({ expense }) => {
  const { t } = useLanguage();
  const { rows, complete } = useExpenseRepayments(expense.userId, expense.id!);
  const split = summarizeExpenseSplit(expense, rows);
  const amount = (minor: number) => formatCurrency(fromMinorUnits(minor, split.currency), split.currency);
  return <section className="ledger-panel"><h4>{t('ledgerSplit')}</h4>
    <p>{t('ledgerOwnShare')}: {amount(split.ownerShareMinor)}</p>
    {!complete ? <p role="status">{t('incompleteFinancialData')}</p> : <>
      <div className="ledger-table-wrap"><table><thead><tr><th>{t('ledgerParticipant')}</th><th>{t('ledgerOwed')}</th><th>{t('ledgerPaid')}</th><th>{t('ledgerOutstanding')}</th></tr></thead>
        <tbody>{split.rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{amount(row.owedMinor)}</td><td>{amount(row.paidMinor)}</td><td>{amount(row.outstandingMinor)}</td></tr>)}</tbody></table></div>
      {split.unassigned.length > 0 && <p role="status">{t('ledgerUnassignedRepayments')}</p>}
    </>}
  </section>;
};
