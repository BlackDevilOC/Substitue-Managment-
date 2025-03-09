import { MD3LightTheme, DefaultTheme } from 'react-native-paper';

// Define custom colors for the Schedulizer app theme
const schedulizerColors = {
  primary: '#764abc', // Purple as the primary color
  primaryContainer: '#e9ddfd',
  secondary: '#03dac6', // Teal as secondary
  secondaryContainer: '#cef9f3',
  background: '#f5f5f5',
  surface: '#ffffff',
  error: '#B00020',
  errorContainer: '#FFDAD6',
  onPrimary: '#ffffff',
  onSecondary: '#000000',
  onBackground: '#000000',
  onSurface: '#000000',
  onError: '#ffffff',
  disabled: '#BDBDBD',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#f50057',
  // Custom colors for Schedulizer
  successGreen: '#4CAF50',
  warningYellow: '#FFC107',
  accent: '#03dac6',
};

// Extend the default theme with our custom colors
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...DefaultTheme.colors,
    ...schedulizerColors,
  },
  roundness: 4,
  animation: {
    scale: 1.0,
  },
  fonts: {
    ...DefaultTheme.fonts,
  },
  // Custom properties for the Schedulizer app
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
};