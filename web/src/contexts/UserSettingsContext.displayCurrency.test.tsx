import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineQueue } from '../utils/offlineQueue';
import { sessionCache } from '../utils/sessionCache';
import { writeLocalFirst } from '../utils/localFirstMutation';
import { LanguageProvider } from './LanguageContext';
import { UserSettingsProvider, useUserSettings } from './UserSettingsContext';
import DisplayCurrencyControl from '../components/common/DisplayCurrencyControl';
import type { UserSettings } from '../types';

const { mockUseAuth, mockGetOrCreate, mockUpdate } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGetOrCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('./AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../services/userSettingsService', () => ({
  userSettingsService: {
    getOrCreate: mockGetOrCreate,
    update: mockUpdate,
  },
}));

const makeSettings = (userId: string, displayCurrency: UserSettings['displayCurrency']): UserSettings => ({
  id: userId,
  userId,
  billingCycleDay: 1,
  displayCurrency,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

const TestConsumers: React.FC = () => {
  const { displayCurrency, displayCurrencyReady, setDisplayCurrency } = useUserSettings();
  return (
    <>
      <DisplayCurrencyControl
        value={displayCurrency}
        onChange={(currency) => { void setDisplayCurrency(currency).catch(() => undefined); }}
        disabled={!displayCurrencyReady}
      />
      <output data-testid="profile-currency">{displayCurrency}</output>
    </>
  );
};

const renderSettings = () => render(
  <LanguageProvider>
    <UserSettingsProvider>
      <TestConsumers />
    </UserSettingsProvider>
  </LanguageProvider>
);

describe('UserSettingsContext display currency', () => {
  beforeEach(async () => {
    sessionCache.clearAll(); await offlineQueue.clear();
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-1' } });
    mockGetOrCreate.mockResolvedValue(makeSettings('user-1', 'MYR'));
    mockUpdate.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps the header selector and profile preference in sync and persists the choice', async () => {
    renderSettings();

    const selector = await screen.findByRole('button', { name: /display currency/i });
    await waitFor(() => expect(selector).toBeEnabled());
    fireEvent.click(selector);
    fireEvent.click(await screen.findByRole('option', { name: /twd/i }));

    await waitFor(() => expect(screen.getByTestId('profile-currency')).toHaveTextContent('TWD'));
    await waitFor(() => expect(offlineQueue.getAll()).toEqual([expect.objectContaining({ entity: 'userSettings', payload: { userId: 'user-1', updates: { displayCurrency: 'TWD' } } })]));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rolls the selected currency back when saving fails', async () => {
    vi.spyOn(offlineQueue, 'enqueueMany').mockResolvedValueOnce(null);
    renderSettings();

    const selector = await screen.findByRole('button', { name: /display currency/i });
    await waitFor(() => expect(selector).toBeEnabled());
    fireEvent.click(selector);
    fireEvent.click(await screen.findByRole('option', { name: /usd/i }));

    await waitFor(() => expect(screen.getByTestId('profile-currency')).toHaveTextContent('MYR'));
  });

  it('ignores a late settings response from the previous account', async () => {
    let resolveFirstUser: ((settings: UserSettings) => void) | undefined;
    mockGetOrCreate.mockImplementation((userId: string) => userId === 'user-1'
      ? new Promise<UserSettings>((resolve) => { resolveFirstUser = resolve; })
      : Promise.resolve(makeSettings('user-2', 'TWD')));

    const view = renderSettings();
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-2' } });
    view.rerender(
      <LanguageProvider>
        <UserSettingsProvider>
          <TestConsumers />
        </UserSettingsProvider>
      </LanguageProvider>
    );

    await waitFor(() => expect(screen.getByTestId('profile-currency')).toHaveTextContent('TWD'));
    resolveFirstUser?.(makeSettings('user-1', 'USD'));
    await waitFor(() => expect(screen.getByTestId('profile-currency')).toHaveTextContent('TWD'));
  });

  it('keeps an accepted local setting when an older initial server read returns later', async () => {
    let resolveInitialRead: ((settings: UserSettings) => void) | undefined;
    mockGetOrCreate.mockImplementation(() => new Promise<UserSettings>((resolve) => { resolveInitialRead = resolve; }));
    sessionCache.set('userSettings', 'user-1', makeSettings('user-1', 'MYR'));
    renderSettings();
    await waitFor(() => expect(resolveInitialRead).toBeTypeOf('function'));

    await act(async () => {
      await writeLocalFirst({ type: 'update', entity: 'userSettings', payload: {
        userId: 'user-1', updates: { displayCurrency: 'TWD' },
      } }, vi.fn()).catch(() => undefined);
    });
    await waitFor(() => expect(screen.getByTestId('profile-currency')).toHaveTextContent('TWD'));

    await act(async () => { resolveInitialRead?.(makeSettings('user-1', 'MYR')); });
    await waitFor(() => expect(screen.getByTestId('profile-currency')).toHaveTextContent('TWD'));
  });
});
