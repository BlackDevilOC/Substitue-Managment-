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
import { Text } from 'react-native-paper';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  TeacherDetail: { teacherId: number | string };
  ManageAbsences: { date?: string };
  SubstituteAssignment: { date?: string };
  DataImport: undefined;
};

type MainTabParamList = {
  Home: undefined;
  Teachers: undefined;
  Absences: undefined;
  Settings: undefined;
};

// Create navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main tab navigator
function MainTabNavigator() {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#777777',
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12 }}>Home</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Teachers"
        component={TeachersScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12 }}>Teachers</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Absences"
        component={AbsencesScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12 }}>Absences</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-remove" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12 }}>Settings</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root navigator
function AppNavigator() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();
  
  // Show loading or splash screen if loading
  if (isLoading) {
    return null; // In a real app, you'd show a splash screen here
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
        // Authenticated screens
        <>
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="TeacherDetail" 
            component={TeacherDetailScreen} 
            options={({ route }) => ({
              title: route.params.teacherId === 'new' ? 'Add Teacher' : 'Teacher Details',
            })}
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
        // Authentication screens
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