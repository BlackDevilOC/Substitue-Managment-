
import React, { createContext, useContext, useState, useEffect } from 'react';
import { MD3LightTheme, MD3DarkTheme, Provider as PaperProvider } from 'react-native-paper';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define our base colors
const lightColors = {
  primary: '#8A4FFF', // School purple
  primaryContainer: '#E8DDFF', // Light purple container
  secondary: '#FF9500', // Orange
  secondaryContainer: '#FFE0B2', // Light orange container
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F0F0',
  error: '#FF4C3F',
  errorContainer: '#FFEDEC',
  onPrimary: '#FFFFFF',
  onSecondary: '#000000',
  onBackground: '#333333',
  onSurface: '#333333',
  onSurfaceVariant: '#555555',
  onError: '#FFFFFF',
  outline: '#DDDDDD',
  text: '#333333',
  placeholder: '#888888',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF4C3F',
  success: '#4CAF50',
  successGreen: '#4CAF50',
  warning: '#FFAA00',
  info: '#2196F3',
};

const darkColors = {
  primary: '#9E6FFF', // Lighter purple for dark mode
  primaryContainer: '#4A3180', // Dark purple container
  secondary: '#FFB74D', // Lighter orange for dark mode
  secondaryContainer: '#B26A00', // Dark orange container
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2C',
  error: '#FF6B6B',
  errorContainer: '#8B0000',
  onPrimary: '#FFFFFF',
  onSecondary: '#000000',
  onBackground: '#F5F5F5',
  onSurface: '#F5F5F5',
  onSurfaceVariant: '#BBBBBB',
  onError: '#FFFFFF',
  outline: '#444444',
  text: '#F5F5F5',
  placeholder: '#AAAAAA',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  notification: '#FF6B6B',
  success: '#66BB6A',
  successGreen: '#66BB6A',
  warning: '#FFCA28',
  info: '#42A5F5',
};

// Define common fonts and shapes
const fonts = {
  regular: {
    fontFamily: 'System',
    fontWeight: 'normal',
  },
  medium: {
    fontFamily: 'System',
    fontWeight: '500',
  },
  light: {
    fontFamily: 'System',
    fontWeight: '300',
  },
  thin: {
    fontFamily: 'System',
    fontWeight: '100',
  },
};

// Create custom themes with MD3 (Material You) support
const customLightTheme = {
  ...MD3LightTheme,
  dark: false,
  mode: 'adaptive' as const,
  roundness: 8,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  animation: {
    scale: 1.0,
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  dark: true,
  mode: 'adaptive' as const,
  roundness: 8,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  animation: {
    scale: 1.0,
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

// Enum for theme preference
enum ThemePreference {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

// Enhanced Theme Context Type
interface ThemeContextType {
  theme: typeof customLightTheme;
  isDarkMode: boolean;
  themePreference: ThemePreference;
  toggleTheme: () => void;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: customLightTheme,
  isDarkMode: false,
  themePreference: ThemePreference.SYSTEM,
  toggleTheme: () => {},
  setThemePreference: async () => {},
});

// Theme Provider component
export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(ThemePreference.SYSTEM);
  
  // Load theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem('themePreference');
        if (savedPreference !== null) {
          setThemePreferenceState(savedPreference as ThemePreference);
          
          if (savedPreference === ThemePreference.SYSTEM) {
            setIsDarkMode(systemColorScheme === 'dark');
          } else {
            setIsDarkMode(savedPreference === ThemePreference.DARK);
          }
        } else {
          // Default to system preference
          setThemePreferenceState(ThemePreference.SYSTEM);
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        // Default to system preference on error
        setThemePreferenceState(ThemePreference.SYSTEM);
        setIsDarkMode(systemColorScheme === 'dark');
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Listen for system theme changes
  useEffect(() => {
    // Only update if the user preference is set to "system"
    if (themePreference === ThemePreference.SYSTEM) {
      setIsDarkMode(systemColorScheme === 'dark');
    }
    
    // Setup a listener for theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themePreference === ThemePreference.SYSTEM) {
        setIsDarkMode(colorScheme === 'dark');
      }
    });
    
    // Cleanup listener on unmount
    return () => {
      subscription.remove();
    };
  }, [systemColorScheme, themePreference]);
  
  // Set theme preference
  const setThemePreference = async (preference: ThemePreference): Promise<void> => {
    setThemePreferenceState(preference);
    
    // Update dark mode based on preference
    if (preference === ThemePreference.SYSTEM) {
      setIsDarkMode(systemColorScheme === 'dark');
    } else {
      setIsDarkMode(preference === ThemePreference.DARK);
    }
    
    try {
      await AsyncStorage.setItem('themePreference', preference);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };
  
  // Toggle between light and dark mode
  const toggleTheme = async () => {
    // If currently using system preference, switch to explicit dark/light
    if (themePreference === ThemePreference.SYSTEM) {
      const newPreference = isDarkMode ? ThemePreference.LIGHT : ThemePreference.DARK;
      await setThemePreference(newPreference);
    } else {
      // Otherwise just toggle between light and dark
      const newPreference = themePreference === ThemePreference.DARK 
        ? ThemePreference.LIGHT 
        : ThemePreference.DARK;
      await setThemePreference(newPreference);
    }
  };
  
  // Get the current theme
  const theme = isDarkMode ? customDarkTheme : customLightTheme;
  
  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        isDarkMode, 
        themePreference, 
        toggleTheme, 
        setThemePreference 
      }}
    >
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};
