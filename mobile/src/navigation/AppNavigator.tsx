import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TeachersScreen from '../screens/TeachersScreen';
import AbsencesScreen from '../screens/AbsencesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TeacherDetailScreen from '../screens/TeacherDetailScreen';
import ManageAbsencesScreen from '../screens/ManageAbsencesScreen';
import SubstituteAssignmentScreen from '../screens/SubstituteAssignmentScreen';
import DataImportScreen from '../screens/DataImportScreen';
import { Badge } from 'react-native-paper';

// Define navigator types
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator for authenticated users
function MainTabNavigator() {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#777',
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Teachers"
        component={TeachersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Absences"
        component={AbsencesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-remove" color={color} size={size} />
          ),
          tabBarBadge: 3, // In a real app, this would be dynamic based on unhandled absences
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main app navigator
function AppNavigator() {
  const { user } = useAuth();
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {user ? (
        // Authenticated user flows
        <>
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="TeacherDetail" 
            component={TeacherDetailScreen}
            options={({ route }: any) => ({ 
              title: route.params?.teacherName || 'Teacher Details',
            })}
          />
          <Stack.Screen 
            name="ManageAbsences" 
            component={ManageAbsencesScreen}
            options={{ title: 'Mark Absences' }}
          />
          <Stack.Screen 
            name="SubstituteAssignment" 
            component={SubstituteAssignmentScreen}
            options={{ title: 'Assign Substitutes' }}
          />
          <Stack.Screen 
            name="DataImport" 
            component={DataImportScreen}
            options={{ title: 'Import & Export Data' }}
          />
        </>
      ) : (
        // Unauthenticated user flows
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

export default AppNavigator;