import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { friendSpendingEnabled } from '../../../config/firebase';
import type { TranslationKey } from '../../../locales/translations';
import { friendSpendingService, type FriendMutation } from '../../../services/friendSpendingService';
import type {
  FriendConnection,
  FriendDashboardPreference,
  FriendSpendingSummary,
} from '../../../types/friendSpending';
import { getFriendSpendingDateRange, presentFriendSpending } from '../../../utils/friendSpendingUtils';
import { DEFAULT_BASE_CURRENCY, formatMoney } from '../../../utils/currencyUtils';
import type { CurrencyCode } from '../../../types';
import type { WidgetProps } from './types';

const todayLocal = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const defaultPreference = (): FriendDashboardPreference => ({
  mode: 'total',
  period: 'current-month',
  selectedDate: todayLocal(),
});

const getErrorCode = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return error instanceof Error ? error.message : 'unknown';
};

const FriendSpendingWidget: React.FC<WidgetProps> = ({ displayCurrency }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const featureEnabled = friendSpendingEnabled;
  const [connections, setConnections] = useState<FriendConnection[]>([]);
  const [friendCode, setFriendCode] = useState('');
  const [selectedFriendUid, setSelectedFriendUid] = useState('');
  const [preference, setPreference] = useState<FriendDashboardPreference>(defaultPreference);
  const [preferenceReadyFor, setPreferenceReadyFor] = useState('');
  const [summary, setSummary] = useState<FriendSpendingSummary | null>(null);
  const [presentation, setPresentation] = useState<Awaited<ReturnType<typeof presentFriendSpending>> | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');

  const acceptedFriends = useMemo(
    () => connections.filter((connection) => connection.status === 'accepted'),
    [connections]
  );
  const incomingRequests = useMemo(
    () => connections.filter((connection) => connection.direction === 'incoming' && connection.status === 'pending'),
    [connections]
  );
  const outgoingRequests = useMemo(
    () => connections.filter((connection) => connection.direction === 'outgoing' && connection.status === 'pending'),
    [connections]
  );
  const selectedFriend = acceptedFriends.find((friend) => friend.friendUid === selectedFriendUid);

  const loadConnections = useCallback(async () => {
    if (!currentUser || !featureEnabled) return;
    setIsLoadingConnections(true);
    try {
      const nextConnections = await friendSpendingService.getConnections(currentUser.uid);
      setConnections(nextConnections);
      const nextAccepted = nextConnections.filter((connection) => connection.status === 'accepted');
      if (!nextAccepted.some((connection) => connection.friendUid === selectedFriendUid)) {
        setSelectedFriendUid(nextAccepted[0]?.friendUid || '');
      }
      setError('');
    } catch (loadError) {
      setError(getErrorCode(loadError));
    } finally {
      setIsLoadingConnections(false);
    }
  }, [currentUser, featureEnabled, selectedFriendUid]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (!currentUser || !selectedFriendUid || !featureEnabled) {
      setPreferenceReadyFor('');
      return;
    }
    let cancelled = false;
    setPreferenceReadyFor('');
    friendSpendingService.getPreference(currentUser.uid, selectedFriendUid)
      .then((savedPreference) => {
        if (cancelled) return;
        setPreference(savedPreference);
        setPreferenceReadyFor(selectedFriendUid);
      })
      .catch(() => {
        if (cancelled) return;
        setPreference(defaultPreference());
        setPreferenceReadyFor(selectedFriendUid);
      });
    return () => { cancelled = true; };
  }, [currentUser, featureEnabled, selectedFriendUid]);

  useEffect(() => {
    if (!selectedFriend || !preferenceReadyFor || preferenceReadyFor !== selectedFriendUid) {
      setSummary(null);
      setPresentation(null);
      setIsLoadingSummary(false);
      return;
    }
    if (!selectedFriend.shareEnabledWithMe) {
      setSummary(null);
      setPresentation(null);
      setIsLoadingSummary(false);
      setError('friend_not_sharing');
      return;
    }

    let cancelled = false;
    let presentationVersion = 0;
    const range = getFriendSpendingDateRange(preference.period, preference.selectedDate);
    setIsLoadingSummary(true);
    setError('');
    const unsubscribe = friendSpendingService.listenSpendingSummary(
      { friendUid: selectedFriendUid, ...range },
      async (nextSummary) => {
        if (cancelled) return;
        const currentVersion = ++presentationVersion;
        setSummary(nextSummary);
        const nextPresentation = await presentFriendSpending(
          nextSummary,
          (displayCurrency || DEFAULT_BASE_CURRENCY) as CurrencyCode
        );
        if (!cancelled && currentVersion === presentationVersion) {
          setPresentation(nextPresentation);
          setIsLoadingSummary(false);
        }
      },
      (summaryError) => {
        if (cancelled) return;
        setSummary(null);
        setPresentation(null);
        const code = getErrorCode(summaryError);
        setError(code.includes('permission-denied') ? 'friend_not_sharing' : code);
        setIsLoadingSummary(false);
      }
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [displayCurrency, preference, preferenceReadyFor, selectedFriend, selectedFriendUid]);

  const runMutation = async (input: FriendMutation, successMessage: TranslationKey): Promise<void> => {
    setBusyAction(`${input.action}:${input.friendUid}`);
    try {
      if (!currentUser) return;
      await friendSpendingService.mutateFriendship(currentUser.uid, input);
      await loadConnections();
      showNotification('success', t(successMessage));
    } catch (mutationError) {
      const code = getErrorCode(mutationError);
      await loadConnections();
      const invalidFriendCode = input.action === 'send' &&
        (code.includes('not-found') || code.includes('permission-denied'));
      showNotification('error', invalidFriendCode ? t('friendCodeInvalid') : t('friendRequestFailed'));
    } finally {
      setBusyAction('');
    }
  };

  const handleSendRequest = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedUid = friendCode.trim();
    if (!normalizedUid || normalizedUid === currentUser?.uid) {
      showNotification('error', t('friendCodeInvalid'));
      return;
    }
    setFriendCode('');
    await runMutation({ action: 'send', friendUid: normalizedUid }, 'friendRequestSent');
  };

  const handleCopyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(currentUser?.uid || '');
      showNotification('success', t('friendCodeCopied'));
    } catch {
      showNotification('info', currentUser?.uid || '');
    }
  };

  const handleSavePreference = async (): Promise<void> => {
    if (!currentUser || !selectedFriendUid) return;
    setBusyAction(`save:${selectedFriendUid}`);
    try {
      await friendSpendingService.savePreference(currentUser.uid, selectedFriendUid, preference);
      showNotification('success', t('preferencesSaved'));
    } catch {
      showNotification('error', t('saveFailed'));
    } finally {
      setBusyAction('');
    }
  };

  if (!featureEnabled) {
    return (
      <div className="friend-spending-widget">
        <div className="friend-spending-preview-notice" role="status">
          <span aria-hidden="true">🧪</span>
          <p>{t('friendFeaturePreviewOnly')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friend-spending-widget">
      <section className="friend-code-panel">
        <div>
          <strong>{t('yourFriendCode')}</strong>
          <code title={currentUser?.uid}>{currentUser?.uid}</code>
        </div>
        <button type="button" className="friend-secondary-button" onClick={handleCopyCode}>
          {t('copy')}
        </button>
      </section>

      <form className="friend-add-form" onSubmit={handleSendRequest}>
        <label htmlFor="friend-uid-input">{t('addFriend')}</label>
        <div className="friend-add-controls">
          <input
            id="friend-uid-input"
            value={friendCode}
            onChange={(event) => setFriendCode(event.target.value)}
            placeholder={t('friendUidPlaceholder')}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={!friendCode.trim() || busyAction.startsWith('send:')}>
            {t('sendRequest')}
          </button>
        </div>
      </form>

      {incomingRequests.length > 0 && (
        <section className="friend-list-section">
          <h4>{t('incomingRequests')}</h4>
          {incomingRequests.map((request) => (
            <div className="friend-row" key={request.friendUid}>
              <code>{request.friendUid}</code>
              <div className="friend-row-actions">
                <button
                  type="button"
                  disabled={busyAction.endsWith(request.friendUid)}
                  onClick={() => void runMutation({ action: 'accept', friendUid: request.friendUid }, 'friendRequestAccepted')}
                >{t('accept')}</button>
                <button
                  type="button"
                  className="friend-secondary-button"
                  disabled={busyAction.endsWith(request.friendUid)}
                  onClick={() => void runMutation({ action: 'decline', friendUid: request.friendUid }, 'friendRequestDeclined')}
                >{t('decline')}</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {outgoingRequests.length > 0 && (
        <section className="friend-list-section">
          <h4>{t('outgoingRequests')}</h4>
          {outgoingRequests.map((request) => (
            <div className="friend-row" key={request.friendUid}>
              <code>{request.friendUid}</code>
              <span className="friend-muted-label">{t('pending')}</span>
            </div>
          ))}
        </section>
      )}

      <section className="friend-list-section">
        <h4>{t('yourFriends')}</h4>
        {isLoadingConnections && <p className="friend-muted-label">{t('loading')}</p>}
        {!isLoadingConnections && acceptedFriends.length === 0 && <p className="friend-muted-label">{t('noFriends')}</p>}
        {acceptedFriends.map((friend) => (
          <div className={`friend-card-row ${selectedFriendUid === friend.friendUid ? 'selected' : ''}`} key={friend.friendUid}>
            <button
              type="button"
              className="friend-select-button"
              onClick={() => setSelectedFriendUid(friend.friendUid)}
              aria-pressed={selectedFriendUid === friend.friendUid}
            >
              <code>{friend.friendUid}</code>
              <span>{friend.shareEnabledWithMe ? t('friendSharesWithYou') : t('friendNotSharing')}</span>
            </button>
            <label className="friend-share-toggle">
              <input
                type="checkbox"
                checked={friend.shareEnabledByMe}
                disabled={busyAction === `set-sharing:${friend.friendUid}`}
                onChange={(event) => void runMutation(
                  { action: 'set-sharing', friendUid: friend.friendUid, enabled: event.target.checked },
                  'shareSettingSaved'
                )}
              />
              <span>{t('shareMySpending')}</span>
            </label>
            <button
              type="button"
              className="friend-remove-button"
              disabled={busyAction === `remove:${friend.friendUid}`}
              onClick={() => {
                if (window.confirm(t('removeFriendConfirm'))) {
                  void runMutation({ action: 'remove', friendUid: friend.friendUid }, 'friendRemoved');
                }
              }}
            >{t('removeFriend')}</button>
          </div>
        ))}
      </section>

      {selectedFriend && (
        <section className="friend-spending-details">
          <h4>{t('friendSpendingFor')} <code>{selectedFriend.friendUid}</code></h4>
          <div className="friend-preference-controls">
            <label>
              <span>{t('view')}</span>
              <select
                value={preference.mode}
                onChange={(event) => setPreference((current) => ({
                  ...current,
                  mode: event.target.value as FriendDashboardPreference['mode'],
                }))}
              >
                <option value="total">{t('viewTotal')}</option>
                <option value="categories">{t('viewCategories')}</option>
              </select>
            </label>
            <label>
              <span>{t('timePeriod')}</span>
              <select
                value={preference.period}
                onChange={(event) => setPreference((current) => ({
                  ...current,
                  period: event.target.value as FriendDashboardPreference['period'],
                }))}
              >
                <option value="all">{t('allTime')}</option>
                <option value="rolling-three-months">{t('lastThreeMonths')}</option>
                <option value="current-month">{t('thisMonth')}</option>
                <option value="day">{t('selectedDay')}</option>
              </select>
            </label>
            {preference.period === 'day' && (
              <label>
                <span>{t('chooseDate')}</span>
                <input
                  type="date"
                  value={preference.selectedDate}
                  onChange={(event) => setPreference((current) => ({ ...current, selectedDate: event.target.value }))}
                />
              </label>
            )}
            <button
              type="button"
              disabled={busyAction === `save:${selectedFriendUid}` || preferenceReadyFor !== selectedFriendUid}
              onClick={() => void handleSavePreference()}
            >{t('savePreferences')}</button>
          </div>

          {!selectedFriend.shareEnabledWithMe && <p className="friend-muted-label">{t('friendHasNotShared')}</p>}
          {selectedFriend.shareEnabledWithMe && isLoadingSummary && <p className="friend-muted-label">{t('loading')}</p>}
          {selectedFriend.shareEnabledWithMe && !isLoadingSummary && error && error !== 'friend_not_sharing' && (
            <p className="friend-error-message">{t('friendSpendingLoadFailed')}</p>
          )}
          {selectedFriend.shareEnabledWithMe && !isLoadingSummary && error === 'friend_not_sharing' && (
            <p className="friend-muted-label">{t('friendHasNotShared')}</p>
          )}
          {selectedFriend.shareEnabledWithMe && !isLoadingSummary && summary && presentation && (
            preference.mode === 'total' ? (
              <div className="friend-total-list">
                {presentation.totals.length === 0 && <p className="friend-muted-label">{t('noSpendingData')}</p>}
                {presentation.totals.map((total) => (
                  <div className="friend-total-row" key={total.currency}>
                    <span>{t('totalSpending')} · {total.currency}</span>
                    <strong>{formatMoney(total.amount, total.currency)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="friend-category-list">
                {presentation.categories.length === 0 && <p className="friend-muted-label">{t('noSpendingData')}</p>}
                {presentation.categories.map((category, index) => (
                  <div className="friend-category-row" key={`${category.name}-${category.currency}-${index}`}>
                    <div className="friend-category-heading">
                      <span>{category.name || t('uncategorized')}</span>
                      <strong>{formatMoney(category.amount, category.currency)} · {category.percentage.toFixed(1)}%</strong>
                    </div>
                    <div className="friend-category-meter" aria-hidden="true">
                      <span style={{ width: `${Math.min(100, category.percentage)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </section>
      )}

      {error === 'friend_spending_preview_disabled' && <p className="friend-muted-label">{t('friendFeaturePreviewOnly')}</p>}
    </div>
  );
};

export default FriendSpendingWidget;
