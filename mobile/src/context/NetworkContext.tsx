import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isConnected: boolean;
  lastOnlineAt: Date | null;
  hasCheckedConnection: boolean;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
  syncError: string | null;
  syncData: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());
  const [hasCheckedConnection, setHasCheckedConnection] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Initial connection check and subscription
  useEffect(() => {
    // Check connection status immediately
    const checkConnection = async () => {
      try {
        const state = await NetInfo.fetch();
        handleConnectionChange(state);
        setHasCheckedConnection(true);
      } catch (error) {
        console.error('Failed to check connection:', error);
        setIsConnected(false);
        setHasCheckedConnection(true);
      }
    };

    checkConnection();

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(handleConnectionChange);

    return () => {
      unsubscribe();
    };
  }, []);

  // Update connection status and last online timestamp
  const handleConnectionChange = (state: NetInfoState) => {
    const connected = state.isConnected ?? false;
    setIsConnected(connected);
    
    if (connected) {
      setLastOnlineAt(new Date());
    }
  };

  // Function to sync data with server when connection is restored
  const syncData = async () => {
    if (!isConnected) {
      setSyncError('No internet connection available');
      return;
    }

    try {
      setSyncStatus('syncing');
      setSyncError(null);

      // Here you would implement the logic to sync local data with server
      // Fetch updated data from server
      // Send any pending local changes to server
      
      // For demonstration, we'll just wait a second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSyncStatus('completed');
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Unknown error occurred during sync');
    }
  };

  const value = {
    isConnected,
    lastOnlineAt,
    hasCheckedConnection,
    syncStatus,
    syncError,
    syncData
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};