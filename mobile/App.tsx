import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';

// Import theme and navigation
import { theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';

// Create query client for API requests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <NetworkProvider>
              <AuthProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </AuthProvider>
            </NetworkProvider>
          </DatabaseProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}