import React, { useState } from 'react';
import { useExpenseTags } from '../../hooks/useExpenseTags';
import { expenseTagService } from '../../services/expenseTagService';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ExpenseTag } from '../../types';

const TagRow: React.FC<{ userId: string; tag: ExpenseTag }> = ({ userId, tag }) => {
  const { t } = useLanguage();
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); try { await action(); } catch (failure) { setError(String(failure)); } finally { setBusy(false); }
  };
  return <div className="ledger-panel"><div className="ledger-row">
    <input className="ui-control--standard" aria-label={t('ledgerTagName')} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
    <input aria-label={t('color')} type="color" value={color} onChange={(event) => setColor(event.target.value)} />
    <button type="button" disabled={busy || !name.trim()} onClick={() => { void run(async () => { await expenseTagService.save(userId, name, color, tag); }); }}>{t('save')}</button>
    <button type="button" disabled={busy} onClick={() => { void run(() => expenseTagService.archive(userId, tag, !tag.archived)); }}>{t(tag.archived ? 'ledgerRestore' : 'ledgerArchive')}</button>
  </div>{error && <p role="alert">{error}</p>}</div>;
};
export const ExpenseTagManager: React.FC<{ userId: string }> = ({ userId }) => {
  const { t } = useLanguage(); const { rows, error } = useExpenseTags(userId);
  const [name, setName] = useState(''); const [color, setColor] = useState('#64748b');
  const [busy, setBusy] = useState(false); const [failure, setFailure] = useState('');
  return <section><h3>{t('ledgerManageTags')}</h3><p>{t('ledgerArchiveHint')}</p>
    <div className="ledger-row"><input className="ui-control--standard" aria-label={t('ledgerNewTag')} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
      <input type="color" aria-label={t('color')} value={color} onChange={(event) => setColor(event.target.value)} />
      <button type="button" disabled={busy || !name.trim() || rows.filter((tag) => !tag.archived).length >= 100} onClick={async () => {
        setBusy(true); setFailure(''); try { await expenseTagService.save(userId, name, color); setName(''); }
        catch (caught) { setFailure(String(caught)); } finally { setBusy(false); }
      }}>{t('add')}</button></div>
    {failure && <p role="alert">{failure}</p>}
    {rows.map((tag) => <TagRow key={tag.id} userId={userId} tag={tag} />)}
    {error && <p role="alert">{t('errorLoadingData')}</p>}
  </section>;
};
