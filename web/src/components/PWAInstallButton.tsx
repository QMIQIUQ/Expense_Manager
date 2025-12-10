import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePWA } from '../contexts/PWAContext';

const PWAInstallButton: React.FC = () => {
  const { t } = useLanguage();
  const { isInstallable, isInstalled, triggerInstall, deferredPrompt } = usePWA();

  // In development (localhost), create a fake installable state for testing
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isGitHubPages = window.location.hostname.includes('github.io');
  const isDesktop = !/Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|Edg/.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const canShowButton = isInstallable || isDevelopment;

  const handleInstallClick = async () => {
    console.log('PWAInstallButton: Install button clicked', {
      deferredPrompt: !!deferredPrompt,
      isSafari,
      isIOS,
    });
    
    // If we have a real deferredPrompt, use it immediately
    if (deferredPrompt) {
      console.log('✓ Using captured beforeinstallprompt event');
      try {
        const success = await triggerInstall();
        console.log('PWAInstallButton: Install result:', success);
        if (success) {
          alert('✅ App installed successfully!');
        }
      } catch (error) {
        console.error('PWAInstallButton: Install error:', error);
        alert('❌ Installation failed. Please try again.');
      }
      return;
    }
    
    // iOS Safari: Special instructions for "Add to Home Screen"
    if (isIOS && isSafari) {
      showIOSSafariInstructions();
      return;
    }
    
    // Other iOS browsers (Chrome, Firefox on iOS)
    if (isIOS && !isSafari) {
      showIOSChromeInstructions();
      return;
    }
    
    // Desktop Chrome/Edge: Show instructions for manual installation
    if (isDesktop && isGitHubPages && !isSafari) {
      showDesktopInstallInstructions();
      return;
    }
    
    // Desktop Safari: Limited support
    if (isDesktop && isSafari) {
      showDesktopSafariInstructions();
      return;
    }
    
    // Android and other mobile browsers
    if (!isDesktop && !isIOS) {
      showMobileInstallInstructions();
      return;
    }
    
    // In development, show a test dialog
    if (isDevelopment) {
      const confirmed = window.confirm(
        'Development Mode: PWA installation would be triggered here in a real app.\n\n' +
        'In production (HTTPS), the browser will show the native install prompt.\n\n' +
        'Simulate install?'
      );
      if (confirmed) {
        console.log('PWAInstallButton: Development mode - simulating install');
        return;
      }
      return;
    }
  };

  const showIOSSafariInstructions = () => {
    const instructions = `
📱 Install Expense Manager - iOS Safari

1. Tap the Share button (⬆️ in the bottom bar)
2. Scroll down and tap "Add to Home Screen"
3. Choose a name (or keep "Expense Manager")
4. Tap "Add"

The app will appear on your home screen and work offline!

Tip: Use Safari for the best experience on iOS.
    `.trim();
    
    alert(instructions);
  };

  const showIOSChromeInstructions = () => {
    const instructions = `
📱 Install Expense Manager - iOS (Chrome/Firefox)

Unfortunately, Chrome and Firefox on iOS don't support app installation.

⭐ Best Option: Use Safari!
1. Open this page in Safari
2. Tap Share (⬆️)
3. Tap "Add to Home Screen"
4. Tap "Add"

Safari on iOS supports adding to home screen and offline functionality.
    `.trim();
    
    alert(instructions);
  };

  const showDesktopSafariInstructions = () => {
    const instructions = `
📱 Install Expense Manager - macOS Safari

Unfortunately, Safari on macOS has very limited PWA support.

⭐ Best Option: Use Chrome or Edge instead!

Chrome/Edge on Mac:
1. Click the ⊕ icon in the address bar
2. Select "Install Expense Manager"

Or:
1. Open menu (⋮)
2. Select "Install app"
    `.trim();
    
    alert(instructions);
  };

  const showDesktopInstallInstructions = () => {
    const instructions = `
📱 Install Expense Manager - Desktop Instructions

You can install this app on your desktop:

**Chrome/Edge on Windows:**
1. Click the ⊕ icon in the address bar
2. Select "Install Expense Manager"
3. The app will appear in your Start Menu

**Chrome/Edge on Mac:**
1. Open the menu (⋮)
2. Select "Install app"
3. The app will appear in your Applications

**Alternative Method:**
1. Open the menu (⋮)
2. Select "Create shortcut"
3. Choose where to save it

The app works offline and syncs when online!
    `.trim();
    
    alert(instructions);
  };

  const showMobileInstallInstructions = () => {
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    
    let instructions = '📱 Install Expense Manager\n\n';
    
    if (isChrome) {
      instructions += 'Chrome:\n' +
        '1. Open Chrome menu (⋮)\n' +
        '2. Tap "Install app"\n' +
        '3. Confirm installation\n\n' +
        'Or:\n' +
        '1. Tap the address bar\n' +
        '2. Select "Install"';
    } else if (isFirefox) {
      instructions += 'Firefox:\n' +
        '1. Open menu (⋯)\n' +
        '2. Tap "Install"\n' +
        '3. Confirm';
    } else {
      instructions += 'Your Browser:\n' +
        '1. Look for an "Install" button or option\n' +
        '2. Confirm when prompted\n\n' +
        'The app works offline and syncs when online!';
    }
    
    alert(instructions);
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
