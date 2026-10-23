import React, { useEffect, useRef, useState } from 'react';
import type { Expense } from '../../types';
import type { ReceiptAttachment } from '../../types/receiptAttachment';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReceiptAttachments } from '../../hooks/useReceiptAttachments';
import { addReceiptAttachment, archiveReceiptAttachment, loadReceiptContent } from '../../services/receiptAttachmentService';
import { prepareReceiptContent } from '../../utils/receiptAttachmentContent';
import { offlineQueue } from '../../utils/offlineQueue';
const ReceiptAttachmentPanel: React.FC<{ expense: Expense }> = ({ expense }) => {
  const { currentUser } = useAuth(); const { t } = useLanguage();
  const userId = currentUser?.uid ?? ''; const scope = `${userId}:${expense.id}`;
  const active = useRef(scope); active.current = scope;
  const { rows, complete, error: readError, reload } = useReceiptAttachments(userId, expense.id ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [showArchived, setShowArchived] = useState(false);
  const [preview, setPreview] = useState<{ scope: string; url: string; row: ReceiptAttachment }>();
  const serial = useRef(0); const mounted = useRef(true); const upload = useRef<HTMLInputElement>(null);
  useEffect(() => { mounted.current = true; const invalidate = () => { serial.current++; }; return () => { mounted.current = false; invalidate(); }; }, []);
  useEffect(() => { serial.current++; setBusy(false); setError(''); setPreview(undefined); setShowArchived(false); }, [scope]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);
  if (!userId || expense.userId !== userId || !expense.id) return null;
  const run = async (action: (valid: () => boolean) => Promise<void>) => {
    if (busy) return;
    const token = ++serial.current; const requestedScope = scope;
    const valid = () => mounted.current && serial.current === token && active.current === requestedScope;
    setBusy(true); setError('');
    try { await action(valid); } catch (failure) { if (valid()) setError(String(failure)); }
    finally { if (valid()) setBusy(false); }
  };
  const pending = offlineQueue.getAll().filter((operation) => operation.entity === 'receiptAttachment' && (operation.payload as ReceiptAttachment)?.userId === userId && (operation.payload as ReceiptAttachment)?.expenseId === expense.id);
  return <section className="ledger-panel"><h4>{t('receiptArchiveTitle')}</h4><p>{t('receiptArchiveLimit')}</p>
    <input ref={upload} aria-label={t('receiptArchiveChoose')} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} onChange={(event) => {
      const file = event.target.files?.[0]; if (!file) return;
      void run(async (valid) => {
        const content = await prepareReceiptContent(file, file.name); if (!valid()) return;
        await addReceiptAttachment(userId, expense.id!, content);
        if (valid() && upload.current) upload.current.value = '';
      });
    }} />
    <div className="ledger-row"><button type="button" disabled={busy} onClick={reload}>{t('receiptArchiveRefresh')}</button>
      <label><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />{t('receiptArchiveShowArchived')}</label></div>
    {!complete && <p role="status">{t('receiptArchiveIncomplete')}</p>}
    <ul>{rows.filter((row) => showArchived || !row.archived).map((row) => <li key={row.id} className="ledger-panel"><strong>{row.name}</strong> · {Math.ceil(row.byteSize / 1024)} KiB
      {row.optimized && <span> · {t('receiptArchiveOptimized')}</span>}
      <div className="ledger-row"><button type="button" disabled={busy} onClick={() => { void run(async (valid) => { const blob = await loadReceiptContent(row); if (valid()) setPreview({ scope, url: URL.createObjectURL(blob), row }); }); }}>{t('receiptArchiveView')}</button>
        <button type="button" disabled={busy} onClick={() => { void run(async (valid) => { if (valid()) await archiveReceiptAttachment(row, !row.archived); }); }}>{t(row.archived ? 'receiptArchiveRestore' : 'receiptArchiveArchive')}</button></div>
      {pending.some((operation) => (operation.payload as ReceiptAttachment).id === row.id) && <p>{t('ledgerSavedLocally')}</p>}
    </li>)}</ul>
    {preview?.scope === scope && <div className="ledger-panel">{preview.row.contentType.startsWith('image/') && <img src={preview.url} alt={preview.row.name} />}
      <a href={preview.url} download={preview.row.name}>{t('receiptArchiveDownload')} {preview.row.name}</a>
      <button type="button" onClick={() => setPreview(undefined)}>{t('close')}</button></div>}
    {pending.some((operation) => operation.status === 'needs-attention') && <div role="alert"><p>{t('receiptArchiveSyncError')}</p><ul>{pending.filter((operation) => operation.status === 'needs-attention' && operation.lastError).map((operation) => <li key={operation.id}>{operation.lastError}</li>)}</ul>
      <button type="button" disabled={busy} onClick={() => { void run(async (valid) => { for (const operation of pending.filter((row) => row.status === 'needs-attention')) { if (!valid()) return; if (!await offlineQueue.retry(operation.id)) throw new Error('Unable to persist receipt retry'); } }); }}>{t('retry')}</button></div>}
    {(error || readError) && <p role="alert">{error || readError}</p>}
  </section>;
};
export default ReceiptAttachmentPanel;
