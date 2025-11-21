/**
 * Network Status Service - Monitors online/offline status
 * Provides hooks for components to react to network changes
 */

type NetworkStatusListener = (isOnline: boolean) => void;

class NetworkStatusService {
  private listeners: Set<NetworkStatusListener> = new Set();
  private _isOnline: boolean = navigator.onLine;
  private hasInitialized: boolean = false;

  constructor() {
    // Don't initialize in constructor to avoid issues during SSR
  }

  /**
   * Initialize the service (call once in app startup)
   */
  initialize(): void {
    if (this.hasInitialized) return;
    
    this._isOnline = navigator.onLine;
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    this.hasInitialized = true;
    console.log('🌐 Network status service initialized. Online:', this._isOnline);
  }

  /**
   * Cleanup (call on app unmount if needed)
   */
  cleanup(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
    this.hasInitialized = false;
  }

  /**
   * Get current online status
   */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('🟢 Network: ONLINE');
    this._isOnline = true;
    this.notifyListeners();
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('🔴 Network: OFFLINE');
    this._isOnline = false;
    this.notifyListeners();
  };

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this._isOnline);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Manually trigger a network check
   * Useful for verifying connectivity beyond the browser's online/offline events
   */
  async checkConnectivity(): Promise<boolean> {
    // Browser says offline? Don't even try
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      // Using a HEAD request to minimize bandwidth
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.warn('Connectivity check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const networkStatusService = new NetworkStatusService();
