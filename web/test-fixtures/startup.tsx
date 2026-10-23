import React from 'react';
import { createRoot } from 'react-dom/client';
import type { User } from 'firebase/auth';
import { AuthContext, type AuthContextType, useAuth } from '../src/contexts/AuthContext';
import LocalDataBoundary from '../src/components/LocalDataBoundary';
import { offlineQueue } from '../src/utils/offlineQueue';
import { sessionCache } from '../src/utils/sessionCache';
import { applyPendingOperations } from '../src/utils/pendingOperations';
const uid = 'startup-fixture-owner';
const initialized = offlineQueue.initialize();
let restore!: () => void;
const ready = initialized.then(() => new Promise<void>((resolve, reject) => {
  if (new URLSearchParams(location.search).has('failure')) reject(new Error('Fixture storage recovery needed; pending writes retained'));
  else restore = resolve;
}));
void ready.catch(() => undefined);
document.getElementById('restore')!.addEventListener('click', () => { void initialized.then(() => restore?.()); });
document.getElementById('seed')!.addEventListener('click', () => {
  void initialized.then(async () => {
    await offlineQueue.clear();
    sessionCache.set('expenses', uid, [{ id: 'saved', userId: uid, amount: 123 }], { coverage: 'all' });
    await offlineQueue.enqueue({ entity: 'expense', type: 'create', payload: { id: 'pending', userId: uid, amount: 7 } });
    document.getElementById('seeded')!.textContent = 'saved';
  });
});
const auth = { currentUser: { uid } as User, loading: false } as AuthContextType;
function SavedFinances() {
  const userId = useAuth().currentUser!.uid;
  const rows = applyPendingOperations('expenses', userId, sessionCache.get<{ id: string; amount: number }[]>('expenses', userId) ?? []);
  return <p id="finances">{rows.length}:{rows.reduce((sum, row) => sum + row.amount, 0)}</p>;
}
createRoot(document.getElementById('root')!).render(<AuthContext.Provider value={auth}>
  <LocalDataBoundary ready={ready}><SavedFinances /></LocalDataBoundary>
</AuthContext.Provider>);
