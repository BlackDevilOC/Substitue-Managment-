import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1976D2',
    primaryContainer: '#E3F2FD',
    secondary: '#FF9800',
    secondaryContainer: '#FFF3E0',
    error: '#D32F2F',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#212121',
    onSurface: '#212121',
    disabled: '#9E9E9E',
    placeholder: '#757575',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF4081',
  },
  fonts: {
    ...DefaultTheme.fonts,
  },
  animation: {
    ...DefaultTheme.animation,
  },
};