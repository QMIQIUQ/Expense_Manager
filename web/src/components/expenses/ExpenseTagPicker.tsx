import React, { useState } from 'react';
import { useExpenseTags } from '../../hooks/useExpenseTags';
import { useLanguage } from '../../contexts/LanguageContext';
import { expenseTagService } from '../../services/expenseTagService';

export const ExpenseTagPicker: React.FC<{ userId?: string; value: string[]; onChange: (value: string[]) => void }> = ({ userId, value, onChange }) => {
  const { t } = useLanguage();
  const { rows, error: readError } = useExpenseTags(userId);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!userId) return null;
  const create = async () => {
    setBusy(true); setError('');
    try { await expenseTagService.save(userId, name, '#64748b'); setName(''); }
    catch (failure) { setError(String(failure)); } finally { setBusy(false); }
  };
  return <fieldset className="ledger-panel ledger-expense-panel ledger-tag-panel"><legend>{t('ledgerTags')}</legend>
    <p className="ledger-expense-panel-hint">{t('ledgerTagsHint')}</p>
    <div className="ledger-chips">{rows.filter((tag) => !tag.archived || value.includes(tag.id)).map((tag) => <label key={tag.id}>
      <input type="checkbox" checked={value.includes(tag.id)} disabled={!value.includes(tag.id) && (tag.archived || value.length >= 10)}
        onChange={(event) => onChange(event.target.checked ? [...value, tag.id] : value.filter((id) => id !== tag.id))} />
      <span style={{ color: tag.color }}>{tag.name}{tag.archived ? ` (${t('ledgerArchived')})` : ''}</span>
    </label>)}</div>
    <div className="ledger-row ledger-tag-add-row"><input aria-label={t('ledgerTagName')} placeholder={t('ledgerTagName')} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
      <button type="button" disabled={busy || !name.trim() || rows.filter((tag) => !tag.archived).length >= 100} onClick={() => { void create(); }}>{t('ledgerNewTag')}</button></div>
    {(error || readError) && <p role="alert">{error || t('errorLoadingData')}</p>}
  </fieldset>;
};
