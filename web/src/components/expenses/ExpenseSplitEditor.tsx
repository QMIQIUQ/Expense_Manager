import React, { useId, useState } from 'react';
import type { CurrencyCode, ExpenseSplitParticipant } from '../../types';
import { equalExpenseShares } from '../../utils/expenseSplitCalculator';
import { formatCurrency, fromMinorUnits, getCurrencyMinorDigits, toMinorUnits } from '../../domain/money';
import { useLanguage } from '../../contexts/LanguageContext';

export const ExpenseSplitEditor: React.FC<{ value: ExpenseSplitParticipant[]; onChange: (value: ExpenseSplitParticipant[]) => void; totalMinor: number; currency: CurrencyCode; trackingEnabled: boolean; onTrackingChange: (enabled: boolean) => void }> = ({ value, onChange, totalMinor, currency, trackingEnabled, onTrackingChange }) => {
  const { t } = useLanguage(); const [name, setName] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const helpId = useId();
  const own = totalMinor - value.reduce((total, row) => total + row.owedMinor, 0);
  const enabled = trackingEnabled || value.length > 0;
  return <fieldset className="expense-receivable-panel" onKeyDown={(event) => { if (event.key === 'Enter') event.stopPropagation(); }}>
    <legend className="expense-receivable-legend">
      <span>{t('ledgerReceivableTitle')}</span>
      <button type="button" className="expense-help-button" aria-label={t('ledgerHelp')} aria-expanded={showHelp} aria-controls={helpId} onClick={() => setShowHelp((open) => !open)}>?</button>
    </legend>
    <div id={helpId} className="expense-receivable-help" role="note" hidden={!showHelp}>
      <p>{t('ledgerReceivableHint')}</p>
      {enabled && <p>{t('ledgerSplitHint')}</p>}
    </div>
    {value.length > 0 ? (
      <p className="expense-receivable-status" role="status">✓ {t('ledgerSplitTrackingEnabled')}</p>
    ) : (
      <label className="expense-receivable-toggle">
        <input type="checkbox" checked={enabled} onChange={(event) => onTrackingChange(event.target.checked)} />
        <span>{t('ledgerTrackReceivable')}</span>
      </label>
    )}
    {enabled && <div className="expense-split-editor-fields">
      {value.map((row) => <div className="ledger-row expense-split-row" key={row.id}>
        <input maxLength={60} aria-label={t('ledgerParticipant')} placeholder={t('ledgerParticipant')} value={row.name} onChange={(event) => onChange(value.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item))} />
        <input type="number" min="0" step={10 ** -getCurrencyMinorDigits(currency)} value={fromMinorUnits(row.owedMinor, currency)} aria-label={`${t('ledgerOwed')} ${row.name}`}
          onChange={(event) => { const amount = Number(event.target.value); if (Number.isFinite(amount)) onChange(value.map((item) => item.id === row.id ? { ...item, owedMinor: toMinorUnits(Math.max(0, amount), currency) } : item)); }} />
        <button type="button" onClick={() => onChange(value.filter((item) => item.id !== row.id))}>{t('delete')}</button>
      </div>)}
      <div className="ledger-row expense-split-new-row"><input aria-label={t('ledgerNewParticipant')} placeholder={t('ledgerNewParticipant')} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
        <button type="button" disabled={!name.trim() || value.length >= 30} onClick={() => { onChange([...value, { id: crypto.randomUUID(), name: name.trim(), owedMinor: 0 }]); setName(''); }}>{t('add')}</button>
        <button type="button" disabled={!value.length} onClick={() => onChange(equalExpenseShares(totalMinor, value))}>{t('ledgerEqualSplit')}</button></div>
      {value.length > 0 && <p role={own < 0 ? 'alert' : undefined} className="expense-split-own-share">{t('ledgerOwnShare')}: {formatCurrency(fromMinorUnits(own, currency), currency)}</p>}
    </div>}
  </fieldset>;
};
