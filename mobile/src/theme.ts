import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8A4FFF',
    accent: '#F8BBD0',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    error: '#F44336',
    notification: '#8A4FFF',
  },
  roundness: 8,
  animation: {
    scale: 1.0,
  },
};