
import React, { createContext, useContext } from 'react';

interface ThemeContextType {
  theme: any;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: {},
  isDarkMode: false,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <ThemeContext.Provider 
      value={{ 
        theme: {}, 
        isDarkMode: false, 
        toggleTheme: () => {}
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
