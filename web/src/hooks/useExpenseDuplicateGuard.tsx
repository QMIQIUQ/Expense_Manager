import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import PopupModal from '../components/common/PopupModal';
import { reviewExpenseDuplicates, type DuplicateReview } from '../services/expenseDuplicateService';
import type { DuplicateExpenseInput } from '../utils/expenseDuplicateCandidates';
import { formatCurrency } from '../domain/money';

export const useExpenseDuplicateGuard = (userId?: string) => {
  const { t } = useLanguage();
  const owner = useRef(userId); owner.current = userId;
  const [review, setReview] = useState<DuplicateReview>();
  const pending = useRef<((accepted: boolean) => void)>();
  const serial = useRef(0);
  const finish = (accepted: boolean) => { pending.current?.(accepted); pending.current = undefined; setReview(undefined); };
  const cancel = () => { serial.current++; finish(false); };
  useEffect(() => {
    setReview(undefined);
    const invalidate = () => { serial.current++; pending.current?.(false); pending.current = undefined; };
    return () => invalidate();
  }, [userId]);
  const confirm = async (input: DuplicateExpenseInput): Promise<boolean> => {
    if (!userId || pending.current) return false;
    const token = ++serial.current;
    const result = await reviewExpenseDuplicates(userId, input);
    if (serial.current !== token || owner.current !== userId) return false;
    if (result.complete && !result.candidates.length) return true;
    return new Promise<boolean>((resolve) => { pending.current = resolve; setReview(result); });
  };
  const dialog = <PopupModal isOpen={!!review} onClose={() => finish(false)} title={t('ledgerDuplicateTitle')}
    primaryButtonLabel={t('ledgerAddAnyway')} secondaryButtonLabel={t('back')}
    onPrimaryAction={() => finish(true)} onSecondaryAction={() => finish(false)}>
    <p>{t(review?.complete ? 'ledgerDuplicateHint' : 'ledgerDuplicateIncomplete')}</p>
    <ul>{review?.candidates.slice(0, 10).map((row) => <li key={row.id}>{row.date} · {row.description} · {formatCurrency(row.amount, row.currency)}</li>)}</ul>
  </PopupModal>;
  return { confirm, cancel, dialog };
};
