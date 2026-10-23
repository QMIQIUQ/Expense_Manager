import React, { useState } from 'react';
import type { CurrencyCode, ExpenseSplitParticipant } from '../../types';
import { equalExpenseShares } from '../../utils/expenseSplitCalculator';
import { formatCurrency, fromMinorUnits, getCurrencyMinorDigits, toMinorUnits } from '../../domain/money';
import { useLanguage } from '../../contexts/LanguageContext';

export const ExpenseSplitEditor: React.FC<{ value: ExpenseSplitParticipant[]; onChange: (value: ExpenseSplitParticipant[]) => void; totalMinor: number; currency: CurrencyCode }> = ({ value, onChange, totalMinor, currency }) => {
  const { t } = useLanguage(); const [name, setName] = useState('');
  const own = totalMinor - value.reduce((total, row) => total + row.owedMinor, 0);
  return <fieldset className="ledger-panel"><legend>{t('ledgerSplit')}</legend><p>{t('ledgerSplitHint')}</p>
    {value.map((row) => <div className="ledger-row" key={row.id}>
      <input maxLength={60} aria-label={t('payerName')} value={row.name} onChange={(event) => onChange(value.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item))} />
      <input type="number" min="0" step={10 ** -getCurrencyMinorDigits(currency)} value={fromMinorUnits(row.owedMinor, currency)} aria-label={`${t('ledgerOwed')} ${row.name}`}
        onChange={(event) => { const amount = Number(event.target.value); if (Number.isFinite(amount)) onChange(value.map((item) => item.id === row.id ? { ...item, owedMinor: toMinorUnits(Math.max(0, amount), currency) } : item)); }} />
      <button type="button" onClick={() => onChange(value.filter((item) => item.id !== row.id))}>{t('delete')}</button>
    </div>)}
    <div className="ledger-row"><input aria-label={t('ledgerNewParticipant')} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
      <button type="button" disabled={!name.trim() || value.length >= 30} onClick={() => { onChange([...value, { id: crypto.randomUUID(), name: name.trim(), owedMinor: 0 }]); setName(''); }}>{t('add')}</button>
      <button type="button" disabled={!value.length} onClick={() => onChange(equalExpenseShares(totalMinor, value))}>{t('ledgerEqualSplit')}</button></div>
    <p role={own < 0 ? 'alert' : undefined}>{t('ledgerOwnShare')}: {formatCurrency(fromMinorUnits(own, currency), currency)}</p>
  </fieldset>;
};
