import React, { useEffect, useRef, useState } from 'react';
import { useExpenseTags } from '../../hooks/useExpenseTags';
import { useLanguage } from '../../contexts/LanguageContext';
import { expenseTagService, normalizeTagName } from '../../services/expenseTagService';
import '../../styles/ledger.css';

export const ExpenseTagPicker: React.FC<{ userId?: string; value: string[]; onChange: (value: string[]) => void; compact?: boolean; frameless?: boolean }> = ({ userId, value, onChange, compact = false, frameless = false }) => {
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
  const PickerContainer = frameless ? 'div' : 'fieldset';
  return (
    <PickerContainer
      className={`expense-tag-picker ${compact && !frameless ? 'expense-tag-picker-compact' : ''} ${frameless ? 'expense-tag-picker-inline' : 'ledger-panel'}`}
      role={frameless ? 'group' : undefined}
      aria-label={frameless ? t('ledgerTags') : undefined}
      onKeyDown={(event) => { if (event.key === 'Enter') event.stopPropagation(); }}
    >
      {frameless ? <div className="expense-tag-picker-label">{t('ledgerTags')}</div> : <legend>{t('ledgerTags')}</legend>}
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
          {t('add')}
        </button>
      </div>
      {availableTags.length > 0 && (
        <div className="expense-tag-picker-options" role="group" aria-label={t('ledgerChooseTags')}>
          <div className="expense-tag-picker-options-label">{t('ledgerChooseTags')}</div>
          <div className="expense-tag-picker-options-list">
            {availableTags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className="expense-tag-option"
                aria-pressed={value.includes(tag.id)}
                disabled={!value.includes(tag.id) && (tag.archived || value.length >= 10)}
                onClick={() => onChange(value.includes(tag.id) ? value.filter((id) => id !== tag.id) : [...value, tag.id])}
              >
                <span className="expense-tag-option-indicator" aria-hidden="true">{value.includes(tag.id) ? '✓' : '+'}</span>
                <span style={{ color: tag.color }}>{tag.name}{tag.archived ? ` (${t('ledgerArchived')})` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {(error || readError) && <p role="alert">{error || t('errorLoadingData')}</p>}
    </PickerContainer>
  );
};
