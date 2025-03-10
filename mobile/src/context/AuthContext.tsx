import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  clearError: () => {},
});

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Mock function to simulate authentication
async function authenticateUser(username: string, password: string): Promise<User | null> {
  // This would be a real API call in production
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // For demo purposes, accept simple credentials
      if (username === 'admin' && password === 'password') {
        resolve({
          id: 1,
          username: 'admin',
          isAdmin: true,
        });
      } else if (username === 'teacher' && password === 'password') {
        resolve({
          id: 2,
          username: 'teacher',
          isAdmin: false,
        });
      } else {
        resolve(null);
      }
    }, 800); // Simulate network delay
  });
}

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from storage on app startup
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load user from storage:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await authenticateUser(username, password);
      
      if (user) {
        setUser(user);
        await AsyncStorage.setItem('user', JSON.stringify(user));
      } else {
        throw new Error('Invalid credentials. Please try again.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Provide auth context value
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
