import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

// Create a custom theme that matches the web app's appearance
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8A4FFF',
    secondary: '#4F9DFF',
    accent: '#FF4F9D',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    error: '#FF4F4F',
    text: '#1A1A1A',
    disabled: '#9E9E9E',
    placeholder: '#9E9E9E',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF4F4F',
  },
  roundness: 8,
};