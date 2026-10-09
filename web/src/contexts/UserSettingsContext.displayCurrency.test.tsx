import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-1' } });
    mockGetOrCreate.mockResolvedValue(makeSettings('user-1', 'MYR'));
    mockUpdate.mockResolvedValue(undefined);
  });

  it('keeps the header selector and profile preference in sync and persists the choice', async () => {
    renderSettings();

    const selector = await screen.findByRole('button', { name: /display currency/i });
    await waitFor(() => expect(selector).toBeEnabled());
    fireEvent.click(selector);
    fireEvent.click(await screen.findByRole('option', { name: /twd/i }));

    await waitFor(() => expect(screen.getByTestId('profile-currency')).toHaveTextContent('TWD'));
    expect(mockUpdate).toHaveBeenCalledWith('user-1', { displayCurrency: 'TWD' });
  });

  it('rolls the selected currency back when saving fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('save failed'));
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
});
