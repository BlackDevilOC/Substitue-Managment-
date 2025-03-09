import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

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
import { useTheme } from 'react-native-paper';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigation that will be displayed when logged in
const TabNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Teachers') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Absences') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Teachers" component={TeachersScreen} />
      <Tab.Screen name="Absences" component={AbsencesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Stack navigator for teachers
const TeachersNavigator = () => {
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
      <Stack.Screen name="TeacherList" component={TeachersScreen} options={{ title: 'Teachers' }} />
      <Stack.Screen name="TeacherDetail" component={TeacherDetailScreen} options={{ title: 'Teacher Details' }} />
    </Stack.Navigator>
  );
};

// Stack navigator for absences
const AbsencesNavigator = () => {
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
      <Stack.Screen name="AbsencesList" component={AbsencesScreen} options={{ title: 'Absences' }} />
      <Stack.Screen name="ManageAbsences" component={ManageAbsencesScreen} options={{ title: 'Manage Absences' }} />
      <Stack.Screen name="SubstituteAssignment" component={SubstituteAssignmentScreen} options={{ title: 'Assign Substitutes' }} />
    </Stack.Navigator>
  );
};

// Main app navigator
const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    // You could display a splash screen here
    return null;
  }

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
        // User is logged in
        <>
          <Stack.Screen 
            name="TabNavigator" 
            component={TabNavigator} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="TeacherDetail" 
            component={TeacherDetailScreen} 
            options={{ title: 'Teacher Details' }}
          />
          <Stack.Screen 
            name="ManageAbsences" 
            component={ManageAbsencesScreen} 
            options={{ title: 'Manage Absences' }}
          />
          <Stack.Screen 
            name="SubstituteAssignment" 
            component={SubstituteAssignmentScreen} 
            options={{ title: 'Assign Substitutes' }}
          />
          <Stack.Screen 
            name="DataImport" 
            component={DataImportScreen} 
            options={{ title: 'Import Data' }}
          />
        </>
      ) : (
        // User is not logged in
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;