import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSettingsProvider, useUserSettings } from './UserSettingsContext';
import { offlineQueue } from '../utils/offlineQueue';
import { sessionCache } from '../utils/sessionCache';
import { DEFAULT_INCOME_LINK } from '../utils/incomeLinkedBudget';
import { operationsOverlap } from '../utils/operationDependencies';
const mocks = vi.hoisted(() => ({ get: vi.fn(), direct: vi.fn() }));
vi.mock('./AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u' } }) }));
vi.mock('../services/userSettingsService', () => ({ userSettingsService: { getOrCreate: mocks.get, setIncomeLinkedBudget: mocks.direct } }));
const Consumer = () => {
  const { settings, loading, setIncomeLinkedBudget } = useUserSettings();
  const [result, setResult] = React.useState('');
  return <><button disabled={loading} onClick={() => { void setIncomeLinkedBudget({ ...DEFAULT_INCOME_LINK, enabled: true }).then(() => setResult('accepted')).catch(() => setResult('failed')); }}>Link</button>
    <output data-testid="mode">{String(settings?.incomeLinkedBudget?.enabled ?? false)}</output><output>{result}</output></>;
};
describe('income budget local-first settings', () => {
  beforeEach(async () => {
    vi.restoreAllMocks(); await offlineQueue.clear(); sessionCache.clearAll();
    mocks.get.mockResolvedValue({ id: 'u', userId: 'u', billingCycleDay: 1, overallBudgetLimits: { monthly: 500 } });
  });
  it('durably queues a stable owner, overlays reload and shares allocation dependencies', async () => {
    const view = render(<UserSettingsProvider><Consumer /></UserSettingsProvider>);
    await waitFor(() => expect(screen.getByText('Link')).toBeEnabled());
    fireEvent.click(screen.getByText('Link')); await screen.findByText('accepted');
    const queued = offlineQueue.getAll();
    expect(queued).toHaveLength(1);
    expect(queued[0].payload).toMatchObject({ id: 'u', userId: 'u', incomeLinkedBudgetChange: { config: { enabled: true } } });
    expect(mocks.direct).not.toHaveBeenCalled();
    expect(operationsOverlap(queued[0], { entity: 'budget', payload: { userId: 'u', id: 'b' } })).toBe(true);
    view.unmount(); render(<UserSettingsProvider><Consumer /></UserSettingsProvider>);
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('true'));
  });
  it('rolls back optimism when persistence fails and never reports acceptance', async () => {
    vi.spyOn(offlineQueue, 'enqueueMany').mockResolvedValueOnce(null);
    render(<UserSettingsProvider><Consumer /></UserSettingsProvider>);
    await waitFor(() => expect(screen.getByText('Link')).toBeEnabled()); fireEvent.click(screen.getByText('Link'));
    await screen.findByText('failed'); expect(screen.queryByText('accepted')).toBeNull();
    expect(screen.getByTestId('mode')).toHaveTextContent('false');
    expect(offlineQueue.getAll()).toHaveLength(0);
  });
});
