import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Bank, Card, EWallet } from '../../types';
import type { AccountReconciliation, ReconciliationAccount } from '../../types/reconciliation';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { loadReconciliation, loadReconciliationMarks, readReconciliationReport, reconciliationId, saveReconciliation, type ReconciliationReport } from '../../services/accountReconciliationService';
import { formatCurrency, fromMinorUnits, getCurrencyMinorDigits, requireCurrencyCode, toMinorUnits } from '../../domain/money';
import { getTodayLocal, formatDateLocal } from '../../utils/dateUtils';
import { offlineQueue, type QueuedOperation } from '../../utils/offlineQueue';
import DatePicker from '../common/DatePicker';

const AccountReconciliationManager: React.FC<{ banks: Bank[]; cards: Card[]; ewallets: EWallet[] }> = ({ banks, cards, ewallets }) => {
  const { currentUser } = useAuth(); const { t } = useLanguage();
  const userId = currentUser?.uid;
  const owner = useRef(userId); owner.current = userId;
  const accounts = useMemo<ReconciliationAccount[]>(() => [
    ...banks.filter((row) => row.id && row.userId === userId).map((row) => ({ type: 'bank' as const, id: row.id!, name: row.name, currency: requireCurrencyCode(row.currency) })),
    ...ewallets.filter((row) => row.id && row.userId === userId).map((row) => ({ type: 'e_wallet' as const, id: row.id!, name: row.name, currency: requireCurrencyCode(row.currency) })),
    ...cards.filter((row) => row.id && row.userId === userId).map((row) => ({ type: 'credit_card' as const, id: row.id!, name: row.name, currency: requireCurrencyCode(row.currency) })),
  ], [banks, cards, ewallets, userId]);
  const today = getTodayLocal();
  const [selection, setSelection] = useState('');
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`);
  const [end, setEnd] = useState(() => { const date = new Date(`${today}T12:00:00`); return formatDateLocal(new Date(date.getFullYear(), date.getMonth() + 1, 0)); });
  const account = accounts.find((row) => `${row.type}:${row.id}` === selection) ?? accounts[0];
  const [opening, setOpening] = useState(0); const [closing, setClosing] = useState(0);
  const [record, setRecord] = useState<AccountReconciliation>();
  const [report, setReport] = useState<ReconciliationReport>();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(false);
  const [stale, setStale] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(100); const [, rerender] = useState(0);
  const scope = JSON.stringify([userId, account?.type, account?.id, account?.currency, start, end]);
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const generation = useRef(0);
  useEffect(() => {
    generation.current++; setBusy(false); setRecord(undefined); setReport(undefined); setChecked(new Set()); setLoaded(false); setStale(false); setMessage(''); setError(''); setVisibleCount(100);
  }, [scope]);
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entities?: string[]; operations?: QueuedOperation[] }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      const entities = detail?.entities ?? detail?.operations?.map((row) => row.entity) ?? [];
      if (entities.some((entity) => ['expense', 'income', 'repayment', 'transfer', 'scheduledPaymentRecord'].includes(entity))) { generation.current++; setBusy(false); setStale(true); }
      rerender((value) => value + 1);
    };
    window.addEventListener('offline-queue-changed', changed); window.addEventListener('offline-operations-synced', changed);
    return () => { window.removeEventListener('offline-queue-changed', changed); window.removeEventListener('offline-operations-synced', changed); };
  }, [userId]);
  const load = async () => {
    if (!userId || !account || busy || start > end) return;
    const token = ++generation.current; const requestedScope = scope; setBusy(true); setError(''); setMessage('');
    const valid = () => owner.current === userId && scopeRef.current === requestedScope && generation.current === token;
    try {
      const id = await reconciliationId(userId, account, start, end);
      const [saved, fresh] = await Promise.allSettled([loadReconciliation(userId, id), readReconciliationReport(userId, account, start, end)]);
      if (!valid()) return;
      if (saved.status === 'rejected') throw saved.reason;
      setRecord(saved.value); setLoaded(true);
      if (saved.value) { setOpening(fromMinorUnits(saved.value.openingBalanceMinor, account.currency)); setClosing(fromMinorUnits(saved.value.statementClosingMinor, account.currency)); }
      if (fresh.status === 'rejected') { setReport(undefined); setError(t('incompleteFinancialData')); return; }
      setReport(fresh.value); setStale(false);
      const marks = await loadReconciliationMarks(userId, id).catch(() => []);
      if (!valid()) return;
      setChecked(new Set(marks.filter((row) => row.checked && row.sourceFingerprint === fresh.value.sourceFingerprint).map((row) => row.transactionKey)));
      if (saved.value?.status === 'complete' && saved.value.sourceFingerprint !== fresh.value.sourceFingerprint) setMessage(t('ledgerReconciliationChanged'));
    } catch (failure) { if (valid()) setError(String(failure)); }
    finally { if (valid()) setBusy(false); }
  };
  const movementMinor = report?.movements.reduce((sum, row) => sum + row.deltaMinor, 0) ?? 0;
  const calculatedMinor = toMinorUnits(opening, account?.currency) + movementMinor;
  const differenceMinor = toMinorUnits(closing, account?.currency) - calculatedMinor;
  const allChecked = !!report && report.movements.every((row) => checked.has(row.key));
  const save = async (status: AccountReconciliation['status']) => {
    if (!userId || !account || busy || !loaded || stale) return;
    setBusy(true); setError(''); setMessage('');
    const requestedScope = scope;
    try {
      const id = await reconciliationId(userId, account, start, end);
      const payload: AccountReconciliation = { id, userId, accountType: account.type, accountId: account.id, accountName: account.name, currency: account.currency,
        periodStart: start, periodEnd: end, openingBalanceMinor: toMinorUnits(opening, account.currency), statementClosingMinor: toMinorUnits(closing, account.currency),
        calculatedClosingMinor: calculatedMinor, sourceFingerprint: report?.sourceFingerprint ?? 'incomplete', ...(report?.readTime ? { snapshotReadTime: report.readTime } : {}), status,
        revision: (record?.revision ?? 0) + (status === 'complete' ? 2 : 1) };
      if (owner.current !== userId || scopeRef.current !== requestedScope) return;
      await saveReconciliation(payload, record, report, checked);
      if (owner.current === userId && scopeRef.current === requestedScope) { setRecord(payload); setMessage(t('ledgerSavedLocally')); }
    } catch (failure) { if (owner.current === userId) setError(String(failure)); }
    finally { if (owner.current === userId && scopeRef.current === requestedScope) setBusy(false); }
  };
  const pending = record && offlineQueue.getAll().filter((operation) => (operation.payload as { userId?: string; id?: string; reconciliationId?: string })?.userId === userId &&
    ((operation.payload as { id?: string }).id === record.id || (operation.payload as { reconciliationId?: string }).reconciliationId === record.id));
  if (!account) return <p>{t('ledgerChooseAccount')}</p>;
  const amount = (minor: number) => formatCurrency(fromMinorUnits(minor, account.currency), account.currency);
  return <section className="ledger-panel"><h3>{t('ledgerReconciliation')}</h3><p>{t('ledgerReconciliationHint')}</p>
    <div className="ledger-row"><label>{t('paymentMethod')}<select aria-label={t('ledgerChooseAccount')} value={`${account.type}:${account.id}`} disabled={busy} onChange={(event) => setSelection(event.target.value)}>
      {accounts.map((row) => <option key={`${row.type}:${row.id}`} value={`${row.type}:${row.id}`}>{row.type === 'credit_card' ? '💳' : row.type === 'bank' ? '🏦' : '📱'} {row.name} ({row.currency})</option>)}
    </select></label><label>{t('startDate')}<DatePicker disabled={busy} value={start} onChange={setStart} /></label><label>{t('endDate')}<DatePicker disabled={busy} value={end} onChange={setEnd} /></label>
      <button type="button" disabled={busy || start > end} onClick={() => { void load(); }}>{t(busy ? 'loading' : 'ledgerLoadStatement')}</button></div>
    {loaded && <><div className="ledger-row"><label>{t('ledgerOpeningBalance')}<input disabled={busy} type="number" step={10 ** -getCurrencyMinorDigits(account.currency)} value={opening} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) setOpening(value); }} /></label>
      <label>{t('ledgerStatementClosing')}<input disabled={busy} type="number" step={10 ** -getCurrencyMinorDigits(account.currency)} value={closing} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) setClosing(value); }} /></label></div>
      <p>{t('ledgerCalculatedClosing')}: {report ? amount(calculatedMinor) : '—'} · {t('ledgerDifference')}: {report ? amount(differenceMinor) : '—'}</p>
      {account.type === 'credit_card' && <p>{t('ledgerCardLiabilityHint')}</p>}
      {stale && <p role="alert">{t('ledgerReconciliationChanged')}</p>}
      {report && <><button type="button" disabled={busy} onClick={() => setChecked(new Set(allChecked ? [] : report.movements.map((row) => row.key)))}>{t('ledgerCheckAllTransactions')}</button>
        <div className="ledger-table-wrap"><table><thead><tr><th>{t('ledgerChecked')}</th><th>{t('date')}</th><th>{t('description')}</th><th>{t('amount')}</th></tr></thead>
          <tbody>{report.movements.slice(0, visibleCount).map((row) => <tr key={row.key}><td><input type="checkbox" disabled={busy} aria-label={`${t('ledgerChecked')} ${row.description} ${row.date}`} checked={checked.has(row.key)} onChange={(event) => setChecked((previous) => { const next = new Set(previous); if (event.target.checked) next.add(row.key); else next.delete(row.key); return next; })} /></td>
            <td>{row.date}</td><td>{row.description}{row.reviewReason === 'legacy-unposted-repayment' && <p>{t('ledgerLegacyUnpostedRepayment')} ({formatCurrency(fromMinorUnits(row.reviewAmountMinor ?? 0, row.reviewCurrency), row.reviewCurrency)})</p>}</td><td>{amount(row.deltaMinor)}</td></tr>)}</tbody></table></div>
        {report.movements.length > visibleCount && <button type="button" onClick={() => setVisibleCount((value) => value + 100)}>{t('showMore')}</button>}
        <p>{checked.size} / {report.movements.length} · {report.readTime ?? t('ledgerCachedSnapshot')}</p></>}
      <div className="ledger-row"><button type="button" disabled={busy || stale} onClick={() => { void save('draft'); }}>{t('ledgerSaveReconciliationDraft')}</button>
        <button type="button" disabled={busy || stale || !report || !allChecked || differenceMinor !== 0} onClick={() => { void save('complete'); }}>{t('ledgerCompleteReconciliation')}</button></div>
      {!!pending?.length && <p role={pending.some((operation) => operation.status === 'needs-attention') ? 'alert' : 'status'}>{t(pending.some((operation) => operation.status === 'needs-attention') ? 'ledgerReconciliationNeedsAttention' : 'ledgerSavedLocally')}</p>}
      {record?.status === 'complete' && !pending?.length && report?.sourceFingerprint === record.sourceFingerprint && <p>{t('ledgerReconciledSnapshot')}</p>}
    </>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
};
export default AccountReconciliationManager;
