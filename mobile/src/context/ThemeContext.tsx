
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DefaultTheme, MD3DarkTheme, Provider as PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define our base colors
const lightColors = {
  primary: '#8A4FFF', // School purple
  accent: '#FF9500', // Orange
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#333333',
  placeholder: '#888888',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF4C3F',
  error: '#FF4C3F',
  success: '#4CAF50',
  successGreen: '#4CAF50',
  warning: '#FFAA00',
  info: '#2196F3',
};

const darkColors = {
  primary: '#9E6FFF', // Lighter purple for dark mode
  accent: '#FFB74D', // Lighter orange for dark mode
  background: '#121212',
  surface: '#1E1E1E',
  text: '#F5F5F5',
  placeholder: '#AAAAAA',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  notification: '#FF6B6B',
  error: '#FF6B6B',
  success: '#66BB6A',
  successGreen: '#66BB6A',
  warning: '#FFCA28',
  info: '#42A5F5',
};

// Create custom themes
const customLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...lightColors,
  },
};

const customDarkTheme = {
  ...PaperDarkTheme,
  colors: {
    ...PaperDarkTheme.colors,
    ...darkColors,
  },
};

// Create Theme Context
interface ThemeContextType {
  theme: typeof customLightTheme;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: customLightTheme,
  isDarkMode: false,
  toggleTheme: () => {},
});

// Hook to use theme context
export const useTheme = () => useContext(ThemeContext);

// Theme Provider component
export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  
  // Load theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const themePreference = await AsyncStorage.getItem('themePreference');
        if (themePreference !== null) {
          setIsDarkMode(themePreference === 'dark');
        } else {
          // Use system preference if no saved preference
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, [systemColorScheme]);
  
  // Toggle theme function
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('themePreference', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };
  
  // Get the current theme
  const theme = isDarkMode ? customDarkTheme : customLightTheme;
  
  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};
