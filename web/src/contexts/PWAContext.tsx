import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return 'prompt' in event && 'userChoice' in event;
}

interface PWAContextType {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isInstalled: boolean;
  triggerInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
  showFloatingPrompt: boolean;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showFloatingPrompt, setShowFloatingPrompt] = useState(() => {
    return localStorage.getItem('pwa-install-dismissed') !== 'true';
  });
  const [isPWACapable, setIsPWACapable] = useState(false);

  useEffect(() => {
    console.log('===== PWAProvider: Initializing =====');
    console.log('User Agent:', navigator.userAgent);
    console.log('Protocol:', window.location.protocol);
    console.log('Hostname:', window.location.hostname);
    
    // Check if browser supports PWA installation prompts
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isPWABrowser = (isChrome || isEdge) && isAndroid;
    
    console.log('Browser Check:', { isChrome, isEdge, isAndroid, isPWABrowser });
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✓ App already installed (standalone mode)');
      setIsInstalled(true);
      return;
    }

    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    console.log('Manifest link found:', !!manifestLink, manifestLink?.getAttribute('href'));
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('Service Workers registered:', registrations.length);
        registrations.forEach(reg => {
          console.log('  - Scope:', reg.scope, 'State:', reg.active ? 'active' : 'inactive');
        });
      }).catch(err => console.error('Error checking service workers:', err));
    } else {
      console.log('✗ Service Workers not supported');
    }

    const handler = (e: Event) => {
      console.log('✓ beforeinstallprompt event fired!', e);
      
      if (!isBeforeInstallPromptEvent(e)) {
        console.log('✗ Event is not BeforeInstallPromptEvent');
        return;
      }
      
      console.log('✓ Valid BeforeInstallPromptEvent - saving prompt');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPWACapable(true);
      
      // Show floating prompt if not dismissed
      if (localStorage.getItem('pwa-install-dismissed') !== 'true') {
        console.log('✓ Showing floating prompt');
        setShowFloatingPrompt(true);
      }
    };

    const installedHandler = () => {
      console.log('✓ appinstalled event fired - PWA installed successfully!');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowFloatingPrompt(false);
    };

    console.log('Adding event listeners for beforeinstallprompt and appinstalled');
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    
    // For browsers that don't support beforeinstallprompt, 
    // still mark as PWA capable if it's HTTPS and has service worker
    if (window.location.protocol === 'https:' && isPWABrowser) {
      console.log('✓ HTTPS detected on PWA-capable browser, marking as PWA capable');
      setIsPWACapable(true);
    } else if (window.location.protocol !== 'https:') {
      console.log('✗ Not HTTPS - PWA requires HTTPS');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    console.log('PWAProvider: triggerInstall called, deferredPrompt:', deferredPrompt);
    
    if (!deferredPrompt) {
      console.log('PWAProvider: No deferredPrompt available');
      return false;
    }

    try {
      console.log('PWAProvider: Calling prompt()');
      await deferredPrompt.prompt();
      
      console.log('PWAProvider: Waiting for userChoice');
      const { outcome } = await deferredPrompt.userChoice;

      console.log(`PWAProvider: Install outcome: ${outcome}`);

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
      setShowFloatingPrompt(false);
      return outcome === 'accepted';
    } catch (error) {
      console.error('PWAProvider: Error during install:', error);
      return false;
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setShowFloatingPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  // Add useEffect to log context state changes
  useEffect(() => {
    const isInstallable = (!!deferredPrompt || isPWACapable) && !isInstalled;
    const finalShowPrompt = showFloatingPrompt && (!!deferredPrompt || isPWACapable) && !isInstalled;
    
    console.log('PWAProvider: Context state updated:', {
      deferredPrompt: !!deferredPrompt,
      isPWACapable,
      isInstalled,
      showFloatingPrompt,
      isInstallable,
      finalShowPrompt,
    });
  }, [deferredPrompt, isInstalled, showFloatingPrompt, isPWACapable]);

  const value: PWAContextType = {
    deferredPrompt,
    isInstallable: (!!deferredPrompt || isPWACapable) && !isInstalled,
    isInstalled,
    triggerInstall,
    dismissPrompt,
    showFloatingPrompt: showFloatingPrompt && (!!deferredPrompt || isPWACapable) && !isInstalled,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
};

export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
