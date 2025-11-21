/**
 * Network Status Indicator Component
 * Displays online/offline status and sync progress
 */

import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStatus } from '../hooks/useSyncStatus';

const NetworkStatusIndicator: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { isSyncing, pendingCount, syncNow } = useSyncStatus();

  if (isOnline && !isSyncing && pendingCount === 0) {
    // Everything is fine, don't show anything
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-sm font-medium">Offline Mode</span>
        </div>
      )}

      {/* Pending Operations */}
      {pendingCount > 0 && isOnline && !isSyncing && (
        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-between space-x-3 mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse"></div>
            <span className="text-sm font-medium">
              {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <button
            onClick={syncNow}
            className="text-xs bg-white text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* Syncing Indicator */}
      {isSyncing && (
        <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 mb-2">
          <div className="w-4 h-4">
            <svg
              className="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <span className="text-sm font-medium">Syncing...</span>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
