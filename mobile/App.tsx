import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';

// App context and navigation
import { theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';

// Create a client for data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      cacheTime: 300000, // 5 minutes
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <DatabaseProvider>
            <AuthProvider>
              <NetworkProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </NetworkProvider>
            </AuthProvider>
          </DatabaseProvider>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}