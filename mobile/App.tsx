
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from 'react-query';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import TeachersScreen from './src/screens/TeachersScreen';
import TeacherDetailScreen from './src/screens/TeacherDetailScreen';
import AbsencesScreen from './src/screens/AbsencesScreen';
import ManageAbsencesScreen from './src/screens/ManageAbsencesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SubstituteAssignmentScreen from './src/screens/SubstituteAssignmentScreen';
import DataImportScreen from './src/screens/DataImportScreen';

// Import contexts
import { AuthProvider } from './src/context/AuthContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { ThemeProvider } from './src/context/ThemeContext';

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();
const TeacherStack = createStackNavigator();
const AbsenceStack = createStackNavigator();

// Create query client for React Query
const queryClient = new QueryClient();

// Teacher stack navigator
const TeacherStackNavigator = () => (
  <TeacherStack.Navigator>
    <TeacherStack.Screen 
      name="TeachersList" 
      component={TeachersScreen} 
      options={{ title: 'Teachers' }}
    />
    <TeacherStack.Screen 
      name="TeacherDetail" 
      component={TeacherDetailScreen} 
      options={({ route }) => ({ title: route.params?.teacherName || 'Teacher Details' })}
    />
  </TeacherStack.Navigator>
);

// Absence stack navigator
const AbsenceStackNavigator = () => (
  <AbsenceStack.Navigator>
    <AbsenceStack.Screen 
      name="AbsencesList" 
      component={AbsencesScreen} 
      options={{ title: 'Absences' }}
    />
    <AbsenceStack.Screen 
      name="ManageAbsences" 
      component={ManageAbsencesScreen} 
      options={{ title: 'Manage Absences' }}
    />
    <AbsenceStack.Screen 
      name="SubstituteAssignment" 
      component={SubstituteAssignmentScreen} 
      options={{ title: 'Assign Substitutes' }}
    />
  </AbsenceStack.Navigator>
);

// Main tab navigator (after authentication)
const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        // You can use react-native-vector-icons here
        let iconName;
        if (route.name === 'Home') {
          iconName = 'home';
        } else if (route.name === 'Teachers') {
          iconName = 'account-multiple';
        } else if (route.name === 'Absences') {
          iconName = 'calendar-check';
        } else if (route.name === 'Settings') {
          iconName = 'cog';
        }
        // You would have to import and use the appropriate icon library
        // For now we'll return a placeholder text
        return <Text style={{ color }}>●</Text>;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Teachers" component={TeacherStackNavigator} options={{ headerShown: false }} />
    <Tab.Screen name="Absences" component={AbsenceStackNavigator} options={{ headerShown: false }} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

// Auth stack navigator (before authentication)
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

// Root stack navigator
const RootNavigator = () => {
  // This would come from the AuthContext in a real app
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    // Simulate authentication check
    setTimeout(() => {
      setIsLoading(false);
      // For now, go directly to the main app
      setIsAuthenticated(true);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8A4FFF" />
        <Text style={styles.loadingText}>Loading Schedulizer...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen name="DataImport" component={DataImportScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
            <NetworkProvider>
              <DatabaseProvider>
                <AuthProvider>
                  <NavigationContainer>
                    <RootNavigator />
                    <StatusBar style="auto" />
                  </NavigationContainer>
                </AuthProvider>
              </DatabaseProvider>
            </NetworkProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});
