import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNotification, NotificationHistoryItem } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

const getIcon = (type: NotificationHistoryItem['type']) => {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✕';
    case 'info': return 'ℹ';
    default: return '•';
  }
};

const getTypeColor = (type: NotificationHistoryItem['type']): string => {
  switch (type) {
    case 'success': return 'var(--success-text)';
    case 'error': return 'var(--error-text)';
    case 'info': return 'var(--info-text)';
    default: return 'var(--text-secondary)';
  }
};

const getTypeBg = (type: NotificationHistoryItem['type']): string => {
  switch (type) {
    case 'success': return 'var(--success-bg)';
    case 'error': return 'var(--error-bg)';
    case 'info': return 'var(--info-bg)';
    default: return 'var(--bg-secondary)';
  }
};

const NotificationBell: React.FC = () => {
  const { notificationHistory, unreadCount, markAllRead, clearHistory } = useNotification();
  const { t } = useLanguage();

  const formatRelativeTime = (date: Date): string => {
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return t('timeSecondsAgo').replace('{n}', String(seconds));
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('timeMinutesAgo').replace('{n}', String(minutes));
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('timeHoursAgo').replace('{n}', String(hours));
    const days = Math.floor(hours / 24);
    return t('timeDaysAgo').replace('{n}', String(days));
  };
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const updatePanelPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelWidth = 320;
    const viewportWidth = window.innerWidth;
    let left = rect.right - panelWidth;
    if (left < 8) left = 8;
    if (left + panelWidth > viewportWidth - 8) left = viewportWidth - panelWidth - 8;
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width: panelWidth,
      zIndex: 99999,
    });
  }, []);

  useEffect(() => {
    if (open) {
      updatePanelPosition();
      markAllRead();
    }
  }, [open, updatePanelPosition, markAllRead]);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const panel = open ? ReactDOM.createPortal(
    <div
      ref={panelRef}
      style={{
        ...panelStyle,
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '480px',
      }}
      role="dialog"
      aria-label={t('notifications')}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
          {t('notifications')}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {notificationHistory.length > 0 && (
            <>
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {t('markAllRead')}
              </button>
              <button
                onClick={() => { clearHistory(); setOpen(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {t('clearAll')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notificationHistory.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '14px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
            {t('noNotifications')}
          </div>
        ) : (
          notificationHistory.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '10px',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: item.read ? 'transparent' : 'var(--accent-light, var(--bg-secondary))',
                transition: 'background-color 0.2s',
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: getTypeBg(item.type),
                color: getTypeColor(item.type),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                flexShrink: 0,
                marginTop: '2px',
              }}>
                {getIcon(item.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                }}>
                  {item.message}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  marginTop: '4px',
                }}>
                  {formatRelativeTime(item.timestamp)}
                </div>
              </div>
              {!item.read && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)',
                  flexShrink: 0,
                  marginTop: '6px',
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="header-menu-btn"
        aria-label={t('notifications')}
        aria-expanded={open}
        style={{ position: 'relative' }}
      >
        {/* Bell icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className="header-badge"
            aria-label={t('unreadNotifications').replace('{count}', String(unreadCount))}
            title={t('unreadNotifications').replace('{count}', String(unreadCount))}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: '16px',
              height: '16px',
              fontSize: '10px',
              backgroundColor: 'var(--error-text)',
              color: '#ffffff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </>
  );
};

export default NotificationBell;
