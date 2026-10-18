import { offlineQueue, type QueuedOperation } from '../src/utils/offlineQueue';
let claim: QueuedOperation | null = null;
const write = (id: string, value: unknown) => { document.getElementById(id)!.textContent = JSON.stringify(value); };
const render = () => write('rows', offlineQueue.getAll());
const action = (id: string, run: () => Promise<unknown>) => {
  document.getElementById(id)!.addEventListener('click', () => {
    void run().then((value) => { render(); write('result', value ?? 'ok'); }).catch((error) => write('result', { error: String(error) }));
  });
};
action('clear', () => offlineQueue.clear());
action('enqueue', async () => {
  const prefix = (document.getElementById('prefix') as HTMLInputElement).value;
  await Promise.all(Array.from({ length: 40 }, (_, index) => offlineQueue.enqueue({ type: 'create', entity: 'income', payload: { id: prefix + '-' + index, userId: 'fixture-user' } })));
  return 'enqueued';
});
action('refresh', () => offlineQueue.refresh());
action('claim', async () => { claim = await offlineQueue.claimNext('fixture-user'); write('claim-output', claim); });
action('complete', () => claim ? offlineQueue.complete(claim.id, claim.lease!.token) : Promise.resolve(false));
window.addEventListener('offline-queue-changed', render);
await offlineQueue.initialize(); render(); write('ready', true);
