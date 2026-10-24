import React, { useEffect, useRef, useState } from 'react';
import { useExpenseViews } from '../../hooks/useExpenseViews';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ExpenseFilterState, ExpensePeriodSelection, SavedExpenseView } from '../../types/expensePeriod';

export const ExpenseSavedViews: React.FC<{
  userId?: string; filters: ExpenseFilterState; period: ExpensePeriodSelection; restoreLast?: boolean; persistLast?: boolean;
  onApply: (view: Pick<SavedExpenseView, 'filters' | 'period'>) => void;
}> = ({ userId, filters, period, onApply, restoreLast = true, persistLast = true }) => {
  const { t } = useLanguage();
  const { preferences, ready, save } = useExpenseViews(userId);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const restored = useRef<string>();
  const skipNextSave = useRef(false);
  const latest = useRef({ filters, period, preferences, save }); latest.current = { filters, period, preferences, save };
  const applyRef = useRef(onApply); applyRef.current = onApply;
  useEffect(() => {
    if (!userId || !ready || restored.current === userId) return;
    restored.current = userId;
    if (restoreLast && preferences.lastView) applyRef.current(preferences.lastView);
  }, [userId, ready, restoreLast, preferences.lastView]);
  const fingerprint = JSON.stringify({ filters, period });
  useEffect(() => {
    if (!userId || !ready || restored.current !== userId) return;
    if (!persistLast) { skipNextSave.current = true; return; }
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const timer = setTimeout(() => {
      const current = latest.current;
      if (JSON.stringify(current.preferences.lastView) === JSON.stringify({ filters: current.filters, period: current.period })) return;
      void current.save({ action: 'lastView', view: { filters: current.filters, period: current.period } }).catch((failure) => setError(String(failure)));
    }, 700);
    return () => clearTimeout(timer);
  }, [userId, ready, fingerprint, persistLast]);
  if (!userId) return null;
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); try { await action(); } catch (failure) { setError(String(failure)); } finally { setBusy(false); }
  };
  return <details className="ledger-panel"><summary>{t('ledgerSavedViews')}</summary>
    <div className="ledger-chips">{preferences.savedFilters.map((view) => <div key={view.id}>
      <button type="button" onClick={() => onApply({ filters: view.filters, period: view.period })}>{view.name}</button>
      <button type="button" aria-label={`${t('delete')} ${view.name}`} disabled={busy} onClick={() => { void run(() => save({ action: 'remove', id: view.id })); }}>×</button>
    </div>)}</div>
    <div className="ledger-row"><input value={name} maxLength={60} aria-label={t('ledgerViewName')} onChange={(event) => setName(event.target.value)} />
      <button type="button" disabled={busy || !ready || !name.trim() || preferences.savedFilters.length >= 20} onClick={() => { void run(async () => {
        await save({ action: 'upsert', view: { id: crypto.randomUUID(), name: name.trim(), filters, period } }); setName('');
      }); }}>{t('ledgerSaveView')}</button></div>
    {error && <p role="alert">{t('saveFailed')} {error}</p>}
  </details>;
};
