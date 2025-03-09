import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeMobileSupport, MobileSupport } from './main-mobile-updates';
import { Loader2 } from 'lucide-react';

// Loading component with the logo
const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#8A4FFF]">
    <img 
      src="/icons/icon-192x192.png" 
      alt="Schedulizer Logo" 
      className="w-32 h-32 mb-6 animate-bounce"
    />
    <h1 className="text-2xl font-bold text-white mb-4">
      Stay Organized, Stay Ahead!
    </h1>
    <Loader2 className="w-8 h-8 text-white animate-spin" />
  </div>
);

// Initialize mobile-specific optimizations
initializeMobileSupport();

// App wrapper with loading state
const AppWrapper = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize app state from localStorage
    const loadAppState = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Min loading time
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading app state:', error);
        setIsLoading(false);
      }
    };

    loadAppState();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <React.StrictMode>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50">
          You are currently offline. Some features may be limited.
        </div>
      )}
      <App />
      <MobileSupport />
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AppWrapper />
);