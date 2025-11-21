import { useState, useEffect } from 'react';
import { networkStatusService } from '../services/networkStatusService';

/**
 * Hook to track network online/offline status
 * @returns boolean indicating if the device is online
 */
export const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(() => networkStatusService.isOnline);

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = networkStatusService.subscribe((online) => {
      setIsOnline(online);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return isOnline;
};
