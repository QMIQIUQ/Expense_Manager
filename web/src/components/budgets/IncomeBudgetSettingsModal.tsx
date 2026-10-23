import React, { useEffect, useState } from 'react';
import type { Budget, IncomeLinkedBudgetSettings } from '../../types';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useIncomeBudget } from '../../hooks/useIncomeBudget';
import { DEFAULT_INCOME_LINK, validIncomeLink } from '../../utils/incomeLinkedBudget';
import { getAllocatedBudgetMinorUnits } from '../../utils/budgetAllocation';
import { formatMoney } from '../../utils/currencyUtils';
import PopupModal from '../common/PopupModal';
import IncomeBudgetSummary from './IncomeBudgetSummary';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  budgets: Budget[];
  onSaveManual: (amount: number) => Promise<boolean>;
}

const IncomeBudgetSettingsModal: React.FC<Props> = ({ isOpen, onClose, budgets, onSaveManual }) => {
  const { settings, loading, setIncomeLinkedBudget } = useUserSettings();
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [draft, setDraft] = useState<IncomeLinkedBudgetSettings>(DEFAULT_INCOME_LINK);
  const [percentage, setPercentage] = useState('80');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const allocated = getAllocatedBudgetMinorUnits(budgets, 'monthly');
  const config = { ...draft, percentage: Number(percentage) };
  const preview = useIncomeBudget(budgets, isOpen, settings?.billingCycleDay ?? 1, config);

  useEffect(() => {
    if (!isOpen) { setInitialized(false); return; }
    if (loading || initialized) return;
    setInitialized(true);
    const saved = validIncomeLink(settings?.incomeLinkedBudget) ? settings.incomeLinkedBudget : DEFAULT_INCOME_LINK;
    setDraft(saved);
    setPercentage(String(saved.percentage));
    const fixed = settings?.overallBudgetLimits?.monthly;
    const allocation = getAllocatedBudgetMinorUnits(budgets, 'monthly');
    setAmount(fixed === undefined ? allocation === null ? '' : (allocation / 100).toFixed(2) : fixed.toFixed(2));
    setError('');
  }, [isOpen, loading, settings, budgets, initialized]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loading || !initialized) return;
    setError('');
    if (draft.enabled && (!percentage.trim() || !validIncomeLink(config))) { setError(t('incomeBudgetInvalidPercentage')); return; }
    const fixed = Number(amount);
    if (!draft.enabled && (!amount.trim() || !Number.isFinite(fixed) || !Number.isSafeInteger(Math.round(fixed * 100)) ||
      allocated === null || Math.round(fixed * 100) < allocated)) { setError(t('overallBudgetBelowAllocation')); return; }
    setSaving(true);
    try {
      if (!draft.enabled && settings?.incomeLinkedBudget === undefined) {
        if (!await onSaveManual(fixed)) { setError(t('budgetLimitSaveFailed')); return; }
      } else {
        // An inactive draft still carries a valid remembered percentage.
        const next = draft.enabled ? config : { ...draft, percentage: validIncomeLink(config) ? config.percentage : DEFAULT_INCOME_LINK.percentage };
        await setIncomeLinkedBudget(next, next.enabled ? undefined : fixed);
        showNotification('info', t('operationSavedOffline'));
      }
      onClose();
    } catch (failure) {
      const code = failure && typeof failure === 'object' && 'code' in failure ? failure.code : '';
      setError(code === 'local-persistence-failed' ? t('offlineQueueSaveFailed') : t('budgetLimitSaveFailed'));
    } finally { setSaving(false); }
  };

  return <PopupModal isOpen={isOpen} onClose={() => { if (!saving) onClose(); }} title={t('editOverallBudget')}
    isForm onSubmit={save} primaryButtonLabel={saving ? t('saving') : t('save')} primaryButtonDisabled={saving || loading || !initialized} maxWidth="600px">
    <div className="income-budget-form">
      <label htmlFor="income-budget-mode">{t('incomeBudgetMode')}</label>
      <select id="income-budget-mode" value={draft.enabled ? 'income' : 'manual'} disabled={saving || loading || !initialized} onChange={(event) => {
        const enabled = event.target.value === 'income';
        setDraft((old) => ({ ...old, enabled }));
        if (!enabled && allocated !== null && (!amount.trim() || Number(amount) * 100 < allocated)) setAmount((allocated / 100).toFixed(2));
        setError('');
      }}>
        <option value="manual">{t('manualBudgetMode')}</option>
        <option value="income">{t('incomeLinkedBudgetMode')}</option>
      </select>
      {draft.enabled ? <>
        <label htmlFor="income-budget-percentage">{t('incomeBudgetPercentage')}</label>
        <input id="income-budget-percentage" type="number" required min="0" max="100" step="0.01" value={percentage}
          disabled={saving} onChange={(event) => { setPercentage(event.target.value); setError(''); }} />
        <label className="income-budget-checkbox"><input type="checkbox" checked={draft.includeReimbursements} disabled={saving}
          onChange={(event) => setDraft((old) => ({ ...old, includeReimbursements: event.target.checked }))} />{t('incomeBudgetIncludeReimbursements')}</label>
        <label className="income-budget-checkbox"><input type="checkbox" checked={draft.includeRepayments} disabled={saving}
          onChange={(event) => setDraft((old) => ({ ...old, includeRepayments: event.target.checked }))} />{t('incomeBudgetIncludeRepayments')}</label>
        <p className="income-budget-caption">{t('incomeBudgetSourceHint')}</p>
        <IncomeBudgetSummary state={preview} compact />
      </> : <>
        <label htmlFor="overall-budget-amount">{t('overallBudgetAmount')}</label>
        <input id="overall-budget-amount" type="number" required min="0" step="0.01" value={amount} disabled={saving}
          onChange={(event) => { setAmount(event.target.value); setError(''); }} />
        <p className="income-budget-caption">{settings?.overallBudgetLimits?.monthly === undefined ? t('overallBudgetSuggestedHint') : t('overallBudgetSavedHint')}</p>
        <p className="income-budget-caption">{t('allocatedBudget')}: {allocated === null ? '—' : formatMoney(allocated / 100, 'MYR')}</p>
        {settings?.incomeLinkedBudget?.enabled && <p className="income-budget-caption">{t('incomeBudgetRestoreHint')}</p>}
      </>}
      {error && <p role="alert" className="income-budget-warning">{error}</p>}
    </div>
  </PopupModal>;
};

export default IncomeBudgetSettingsModal;
