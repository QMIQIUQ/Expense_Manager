import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { IncomeBudgetState } from '../../hooks/useIncomeBudget';
import type { Expense, Repayment } from '../../types';
import { monthlyNetSpendMinor } from '../../utils/incomeLinkedBudget';
import { formatMoney } from '../../utils/currencyUtils';
import './IncomeBudgetSummary.css';

interface Props {
  state: IncomeBudgetState;
  expenses?: Expense[];
  repayments?: Repayment[];
  spendingComplete?: boolean;
  compact?: boolean;
}

const IncomeBudgetSummary: React.FC<Props> = ({ state, expenses = [], repayments = [], spendingComplete = false, compact = false }) => {
  const { t } = useLanguage();
  const money = (value: number) => formatMoney(value / 100, 'MYR');
  const funding = state.funding;
  const spend = spendingComplete && state.userId ? monthlyNetSpendMinor(state.userId, expenses, repayments, state.range) : null;
  const unavailable = state.status !== 'ready' || !funding || funding.status !== 'ready';
  return (
    <div className={`income-budget-summary${compact ? ' income-budget-compact' : ''}`} aria-label={t('incomeLinkedBudgetMode')}>
      <p className="income-budget-caption">{state.range.startDate} – {state.range.endDate}</p>
      {state.pending && <p role="status" className={state.needsAttention ? 'income-budget-warning' : 'income-budget-caption'}>
        {state.needsAttention ? t('incomeBudgetAttentionPreview') : t('incomeBudgetLocalPreview')}
      </p>}
      {unavailable ? (
        <div role="status" className="income-budget-notice">
          <span>{state.status === 'loading' ? t('incomeBudgetLoading') : state.status === 'incomplete'
            ? t('incomeBudgetIncomplete') : state.status === 'invalid' ? t('incomeBudgetInvalidData') : t('incomeBudgetReadFailed')}</span>
          {state.status !== 'loading' && <button type="button" className="btn btn-accent-light" onClick={state.retry}>{t('retry')}</button>}
        </div>
      ) : <>
        <p className="income-budget-caption">{t('incomeBudgetPercentage')}: {state.percentage}%</p>
        <div className="income-budget-metrics">
          {!compact && <div><span>{t('incomeBudgetEligibleIncome')}</span><strong>{money(funding.incomeMinor)}</strong></div>}
          <div><span>{t('incomeBudgetFunding')}</span><strong>{money(funding.fundingMinor)}</strong></div>
          {!compact && <div><span>{t('incomeBudgetReserved')}</span><strong>{money(funding.reservedMinor)}</strong></div>}
          <div><span>{t('allocatedBudget')}</span><strong>{money(funding.allocatedMinor)}</strong></div>
          <div className={funding.shortfallMinor > 0 ? 'income-budget-warning' : undefined}>
            <span>{funding.shortfallMinor > 0 ? t('incomeBudgetShortfall') : t('unallocatedBudget')}</span>
            <strong>{money(funding.shortfallMinor > 0 ? funding.shortfallMinor : funding.unallocatedMinor)}</strong>
          </div>
          {!compact && <>
            <div><span>{t('spent')}</span><strong>{spend === null ? '—' : money(spend)}</strong></div>
            <div><span>{t('incomeBudgetAfterSpending')}</span><strong>{spend === null ? '—' : money(funding.fundingMinor - spend)}</strong></div>
          </>}
        </div>
        {compact && <p className="income-budget-caption">{t('incomeBudgetEligibleIncome')}: {money(funding.incomeMinor)} · {t('incomeBudgetReserved')}: {money(funding.reservedMinor)}</p>}
        <p className="income-budget-caption">{t('incomeBudgetAllocationHint')}</p>
        {!compact && spend === null && <p className="income-budget-caption">{t('incomeBudgetSpendingIncomplete')}</p>}
      </>}
    </div>
  );
};

export default IncomeBudgetSummary;
