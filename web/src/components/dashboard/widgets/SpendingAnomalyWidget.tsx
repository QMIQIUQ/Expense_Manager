import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { readSpendingInsights } from '../../../services/spendingInsightService';
import type { SpendingAnomaly } from '../../../utils/spendingAnomalyRules';
import { getTodayLocal } from '../../../utils/dateUtils';
import { formatCurrency } from '../../../domain/money';
import type { WidgetProps } from './types';

const SpendingAnomalyWidget: React.FC<WidgetProps> = ({ onNavigateToExpenseCategory }) => {
  const { currentUser } = useAuth(); const { t } = useLanguage();
  const [state, setState] = useState<{ userId?: string; rows?: SpendingAnomaly[]; error?: string; stale?: boolean }>({});
  const [busyRequest, setBusyRequest] = useState<{ userId: string; token: number; date: string }>();
  const active = useRef<{ userId: string; token: number; date: string }>();
  const owner = useRef(currentUser?.uid); owner.current = currentUser?.uid;
  const generation = useRef(0);
  useEffect(() => {
    const invalidateRequest = () => { generation.current++; active.current = undefined; };
    const invalidate = () => { invalidateRequest(); setBusyRequest(undefined); setState((previous) => ({ ...previous, stale: true })); };
    setBusyRequest(undefined);
    window.addEventListener('offline-queue-changed', invalidate); window.addEventListener('offline-operations-synced', invalidate);
    return () => { invalidateRequest(); window.removeEventListener('offline-queue-changed', invalidate); window.removeEventListener('offline-operations-synced', invalidate); };
  }, [currentUser?.uid]);
  const busy = busyRequest?.userId === currentUser?.uid && busyRequest?.token === generation.current;
  const analyze = async () => {
    const userId = currentUser?.uid; if (!userId || active.current?.userId === userId) return;
    const identity = { userId, token: generation.current, date: getTodayLocal() };
    active.current = identity; setBusyRequest(identity);
    const isCurrent = () => owner.current === userId && generation.current === identity.token && active.current === identity;
    try {
      const rows = await readSpendingInsights(userId, identity.date);
      if (isCurrent()) setState({ userId, rows });
    } catch { if (isCurrent()) setState({ userId, error: t('incompleteFinancialData') }); }
    finally { if (isCurrent()) { active.current = undefined; setBusyRequest(undefined); } }
  };
  const visible = state.userId === currentUser?.uid && !state.stale;
  return <section className="ledger-panel"><p>{t('ledgerAnomalyExplanation')}</p>
    <button type="button" disabled={busy || !currentUser} onClick={() => { void analyze(); }}>{t(busy ? 'loading' : 'ledgerAnalyze')}</button>
    {state.stale && <p role="status">{t('ledgerAnalysisStale')}</p>}
    {visible && state.error && <p role="alert">{state.error}</p>}
    {visible && state.rows?.length === 0 && <p>{t('ledgerNoAnomaly')}</p>}
    {visible && state.rows?.map((row) => <article key={row.category} className="ledger-panel">
      <strong>{row.category}</strong><p>{formatCurrency(row.currentAmount, 'MYR')} / {t('ledgerBaseline')} {formatCurrency(row.baselineAmount, 'MYR')} · {row.ratio.toFixed(1)}×</p>
      <p>{row.startDate} — {row.endDate} · {row.sampleCount} {t('ledgerHistoricalRecords')}</p>
      {onNavigateToExpenseCategory && <button type="button" onClick={() => onNavigateToExpenseCategory(row.category, row.startDate, row.endDate)}>{t('expenseHistory')}</button>}
    </article>)}
  </section>;
};
export default SpendingAnomalyWidget;
