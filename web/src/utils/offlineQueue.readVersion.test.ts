import { beforeEach, describe, expect, it } from 'vitest';
import { offlineQueue } from './offlineQueue';
beforeEach(async () => { await offlineQueue.clear(); });
describe('expense content revision', () => {
  it('changes for owner expense content and acknowledgement, but not for claims or identical refreshes', async () => {
    const initial = offlineQueue.expenseRevision('owner'); const other = offlineQueue.expenseRevision('other');
    await offlineQueue.enqueue({ type: 'create', entity: 'expense', payload: { id: 'expense', userId: 'owner', amount: 10 } });
    const accepted = offlineQueue.expenseRevision('owner'); expect(accepted).toBeGreaterThan(initial);
    const claim = await offlineQueue.claimNext('owner');
    expect(offlineQueue.expenseRevision('owner')).toBe(accepted);
    await offlineQueue.refresh(); await offlineQueue.refresh();
    expect(offlineQueue.expenseRevision('owner')).toBe(accepted);
    expect(offlineQueue.expenseRevision('other')).toBe(other);
    await offlineQueue.complete(claim!.id, claim!.lease!.token);
    expect(offlineQueue.expenseRevision('owner')).toBeGreaterThan(accepted);
  });
});
