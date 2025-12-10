import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { UserSettingsProvider } from './contexts/UserSettingsContext';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA functionality
const updateSW = registerSW({
  onNeedRefresh() {
    // Using native confirm for now as a minimal solution
    // TODO: Replace with custom notification component matching app design
    const shouldUpdate = confirm('🎉 New version available! Would you like to update now?');
    if (shouldUpdate) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('✅ App ready to work offline');
  },
});

// Development helper: Add PWA testing commands to window
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  (window as any).PWADebug = {
    forcePWA: () => {
      localStorage.setItem('pwa-force-show', 'true');
      console.log('✓ PWA forced on! Reload page to see effect');
      window.location.reload();
    },
    disablePWA: () => {
      localStorage.removeItem('pwa-force-show');
      console.log('✓ PWA force disabled! Reload page');
      window.location.reload();
    },
    resetPWA: () => {
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-force-show');
      console.log('✓ PWA state reset! Reload page');
      window.location.reload();
    },
    status: () => {
      console.log({
        'PWA Capable': localStorage.getItem('pwa-force-show') === 'true',
        'Dismissed': localStorage.getItem('pwa-install-dismissed') === 'true',
        'Installed': window.matchMedia('(display-mode: standalone)').matches
      });
    }
  };
  console.log('💡 PWA Debug Commands Available:');
  console.log('  - PWADebug.forcePWA() : Force show PWA prompt for testing');
  console.log('  - PWADebug.disablePWA() : Disable forced PWA');
  console.log('  - PWADebug.resetPWA() : Reset all PWA state');
  console.log('  - PWADebug.status() : Check current PWA status');
}

// Centralize all top-level providers here to guarantee `useLanguage` and others
// are available to every route/component, avoiding hook usage outside provider trees.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <UserSettingsProvider>
              <App />
            </UserSettingsProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
