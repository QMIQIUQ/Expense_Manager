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
