import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createUserWithEmailAndPassword, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { auth, db, usingFirebaseEmulators } from '../src/config/firebase';
import { AuthContext, type AuthContextType } from '../src/contexts/AuthContext';
import { UserSettingsProvider, useUserSettings } from '../src/contexts/UserSettingsContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import IncomeBudgetSettingsModal from '../src/components/budgets/IncomeBudgetSettingsModal';
import IncomeBudgetSummary from '../src/components/budgets/IncomeBudgetSummary';
import { useIncomeBudget } from '../src/hooks/useIncomeBudget';
import { incomeLinkEnabled } from '../src/utils/incomeLinkedBudget';
import { offlineQueue } from '../src/utils/offlineQueue';
import { syncService } from '../src/services/syncService';
import { getTodayLocal } from '../src/utils/dateUtils';
import type { Budget } from '../src/types';
import '../src/index.css';

if (!usingFirebaseEmulators || db.app.options.projectId !== 'demo-expense-manager') throw new Error('Demo emulator only');
// This scenario explicitly checks persistence across reload before requesting sync.
// Keep automatic workers from claiming a lease just as the fixture reloads.
syncService.setAutoSync(false);
const user = await new Promise<User | null>((resolve) => { const unsubscribe = onAuthStateChanged(auth, (value) => { unsubscribe(); resolve(value); }); });
const current = user ?? (await createUserWithEmailAndPassword(auth, `income-ui-${Date.now()}@example.test`, 'Synthetic-fixture-123!')).user;
if (!user) {
  await setDoc(doc(db, 'userSettings', current.uid), { userId: current.uid, billingCycleDay: 1, overallBudgetLimits: { monthly: 1500 } });
  await setDoc(doc(db, 'incomes', current.uid + '-salary'), { userId: current.uid, type: 'salary', amount: 5000, currency: 'MYR', date: getTodayLocal() });
}
await offlineQueue.initialize();
function Fixture() {
  const { settings, loading } = useUserSettings();
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const budgets = [{ id: 'b', userId: current.uid, amount: 1000, currency: 'MYR', period: 'monthly' } as Budget];
  const state = useIncomeBudget(budgets, incomeLinkEnabled(settings?.incomeLinkedBudget), 1);
  return <main style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}><h1>Income budget</h1>
    <button disabled={loading} onClick={() => setOpen(true)}>Edit budget</button>
    <output id="mode">{String(settings?.incomeLinkedBudget?.enabled ?? false)}</output>
    <output id="cap">{settings?.overallBudgetLimits?.monthly ?? 'missing'}</output>
    {settings?.incomeLinkedBudget?.enabled && <IncomeBudgetSummary state={state} />}
    <button onClick={() => { void syncService.syncOfflineQueue().then(async (result) => {
      setSyncStatus(JSON.stringify({ ...result, remaining: offlineQueue.count(current.uid) }));
      setRemote(JSON.stringify((await getDocFromServer(doc(db, 'userSettings', current.uid))).data()));
    }); }}>Sync queued changes</button><pre id="sync-status">{syncStatus}</pre><pre id="remote">{remote}</pre>
    <IncomeBudgetSettingsModal isOpen={open} onClose={() => setOpen(false)} budgets={budgets} onSaveManual={async () => false} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<AuthContext.Provider value={{ currentUser: current, loading: false } as AuthContextType}>
  <LanguageProvider><NotificationProvider><UserSettingsProvider><Fixture /></UserSettingsProvider></NotificationProvider></LanguageProvider>
</AuthContext.Provider>);
