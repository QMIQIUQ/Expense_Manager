/**
 * Network Status Utility
 * Monitors online/offline status and provides network connectivity information
 */

type NetworkStatusCallback = (isOnline: boolean) => void;

class NetworkStatusManager {
  private listeners: Set<NetworkStatusCallback> = new Set();
  private _isOnline: boolean = navigator.onLine;

  constructor() {
    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this._isOnline = true;
    this.notifyListeners();
  };

  private handleOffline = () => {
    this._isOnline = false;
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this._isOnline);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
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
  subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Test network connectivity with a ping-like request
   */
  async testConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource with no-cache
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      return true;
    } catch (error) {
      console.warn('Network connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Clean up event listeners (call when app unmounts)
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

// Export singleton instance
export const networkStatus = new NetworkStatusManager();
