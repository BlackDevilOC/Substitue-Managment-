import React, { createContext, useState, useContext, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { useDatabase } from './DatabaseContext';

interface NetworkContextType {
  isConnected: boolean;
  lastOnlineAt: Date | null;
  hasCheckedConnection: boolean;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
  syncError: string | null;
  syncData: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [hasCheckedConnection, setHasCheckedConnection] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Get database context (warning: circular dependency if not handled properly)
  const database = useDatabase();

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(handleConnectionChange);
    
    // Initial connection check
    checkConnection();
    
    return () => {
      unsubscribe();
    };
  }, []);

  const checkConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      handleConnectionChange(state);
      setHasCheckedConnection(true);
    } catch (error) {
      console.error('Failed to check network connection:', error);
      setIsConnected(false);
      setHasCheckedConnection(true);
    }
  };

  const handleConnectionChange = (state: NetInfoState) => {
    const connected = state.isConnected === true && state.isInternetReachable !== false;
    
    // Update connection state
    setIsConnected(connected);
    
    // Update last online timestamp if connected
    if (connected) {
      setLastOnlineAt(new Date());
    }
    
    // Auto-sync data if connected
    if (connected && !isConnected) {
      // Consider auto-syncing here if needed
      console.log('Connection restored, auto-sync available');
    }
  };

  const syncData = async () => {
    if (!isConnected) {
      Alert.alert('No Connection', 'Cannot sync while offline. Please check your connection and try again.');
      return;
    }
    
    try {
      setSyncStatus('syncing');
      setSyncError(null);
      
      // This is where we would sync data with the server
      // For now, we'll simulate a sync operation with a timeout
      
      console.log('Starting data sync...');
      
      // Sync would include these steps in a real implementation:
      // 1. Push local changes to server
      // 2. Pull server changes to local
      // 3. Resolve conflicts
      // 4. Update local database
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Data sync completed successfully');
      setSyncStatus('completed');
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncError('Failed to synchronize data with server');
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        lastOnlineAt,
        hasCheckedConnection,
        syncStatus,
        syncError,
        syncData,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export default NetworkContext;