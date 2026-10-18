import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { collection, doc, getDocFromServer, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db, usingFirebaseEmulators } from '../src/config/firebase';
import { getConsistentHistoryPage } from '../src/services/financialSnapshotService';
const output = document.getElementById('result')!;
document.getElementById('run')!.addEventListener('click', () => {
  void (async () => {
    if (!usingFirebaseEmulators || db.app.options.projectId !== 'demo-expense-manager') throw new Error('This fixture requires the demo emulators');
    const user = (await createUserWithEmailAndPassword(auth, `snapshot-${Date.now()}@example.test`, 'Synthetic-fixture-123!')).user;
    const references = Array.from({ length: 101 }, (_, index) => doc(collection(db, 'expenses'), `${user.uid}-${String(index).padStart(3, '0')}`));
    try {
      const seed = writeBatch(db);
      references.forEach((reference) => seed.set(reference, { userId: user.uid, description: 'Snapshot fixture', date: '2026-10-18', amount: 1, category: 'Test' }));
      await seed.commit();
      const first = await getConsistentHistoryPage<{ id: string; amount: number }>('expenses', user.uid);
      await setDoc(references[0], { amount: 99 }, { merge: true });
      const second = await getConsistentHistoryPage<{ id: string; amount: number }>('expenses', user.uid, undefined, first.cursor, first.readTime);
      const current = await getDocFromServer(references[0]);
      output.textContent = JSON.stringify({ firstCount: first.rows.length, secondCount: second.rows.length,
        snapshotAmount: second.rows[0]?.amount, currentAmount: current.data()?.amount, passed: first.rows.length === 100 && second.rows[0]?.amount === 1 && current.data()?.amount === 99 });
    } finally {
      const cleanup = writeBatch(db); references.forEach((reference) => cleanup.delete(reference)); await cleanup.commit(); await deleteUser(user);
    }
  })().catch((error) => { output.textContent = JSON.stringify({ error: error instanceof Error ? error.message : String(error) }); });
});
