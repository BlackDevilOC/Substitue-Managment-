
import { InstallPrompt } from "./components/ui/install-prompt";
import { registerServiceWorker } from "./register-sw";

// Call this function after your app is rendered
export function initializeMobileSupport() {
  // Register service worker for offline support
  registerServiceWorker();
  
  // Add any mobile-specific initialization here
  
  // Add event listeners for mobile-specific events
  document.addEventListener('touchstart', function() {}, {passive: true});
}

// This component can be added to your app's root component
export function MobileSupport() {
  return (
    <>
      <InstallPrompt />
      {/* Add other mobile-specific UI components here */}
    </>
  );
}
