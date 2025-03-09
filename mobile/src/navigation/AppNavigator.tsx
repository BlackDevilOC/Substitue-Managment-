import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';

const Stack = createStackNavigator();

// Placeholder screen component
const HomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Welcome to Schedulizer</Text>
  </View>
);

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}