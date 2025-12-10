import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePWA } from '../contexts/PWAContext';

const PWAInstallButton: React.FC = () => {
  const { t } = useLanguage();
  const { isInstallable, isInstalled, triggerInstall, deferredPrompt } = usePWA();

  // In development (localhost), create a fake installable state for testing
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isGitHubPages = window.location.hostname.includes('github.io');
  const canShowButton = isInstallable || isDevelopment;

  const handleInstallClick = async () => {
    console.log('PWAInstallButton: Install button clicked, deferredPrompt:', deferredPrompt);
    
    // If no deferredPrompt but on GitHub Pages (mobile), show instructions
    if (!deferredPrompt && isGitHubPages) {
      const browserInfo = /Android/.test(navigator.userAgent) 
        ? 'Open Chrome/Edge menu (⋮) and select "Install app"'
        : 'Open the menu and look for "Install app" option';
      
      alert(
        'PWA Installation\n\n' +
        browserInfo + '\n\n' +
        'Or: Tap the browser address bar and select "Install"'
      );
      return;
    }
    
    // In development, show a test dialog
    if (isDevelopment && !deferredPrompt) {
      const confirmed = window.confirm(
        'Development Mode: PWA installation would be triggered here in a real app.\n\n' +
        'In production (HTTPS/Firebase Hosting), the browser will show the native install prompt.\n\n' +
        'Simulate install?'
      );
      if (confirmed) {
        console.log('PWAInstallButton: Development mode - simulating install');
        return;
      }
      return;
    }
    
    try {
      const success = await triggerInstall();
      console.log('PWAInstallButton: Install result:', success);
    } catch (error) {
      console.error('PWAInstallButton: Install error:', error);
    }
  };

  if (isInstalled) {
    return (
      <div className="pwa-install-section">
        <div className="pwa-status installed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>{t('pwaInstalled')}</span>
        </div>
        <style>{`
          .pwa-install-section {
            padding: 12px;
          }
          .pwa-status.installed {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: var(--success-bg, rgba(34, 197, 94, 0.1));
            color: var(--success-text, #22c55e);
            border-radius: 6px;
            font-size: 14px;
          }
          .pwa-status.installed svg {
            flex-shrink: 0;
          }
        `}</style>
      </div>
    );
  }

  if (!canShowButton) {
    return (
      <div className="pwa-install-section">
        <p className="pwa-not-available">{t('pwaNotAvailable')}</p>
        <style>{`
          .pwa-install-section {
            padding: 12px;
          }
          .pwa-not-available {
            font-size: 13px;
            color: var(--text-secondary, #6b7280);
            text-align: center;
            padding: 12px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pwa-install-section">
      <p className="pwa-description">{t('pwaInstallDescription')}</p>
      <button onClick={handleInstallClick} className="pwa-install-button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {t('pwaInstallButton')}
      </button>
      <style>{`
        .pwa-install-section {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pwa-description {
          font-size: 13px;
          color: var(--text-secondary, #6b7280);
          line-height: 1.5;
        }
        .pwa-install-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pwa-install-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .pwa-install-button:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default PWAInstallButton;
