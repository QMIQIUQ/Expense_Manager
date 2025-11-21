/**
 * useNetworkStatus Hook
 * React hook for monitoring network connectivity status
 */

import { useState, useEffect } from 'react';
import { networkStatus } from '../utils/networkStatus';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(networkStatus.isOnline);

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = networkStatus.subscribe((online) => {
      setIsOnline(online);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, []);

  return isOnline;
};
