import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import TeachersScreen from '../screens/TeachersScreen';
import TeacherDetailScreen from '../screens/TeacherDetailScreen';
import AbsencesScreen from '../screens/AbsencesScreen';
import ManageAbsencesScreen from '../screens/ManageAbsencesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SubstituteAssignmentScreen from '../screens/SubstituteAssignmentScreen';
import DataImportScreen from '../screens/DataImportScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const TeacherStack = createStackNavigator();
const AbsenceStack = createStackNavigator();

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

// Main tab navigator
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Teachers') {
            iconName = 'account-multiple';
          } else if (route.name === 'Absences') {
            iconName = 'calendar-check';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Teachers" component={TeacherStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Absences" component={AbsenceStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Main stack navigator with additional screens
export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen 
        name="DataImport" 
        component={DataImportScreen} 
        options={{ 
          headerShown: true,
          title: 'Import/Export Data'
        }} 
      />
    </Stack.Navigator>
  );
}