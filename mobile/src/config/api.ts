/**
 * API Configuration
 * 
 * This file contains configuration settings for API communication.
 * The API_BASE_URL should be adjusted based on environment:
 * - 'https://your-production-url.com/api' for production
 * - 'http://your-development-url:5000/api' for development
 * - 'http://10.0.2.2:5000/api' for Android emulator
 * - 'http://localhost:5000/api' for iOS simulator
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the environment from Expo Constants
const ENV = Constants.manifest?.extra?.env || 'development';

// Default API URL based on environment
const getDefaultApiUrl = (): string => {
  if (ENV === 'production') {
    return 'https://your-production-url.com/api';
  }
  
  // Android emulator needs special IP to reach host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  
  // iOS simulator can use localhost
  return 'http://localhost:5000/api';
};

// Export configuration
export const API_CONFIG = {
  BASE_URL: getDefaultApiUrl(),
  TIMEOUT: 10000, // 10 seconds
  RETRY_COUNT: 3,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
    },
    TEACHERS: {
      LIST: '/teachers',
      DETAIL: (id: number) => `/teachers/${id}`,
      SCHEDULE: (id: number) => `/teachers/${id}/schedule`,
    },
    SCHEDULES: {
      LIST: '/schedules',
      BY_DAY: (day: string) => `/schedules/day/${day}`,
    },
    ABSENCES: {
      LIST: '/absences',
      CREATE: '/absences',
      UPDATE: (id: number) => `/absences/${id}`,
      DELETE: (id: number) => `/absences/${id}`,
    },
    SUBSTITUTES: {
      ASSIGN: '/substitutes/assign',
      AUTO_ASSIGN: '/substitutes/auto-assign',
      ASSIGNMENTS: '/substitutes/assignments',
    },
    SYNC: {
      FULL: '/sync/full',
      INCREMENTAL: '/sync/incremental',
    },
  },
};

// Helper function to build a full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Export API version 
export const API_VERSION = '1.0';