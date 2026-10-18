import { describe, expect, it, vi } from 'vitest';
import { publishCurrentGeneration } from './readGeneration';
describe('historical relation generation checks', () => {
  it('retries rather than publishing a read invalidated during its request', async () => {
    let generation = 0;
    const fetch = vi.fn().mockImplementationOnce(async () => { generation++; return ['stale']; }).mockResolvedValueOnce(['current']);
    const publish = vi.fn();
    await publishCurrentGeneration(fetch, () => generation, () => true, publish);
    expect(fetch).toHaveBeenCalledTimes(2); expect(publish).toHaveBeenCalledExactlyOnceWith(['current']);
  });
  it('does not publish into a switched account', async () => {
    const publish = vi.fn();
    await publishCurrentGeneration(async () => ['previous account'], () => 0, () => false, publish);
    expect(publish).not.toHaveBeenCalled();
  });
});
