import React, { useState } from 'react';
import type { CurrencyCode, ExpenseSplitParticipant } from '../../types';
import { equalExpenseShares } from '../../utils/expenseSplitCalculator';
import { formatCurrency, fromMinorUnits, getCurrencyMinorDigits, toMinorUnits } from '../../domain/money';
import { useLanguage } from '../../contexts/LanguageContext';

export const ExpenseSplitEditor: React.FC<{
  value: ExpenseSplitParticipant[];
  onChange: (value: ExpenseSplitParticipant[]) => void;
  totalMinor: number;
  currency: CurrencyCode;
  trackingEnabled: boolean;
  onTrackingEnabledChange: (enabled: boolean) => void;
}> = ({ value, onChange, totalMinor, currency, trackingEnabled, onTrackingEnabledChange }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const own = totalMinor - value.reduce((total, row) => total + row.owedMinor, 0);
  const digits = getCurrencyMinorDigits(currency);

  return (
    <fieldset className="ledger-panel ledger-expense-panel ledger-split-panel">
      <legend>{t('ledgerSplit')}</legend>
      <p className="ledger-expense-panel-hint">{t('ledgerSplitHint')}</p>

      {value.length === 0 && (
        <label className="ledger-track-toggle">
          <input
            type="checkbox"
            checked={trackingEnabled}
            onChange={(event) => onTrackingEnabledChange(event.target.checked)}
          />
          <span>{t('ledgerTrackFullExpense')}</span>
        </label>
      )}

      {value.map((row) => (
        <div className="ledger-row ledger-split-row" key={row.id}>
          <input
            maxLength={60}
            placeholder={t('ledgerParticipant')}
            aria-label={`${t('ledgerParticipant')} ${row.name}`}
            value={row.name}
            onChange={(event) => onChange(value.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item))}
          />
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step={10 ** -digits}
            value={row.owedMinor ? fromMinorUnits(row.owedMinor, currency) : ''}
            placeholder={t('ledgerOwedAmount')}
            aria-label={`${t('ledgerOwedAmount')} ${row.name}`}
            onChange={(event) => {
              const amount = Number(event.target.value);
              if (Number.isFinite(amount)) {
                onChange(value.map((item) => item.id === row.id ? { ...item, owedMinor: toMinorUnits(Math.max(0, amount), currency) } : item));
              }
            }}
          />
          <button type="button" onClick={() => onChange(value.filter((item) => item.id !== row.id))}>
            {t('delete')}
          </button>
        </div>
      ))}

      <div className="ledger-row ledger-split-add-row">
        <input
          aria-label={t('ledgerNewParticipant')}
          placeholder={t('ledgerNewParticipant')}
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (!name.trim() || value.length >= 30) return;
              onChange([...value, { id: crypto.randomUUID(), name: name.trim(), owedMinor: 0 }]);
              setName('');
            }
          }}
        />
        <button
          type="button"
          disabled={!name.trim() || value.length >= 30}
          onClick={() => {
            onChange([...value, { id: crypto.randomUUID(), name: name.trim(), owedMinor: 0 }]);
            setName('');
          }}
        >
          {t('add')}
        </button>
        <button type="button" disabled={!value.length} onClick={() => onChange(equalExpenseShares(totalMinor, value))}>
          {t('ledgerEqualSplit')}
        </button>
      </div>

      {value.length > 0 && <p className="ledger-repayment-linked" role="status">{t('ledgerSplitRepaymentAuto')}</p>}

      <p className={`ledger-own-share${own < 0 ? ' ledger-own-share-invalid' : ''}`} role={own < 0 ? 'alert' : undefined}>
        <span>{t('ledgerOwnShare')}</span>
        <strong>{formatCurrency(fromMinorUnits(own, currency), currency)}</strong>
      </p>
    </fieldset>
  );
};
