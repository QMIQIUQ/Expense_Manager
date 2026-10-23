import React, { useEffect, useRef, useState } from 'react';
import { useExpenseTags } from '../../hooks/useExpenseTags';
import { useLanguage } from '../../contexts/LanguageContext';
import { expenseTagService, normalizeTagName } from '../../services/expenseTagService';
import '../../styles/ledger.css';

export const ExpenseTagPicker: React.FC<{ userId?: string; value: string[]; onChange: (value: string[]) => void; compact?: boolean }> = ({ userId, value, onChange, compact = false }) => {
  const { t } = useLanguage();
  const { rows, error: readError } = useExpenseTags(userId);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const ownerRef = useRef(userId);
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  valueRef.current = value;
  onChangeRef.current = onChange;
  if (ownerRef.current !== userId) {
    ownerRef.current = userId;
    requestRef.current += 1;
    busyRef.current = false;
  }
  useEffect(() => {
    setBusy(false);
    busyRef.current = false;
    setError('');
    setName('');
  }, [userId]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);
  if (!userId) return null;
  const availableTags = rows.filter((tag) => !tag.archived || value.includes(tag.id));
  const selectedTags = availableTags.filter((tag) => value.includes(tag.id));
  const matchingTag = rows.find((tag) => !tag.archived && normalizeTagName(tag.name) === normalizeTagName(name));
  const canAdd = !!name.trim() && (
    matchingTag
      ? value.includes(matchingTag.id) || value.length < 10
      : rows.filter((tag) => !tag.archived).length < 100
  );
  const create = async () => {
    const normalizedName = name.trim();
    if (!normalizedName || !canAdd || busyRef.current) return;
    const existing = rows.find((tag) => !tag.archived && normalizeTagName(tag.name) === normalizeTagName(normalizedName));
    if (existing) {
      const currentValue = valueRef.current;
      if (!currentValue.includes(existing.id) && currentValue.length < 10) onChangeRef.current([...currentValue, existing.id]);
      setName('');
      return;
    }
    busyRef.current = true;
    setBusy(true); setError('');
    const requestId = ++requestRef.current;
    const requestOwner = userId;
    try {
      const id = await expenseTagService.save(requestOwner, normalizedName, '#64748b');
      if (!mountedRef.current || ownerRef.current !== requestOwner || requestRef.current !== requestId) return;
      const currentValue = valueRef.current;
      if (!currentValue.includes(id) && currentValue.length < 10) onChangeRef.current([...currentValue, id]);
      setName('');
    } catch (failure) {
      if (mountedRef.current && ownerRef.current === requestOwner && requestRef.current === requestId) setError(String(failure));
    } finally {
      if (mountedRef.current && ownerRef.current === requestOwner && requestRef.current === requestId) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <fieldset className={`ledger-panel expense-tag-picker ${compact ? 'expense-tag-picker-compact' : ''}`} onKeyDown={(event) => { if (event.key === 'Enter') event.stopPropagation(); }}>
      <legend>{t('ledgerTags')}</legend>
      <div className="ledger-row expense-tag-picker-input-row">
        <input
          aria-label={t('ledgerNewTag')}
          placeholder={t('ledgerNewTag')}
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); void create(); } }}
        />
        <button type="button" disabled={busy || !canAdd} onClick={() => { void create(); }}>
          {matchingTag ? t('add') : t('ledgerNewTag')}
        </button>
      </div>
      {selectedTags.length > 0 && (
        <div className="expense-tag-selected-chips" aria-label={t('ledgerTags')}>
          {selectedTags.map((tag) => (
            <span className="expense-tag-chip" key={tag.id} style={{ borderColor: tag.color }}>
              <span style={{ color: tag.color }}>{tag.name}{tag.archived ? ` (${t('ledgerArchived')})` : ''}</span>
              <button type="button" aria-label={`${t('ledgerRemoveTag')} ${tag.name}`} onClick={() => onChange(value.filter((id) => id !== tag.id))}>×</button>
            </span>
          ))}
        </div>
      )}
      {availableTags.length > 0 && (
        <details className="expense-tag-picker-options">
          <summary>{t('ledgerChooseTags')}</summary>
          <div className="ledger-chips">
            {availableTags.map((tag) => (
              <label key={tag.id}>
                <input
                  type="checkbox"
                  checked={value.includes(tag.id)}
                  disabled={!value.includes(tag.id) && (tag.archived || value.length >= 10)}
                  onChange={(event) => onChange(event.target.checked ? [...value, tag.id] : value.filter((id) => id !== tag.id))}
                />
                <span style={{ color: tag.color }}>{tag.name}{tag.archived ? ` (${t('ledgerArchived')})` : ''}</span>
              </label>
            ))}
          </div>
        </details>
      )}
      {(error || readError) && <p role="alert">{error || t('errorLoadingData')}</p>}
    </fieldset>
  );
};
