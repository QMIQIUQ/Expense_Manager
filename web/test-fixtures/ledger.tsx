import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createUserWithEmailAndPassword, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDocFromServer, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { auth, db, usingFirebaseEmulators } from '../src/config/firebase';
import { AuthContext, type AuthContextType } from '../src/contexts/AuthContext';
import { UserSettingsProvider } from '../src/contexts/UserSettingsContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import SpendingAnomalyWidget from '../src/components/dashboard/widgets/SpendingAnomalyWidget';
import type { WidgetProps } from '../src/components/dashboard/widgets/types';
import ReceiptAttachmentPanel from '../src/components/expenses/ReceiptAttachmentPanel';
import { ExpenseTagPicker } from '../src/components/expenses/ExpenseTagPicker';
import { ExpenseSavedViews } from '../src/components/expenses/ExpenseSavedViews';
import { ExpenseSplitEditor } from '../src/components/expenses/ExpenseSplitEditor';
import RepaymentManager from '../src/components/repayment/RepaymentManager';
import AccountReconciliationManager from '../src/components/reconciliation/AccountReconciliationManager';
import { useExpenseDuplicateGuard } from '../src/hooks/useExpenseDuplicateGuard';
import { DEFAULT_EXPENSE_FILTERS, type ExpensePeriodSelection } from '../src/types/expensePeriod';
import { offlineQueue } from '../src/utils/offlineQueue';
import { syncService } from '../src/services/syncService';
import { getTodayLocal } from '../src/utils/dateUtils';
import type { Expense, Bank, ExpenseSplitParticipant } from '../src/types';
import '../src/index.css';
import '../src/styles/ledger.css';
if (!usingFirebaseEmulators || db.app.options.projectId !== 'demo-expense-manager') throw new Error('Demo emulator only');
syncService.setAutoSync(false);
const user = await new Promise<User | null>((resolve) => { const stop = onAuthStateChanged(auth, (value) => { stop(); resolve(value); }); });
const current = user ?? (await createUserWithEmailAndPassword(auth, `ledger-${Date.now()}@example.test`, 'Synthetic-fixture-123!')).user;
const bank = { id: `${current.uid}-ledger-bank`, userId: current.uid, name: 'Ledger bank', balance: 1000, currency: 'MYR' } as Bank;
const expense = { id: `${current.uid}-ledger-expense`, userId: current.uid, description: 'Split dinner', amount: 120, baseAmount: 120, currency: 'MYR', baseCurrency: 'MYR', date: getTodayLocal(), category: 'Food', paymentMethod: 'cash', needsRepaymentTracking: true,
  splitParticipants: [{ id: 'amy', name: 'Amy', owedMinor: 4000 }, { id: 'bob', name: 'Bob', owedMinor: 4000 }] } as Expense;
if (!(await getDocFromServer(doc(db, 'expenses', expense.id!))).exists()) {
  await setDoc(doc(db, 'banks', bank.id!), bank);
  const batch = writeBatch(db); const today = new Date(`${getTodayLocal()}T12:00:00`);
  for (let offset = 0; offset <= 3; offset++) for (let index = 0; index < (offset ? 5 : 3); index++) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const dateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    batch.set(doc(db, 'expenses', `${current.uid}-insight-${offset}-${index}`), { userId: current.uid, description: 'Insight sample', category: 'Insight food', amount: offset ? 10 : 100, baseAmount: offset ? 10 : 100, currency: 'MYR', baseCurrency: 'MYR', date: dateText, paymentMethod: 'cash' });
  }
  await batch.commit();
  await setDoc(doc(db, 'expenses', expense.id!), expense);
  await setDoc(doc(db, 'expenses', `${current.uid}-ledger-bank-expense`), { ...expense, id: `${current.uid}-ledger-bank-expense`, description: 'Coffee', amount: 10, baseAmount: 10, paymentMethod: 'bank', bankId: bank.id, splitParticipants: [] });
  if (!(await getDocFromServer(doc(db, 'userSettings', current.uid))).exists()) await setDoc(doc(db, 'userSettings', current.uid), { userId: current.uid, billingCycleDay: 1 });
}
await offlineQueue.initialize();
function Fixture() {
  const [tab, setTab] = useState('repayments'); const [status, setStatus] = useState('');
  const [tags, setTags] = useState<string[]>([]); const [filters, setFilters] = useState(DEFAULT_EXPENSE_FILTERS);
  const [period, setPeriod] = useState<ExpensePeriodSelection>({ mode: 'month', anchorDate: getTodayLocal() });
  const [participants, setParticipants] = useState<ExpenseSplitParticipant[]>([]);
  const guard = useExpenseDuplicateGuard(current.uid); const [accepted, setAccepted] = useState(0);
  return <main style={{ maxWidth: 800, margin: '16px auto', padding: 12 }}><h1>Ledger features</h1>
    <nav>{['repayments','reconciliation','views','duplicates','split','insights','receipts'].map((name) => <button key={name} onClick={() => setTab(name)}>{name}</button>)}</nav>
    <button onClick={() => { void syncService.syncOfflineQueue().then((result) => setStatus(JSON.stringify({ ...result, remaining: offlineQueue.count(current.uid) }))); }}>Sync pending ledger</button><output id="ledger-sync">{status}</output>
    {tab === 'receipts' && <><ReceiptAttachmentPanel expense={expense} /><button onClick={() => { void deleteDoc(doc(db, 'expenses', expense.id!)).then(() => setStatus('parent removed')); }}>Remove receipt parent remotely</button><button onClick={() => { void setDoc(doc(db, 'expenses', expense.id!), expense).then(() => setStatus('parent restored')); }}>Restore receipt parent remotely</button></>}
    {tab === 'insights' && <SpendingAnomalyWidget {...({} as WidgetProps)} />}
    {tab === 'repayments' && <RepaymentManager expense={expense} banks={[bank]} />}
    {tab === 'reconciliation' && <AccountReconciliationManager banks={[bank]} cards={[]} ewallets={[]} />}
    {tab === 'split' && <ExpenseSplitEditor totalMinor={12000} currency="MYR" value={participants} onChange={setParticipants} />}
    {tab === 'views' && <><input aria-label="Search fixture" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} />
      <ExpenseTagPicker userId={current.uid} value={tags} onChange={setTags} />
      <ExpenseSavedViews userId={current.uid} filters={filters} period={period} onApply={(view) => { setFilters(view.filters); setPeriod(view.period); }} /></>}
    {tab === 'duplicates' && <><button onClick={() => { void guard.confirm(expense).then((ok) => { if (ok) setAccepted((value) => value + 1); }); }}>Review seeded duplicate</button><output id="accepted">{accepted}</output>{guard.dialog}</>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<AuthContext.Provider value={{ currentUser: current, loading: false } as AuthContextType}><ThemeProvider><LanguageProvider><NotificationProvider><UserSettingsProvider><Fixture /></UserSettingsProvider></NotificationProvider></LanguageProvider></ThemeProvider></AuthContext.Provider>);
