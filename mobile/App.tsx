
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ThemeProvider>
        <AuthProvider>
          <DatabaseProvider>
            <PaperProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </PaperProvider>
          </DatabaseProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
