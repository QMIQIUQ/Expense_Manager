import React, { useRef, useState } from 'react';
import type { Expense, Repayment, Card, EWallet, Bank } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useExpenseRepayments } from '../../hooks/useExpenseRepayments';
import { acceptLocalMutation } from '../../services/acceptLocalMutation';
import { repaymentService } from '../../services/repaymentService';
import { prepareRepaymentSettlement } from '../../services/splitSettlementService';
import { getRepaymentBaseAmount } from '../../utils/currencyUtils';
import { formatCurrency } from '../../domain/money';
import { outstandingReceivableBase } from '../../utils/expenseSplitCalculator';
import { ExpenseSplitSummary } from '../expenses/ExpenseSplitSummary';
import RepaymentForm from './RepaymentForm';
import RepaymentList from './RepaymentList';
import PopupModal from '../common/PopupModal';

interface RepaymentManagerProps {
  expense: Expense; onClose?: () => void; inline?: boolean; onRepaymentChange?: () => void;
  cards?: Card[]; ewallets?: EWallet[]; banks?: Bank[];
}

/** Legacy and inline entry points use the same durable queue as the expense list. */
const RepaymentManager: React.FC<RepaymentManagerProps> = ({ expense, onClose, onRepaymentChange, cards = [], ewallets = [], banks = [] }) => {
  const { currentUser } = useAuth(); const { t } = useLanguage();
  const owner = useRef(currentUser?.uid); owner.current = currentUser?.uid;
  const { rows, complete } = useExpenseRepayments(currentUser?.uid ?? '', expense.id ?? '');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Repayment | null>(null);
  const [error, setError] = useState('');
  const save = async (input: Omit<Repayment, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'expenseId'>): Promise<boolean> => {
    const userId = currentUser?.uid;
    if (!userId || expense.userId !== userId || !expense.id) return false;
    setError('');
    try {
      const settlement = await prepareRepaymentSettlement(input, expense, editing ?? undefined);
      if (owner.current !== userId) return false;
      await acceptLocalMutation({ entity: 'repayment', type: editing ? 'update' : 'create', payload: {
        ...input, ...settlement, id: editing?.id ?? repaymentService.createId(), userId, expenseId: expense.id,
      } });
      setShowForm(false); setEditing(null); onRepaymentChange?.(); return true;
    } catch (failure) { setError(String(failure)); return false; }
  };
  const remove = async (id: string) => {
    if (!currentUser || expense.userId !== currentUser.uid) return;
    setError('');
    try { await acceptLocalMutation({ entity: 'repayment', type: 'delete', payload: { id, userId: currentUser.uid, expenseId: expense.id } }); onRepaymentChange?.(); }
    catch (failure) { setError(String(failure)); }
  };
  const paid = rows.reduce((sum, row) => sum + getRepaymentBaseAmount(row), 0);
  return <section className="ledger-panel"><div className="ledger-row"><h3>{t('repaymentRecords')}</h3>
    <button type="button" onClick={() => { setEditing(null); setShowForm(true); }}>{t('addRepayment')}</button>
    {onClose && <button type="button" onClick={onClose}>{t('close')}</button>}</div>
    {!complete ? <p role="status">{t('incompleteFinancialData')}</p> : <p>{t('totalRepaid')}: {formatCurrency(paid, 'MYR')} · {t('remainingAmount')}: {formatCurrency(outstandingReceivableBase(expense, rows), 'MYR')}</p>}
    {!!expense.splitParticipants?.length && <ExpenseSplitSummary expense={expense} />}
    {error && <p role="alert">{error}</p>}
    <RepaymentList repayments={rows} onDelete={(id) => { void remove(id); }} onEdit={(row) => { setEditing(row); setShowForm(true); }} cards={cards} ewallets={ewallets} banks={banks} />
    <PopupModal isOpen={showForm} onClose={() => setShowForm(false)} title={t('addRepayment')} hideFooter>
      <RepaymentForm key={editing?.id ?? 'new'} expenseId={expense.id ?? ''} initialData={editing ?? undefined}
        splitParticipants={expense.splitParticipants} expenseCurrency={expense.currency} cards={cards} ewallets={ewallets} banks={banks}
        onSubmit={save} onCancel={() => setShowForm(false)} />
    </PopupModal>
  </section>;
};
export default RepaymentManager;
