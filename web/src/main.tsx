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
// Define this OUTSIDE of ReactDOM.createRoot to ensure it's available immediately
const setupPWADebug = () => {
  if (typeof window === 'undefined') return;
  
  (window as any).PWADebug = {
    forcePWA: () => {
      localStorage.setItem('pwa-force-show', 'true');
      console.log('✓ PWA forced on! Reloading page...');
      setTimeout(() => window.location.reload(), 100);
    },
    disablePWA: () => {
      localStorage.removeItem('pwa-force-show');
      console.log('✓ PWA force disabled! Reloading page...');
      setTimeout(() => window.location.reload(), 100);
    },
    resetPWA: () => {
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-force-show');
      console.log('✓ PWA state reset! Reloading page...');
      setTimeout(() => window.location.reload(), 100);
    },
    status: () => {
      console.table({
        'PWA Force Enabled': localStorage.getItem('pwa-force-show') === 'true',
        'Dismissed': localStorage.getItem('pwa-install-dismissed') === 'true',
        'Installed (Standalone)': window.matchMedia('(display-mode: standalone)').matches,
        'Protocol': window.location.protocol,
        'Hostname': window.location.hostname,
      });
    }
  };
  
  console.log('💡 PWA Debug Commands Ready:');
  console.log('  PWADebug.forcePWA()     - Force show PWA prompt');
  console.log('  PWADebug.disablePWA()   - Disable forced PWA');
  console.log('  PWADebug.resetPWA()     - Reset all PWA state');
  console.log('  PWADebug.status()       - Check current PWA status');
};

// Setup immediately before React renders
setupPWADebug();

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
