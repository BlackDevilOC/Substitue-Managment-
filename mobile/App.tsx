import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';

// Import application components and contexts
import { theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';

// Create a client for React Query
const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <AuthProvider>
              <NetworkProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </NetworkProvider>
            </AuthProvider>
          </DatabaseProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}