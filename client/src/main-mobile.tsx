
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeMobileSupport, MobileSupport } from './main-mobile-updates';

// Initialize mobile-specific optimizations
initializeMobileSupport();

// Wrap the app with mobile-specific components
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <>
      <App />
      <MobileSupport />
    </>
  </React.StrictMode>
);
