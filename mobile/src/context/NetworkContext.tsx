import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

interface NetworkContextType {
  isConnected: boolean;
  lastOnlineAt: Date | null;
  hasCheckedConnection: boolean;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
  syncError: string | null;
  syncData: () => Promise<void>;
}

const initialState: NetworkContextType = {
  isConnected: false,
  lastOnlineAt: null,
  hasCheckedConnection: false,
  syncStatus: 'idle',
  syncError: null,
  syncData: async () => {},
};

const NetworkContext = createContext<NetworkContextType>(initialState);

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [hasCheckedConnection, setHasCheckedConnection] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { teachersTable, schedulesTable, absencesTable } = useDatabase();

  // Initialize connection status and set up listeners
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(handleConnectionChange);
    
    // Initial connection check
    NetInfo.fetch().then(state => {
      handleConnectionChange(state);
      setHasCheckedConnection(true);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Update connection status when it changes
  const handleConnectionChange = (state: NetInfoState) => {
    setIsConnected(state.isConnected ?? false);
    
    if (state.isConnected) {
      setLastOnlineAt(new Date());
    }
  };

  // Sync data with the server when connected
  const syncData = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Please connect to the internet to sync data.');
      return;
    }
    
    if (!user) {
      Alert.alert('Not Logged In', 'Please log in to sync data.');
      return;
    }
    
    try {
      setSyncStatus('syncing');
      setSyncError(null);
      
      // Simulate API calls for syncing data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Retrieve local data
      const teachers = await teachersTable.getAll();
      const schedules = await schedulesTable.getAll();
      const absences = await absencesTable.getAll();
      
      // In a real app, this would send data to the server
      console.log('Syncing data...', { 
        teachersCount: teachers.length,
        schedulesCount: schedules.length,
        absencesCount: absences.length 
      });
      
      // Update last synced time
      setLastOnlineAt(new Date());
      setSyncStatus('completed');
      
      Alert.alert('Sync Complete', 'All data has been synchronized with the server.');
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncError('Failed to sync data. Please try again later.');
      Alert.alert('Sync Error', 'An error occurred while syncing data. Please try again.');
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