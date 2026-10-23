import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './HeaderStatusBar.css';

interface ImportProgress {
  id: string;
  current: number;
  total: number;
  message: string;
  status: 'importing' | 'complete' | 'error';
}

interface DeleteProgress {
  id: string;
  current: number;
  total: number;
  message: string;
  status: 'deleting' | 'complete' | 'error';
}

const getStatusTone = (status: ImportProgress['status'] | DeleteProgress['status']) => {
  switch (status) {
    case 'complete':
      return 'success';
    case 'error':
      return 'error';
    case 'deleting':
      return 'warning';
    default:
      return 'accent';
  }
};

interface HeaderStatusBarProps {
  importProgress?: ImportProgress;
  deleteProgress?: DeleteProgress;
  onDismissImport?: () => void;
  onDismissDelete?: () => void;
  isRevalidating?: boolean;
}

const HeaderStatusBar: React.FC<HeaderStatusBarProps> = ({
  importProgress,
  deleteProgress,
  onDismissImport,
  onDismissDelete,
  isRevalidating,
}) => {
  const { t } = useLanguage();
  const hasStatus = Boolean(importProgress || deleteProgress || isRevalidating);
  const [expanded, setExpanded] = useState(false);

  if (!hasStatus) {
    return null;
  }

  const hasError = importProgress?.status === 'error' || deleteProgress?.status === 'error';
  const isDeleting = deleteProgress?.status === 'deleting';
  const isWorking = importProgress?.status === 'importing' || isDeleting || isRevalidating;
  const tone = hasError ? 'error' : isDeleting ? 'warning' : importProgress?.status === 'complete' || deleteProgress?.status === 'complete' ? 'success' : 'accent';
  const icon = hasError ? '!' : isWorking ? '⟳' : '✓';
  const statusMessages = [
    importProgress && `${importProgress.status === 'importing' ? t('importing') : importProgress.status === 'complete' ? t('importComplete') : t('importFailed')}${importProgress.message ? `: ${importProgress.message}` : ''}`,
    deleteProgress && `${deleteProgress.status === 'deleting' ? t('deleteSelected') : deleteProgress.status === 'complete' ? t('success') : t('error')}${deleteProgress.message ? `: ${deleteProgress.message}` : ''}`,
    isRevalidating && t('updatingData'),
  ].filter(Boolean).join(' · ');
  const statusCount = Number(Boolean(importProgress)) + Number(Boolean(deleteProgress)) + Number(Boolean(isRevalidating));

  return (
    <div
      className="header-status-floating-container"
    >
      <button
        type="button"
        className="header-status-toggle"
        data-tone={tone}
        aria-label={statusMessages}
        aria-expanded={expanded}
        aria-controls="header-status-details"
        title={statusMessages}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={isWorking ? 'header-status-toggle-icon header-status-toggle-icon-active' : 'header-status-toggle-icon'} aria-hidden="true">{icon}</span>
        {statusCount > 1 && <span className="header-status-count" aria-hidden="true">{statusCount}</span>}
      </button>
      <span className="header-status-sr-only" role="status" aria-live="polite">{statusMessages}</span>
      {expanded && (
        <div id="header-status-details" className="header-status-panel" role="group" aria-label={statusMessages}>
      {importProgress && (
        <div
          className="header-status-floating-item"
          data-tone={getStatusTone(importProgress.status)}
        >
          <div className="header-status-row">
            <div className="header-status-left">
              {importProgress.status === 'importing' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="loading-status-icon" aria-hidden="true">⟳</span>
                </span>
              )}
              {importProgress.status === 'complete' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="header-status-glyph">✓</span>
                </span>
              )}
              {importProgress.status === 'error' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="header-status-glyph">✕</span>
                </span>
              )}
              <span className="header-status-title">
                {importProgress.status === 'importing' && t('importing')}
                {importProgress.status === 'complete' && t('importComplete')}
                {importProgress.status === 'error' && t('importFailed')}
              </span>
              <span className="header-status-message">{importProgress.message}</span>
            </div>
            {(importProgress.status === 'complete' || importProgress.status === 'error') &&
              onDismissImport && (
                <button onClick={onDismissImport} className="header-status-close" aria-label="Dismiss">
                  ✕
                </button>
              )}
          </div>

          {importProgress.status === 'importing' && (
            <div className="header-status-progress-bar">
              <div
                className="header-status-progress-fill"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 刪除進度 */}
      {deleteProgress && (
        <div
          className="header-status-floating-item"
          data-tone={getStatusTone(deleteProgress.status)}
        >
          <div className="header-status-row">
            <div className="header-status-left">
              {deleteProgress.status === 'deleting' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="loading-status-icon" aria-hidden="true">⟳</span>
                </span>
              )}
              {deleteProgress.status === 'complete' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="header-status-glyph">✓</span>
                </span>
              )}
              {deleteProgress.status === 'error' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="header-status-glyph">✕</span>
                </span>
              )}
              <span className="header-status-title">
                {deleteProgress.status === 'deleting' && t('deleteSelected')}
                {deleteProgress.status === 'complete' && t('success')}
                {deleteProgress.status === 'error' && t('error')}
              </span>
              <span className="header-status-message">{deleteProgress.message}</span>
            </div>
            {(deleteProgress.status === 'complete' || deleteProgress.status === 'error') &&
              onDismissDelete && (
                <button onClick={onDismissDelete} className="header-status-close" aria-label="Dismiss">
                  ✕
                </button>
              )}
          </div>

          {deleteProgress.status === 'deleting' && (
            <div className="header-status-progress-bar">
              <div
                className="header-status-progress-fill"
                style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 背景更新指示器 */}
      {isRevalidating && (
        <div
          className="header-status-floating-item"
          data-tone="accent"
        >
          <div className="header-status-row">
            <div className="header-status-left">
              <span className="header-status-icon" aria-hidden="true">
                <span className="loading-status-icon" aria-hidden="true">⟳</span>
              </span>
              <span className="header-status-title">{t('updatingData')}</span>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

export default HeaderStatusBar;
