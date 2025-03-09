import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';

import { theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';

// Create a client for react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NetworkProvider>
          <QueryClientProvider client={queryClient}>
            <DatabaseProvider>
              <AuthProvider>
                <NavigationContainer>
                  <StatusBar style="light" />
                  <AppNavigator />
                </NavigationContainer>
              </AuthProvider>
            </DatabaseProvider>
          </QueryClientProvider>
        </NetworkProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}