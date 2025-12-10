import React, { useEffect } from 'react';
import { usePWA } from '../contexts/PWAContext';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, triggerInstall, dismissPrompt, showFloatingPrompt, deferredPrompt } = usePWA();

  useEffect(() => {
    const reason = !showFloatingPrompt ? 'showFloatingPrompt is false' : 
                   !isInstallable ? 'isInstallable is false' : 
                   'unknown';
    console.log('PWAInstallPrompt render state:', {
      showFloatingPrompt,
      isInstallable,
      hasDeferredPrompt: !!deferredPrompt,
      shouldShow: showFloatingPrompt && isInstallable,
      notRenderReason: showFloatingPrompt && isInstallable ? 'N/A' : reason,
    });
  }, [showFloatingPrompt, isInstallable, deferredPrompt]);

  if (!showFloatingPrompt || !isInstallable) {
    console.log('PWAInstallPrompt: Not rendering - showFloatingPrompt:', showFloatingPrompt, 'isInstallable:', isInstallable);
    return null;
  }

  console.log('PWAInstallPrompt: Rendering floating prompt');

  const isDesktop = !/Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  const isGitHubPages = window.location.hostname.includes('github.io');
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|Edg/.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  const handleInstallClick = async () => {
    console.log('PWAInstallPrompt: Install button clicked', {
      deferredPrompt: !!deferredPrompt,
      isSafari,
      isIOS,
    });
    
    // If we have a real deferredPrompt, use it immediately
    if (deferredPrompt) {
      console.log('✓ Using captured beforeinstallprompt event');
      try {
        const success = await triggerInstall();
        console.log('PWAInstallPrompt: Install result:', success);
        if (success) {
          dismissPrompt();
          alert('✅ App installed successfully!');
        }
      } catch (error) {
        console.error('PWAInstallPrompt: Install error:', error);
        alert('❌ Installation failed. Please try again.');
      }
      return;
    }
    
    // iOS Safari: Show "Add to Home Screen" instructions
    if (isIOS && isSafari) {
      const instructions = `
📱 Install Expense Manager - iOS Safari

1. Tap the Share button (⬆️ bottom bar)
2. Scroll and tap "Add to Home Screen"
3. Tap "Add"

The app will appear on your home screen!
      `.trim();
      alert(instructions);
      dismissPrompt();
      return;
    }
    
    // Other iOS browsers
    if (isIOS && !isSafari) {
      const instructions = `
📱 Best: Use Safari!

Chrome/Firefox on iOS don't support installation.
Use Safari instead:
1. Tap Share (⬆️)
2. Tap "Add to Home Screen"
3. Tap "Add"
      `.trim();
      alert(instructions);
      dismissPrompt();
      return;
    }

    // Desktop Safari
    if (isDesktop && isSafari) {
      const instructions = `
⚠️ Safari on macOS has limited PWA support.

Try Chrome or Edge instead:
1. Click ⊕ in address bar
2. Select "Install Expense Manager"
      `.trim();
      alert(instructions);
      dismissPrompt();
      return;
    }

    // Desktop Chrome/Edge
    if (isDesktop && !isSafari && isGitHubPages) {
      const instructions = `
📱 Install Expense Manager - Desktop

Chrome/Edge on Windows:
1. Click ⊕ in address bar
2. Select "Install Expense Manager"

Chrome/Edge on Mac:
1. Click menu (⋮)
2. Select "Install app"
      `.trim();
      alert(instructions);
      dismissPrompt();
      return;
    }
    
    // Android and other mobile
    if (!isDesktop && !isIOS) {
      const instructions = `
📱 Install Expense Manager

1. Open menu (⋯)
2. Tap "Install app"
3. Confirm

Or tap address bar and select "Install"
      `.trim();
      alert(instructions);
      dismissPrompt();
      return;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      right: '16px',
      maxWidth: '400px',
      zIndex: 9999,
      marginLeft: 'auto',
      marginRight: 0,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '24px' }}>💰</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 4px 0',
            }}>
              Install Expense Manager
            </h3>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0 0 12px 0',
              lineHeight: '1.5',
            }}>
              Install this app on your device for quick and easy access when you're on the go.
            </p>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              <button
                onClick={handleInstallClick}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#16a34a';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#22c55e';
                }}
              >
                Install
              </button>
              <button
                onClick={dismissPrompt}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
                }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
