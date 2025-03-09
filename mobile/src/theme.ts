import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#A992CC', // Purple from logo
    accent: '#F44336',  // Red from "STAY AHEAD!" text
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    error: '#F44336',
    notification: '#A992CC',
    // Additional custom colors for the app
    darkGray: '#333333', // For the "S" in the logo
    lightPurple: '#C5B3E6',
    successGreen: '#4CAF50'
  },
  roundness: 8,
  animation: {
    scale: 1.0,
  },
};