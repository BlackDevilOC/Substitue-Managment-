import { InstallPrompt } from "./components/ui/install-prompt";
import { registerServiceWorker } from "./register-sw";

// Call this function after your app is rendered
export function initializeMobileSupport() {
  // Register service worker for offline support
  registerServiceWorker();

  // Enable passive touch listeners for better performance
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('touchmove', () => {}, { passive: true });

  // Add viewport meta tag for proper mobile scaling
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  document.head.appendChild(viewport);

  // Add mobile web app capable meta tags
  const mobileWebApp = document.createElement('meta');
  mobileWebApp.name = 'mobile-web-app-capable';
  mobileWebApp.content = 'yes';
  document.head.appendChild(mobileWebApp);

  // iOS specific meta tags
  const appleMobileWebApp = document.createElement('meta');
  appleMobileWebApp.name = 'apple-mobile-web-app-capable';
  appleMobileWebApp.content = 'yes';
  document.head.appendChild(appleMobileWebApp);
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

// Function to handle touch gestures
export function setupTouchGestures(element: HTMLElement) {
  let touchStartX = 0;
  let touchStartY = 0;

  element.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  element.addEventListener('touchmove', (e) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;

    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    // Implement swipe detection
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 75) {
        // Swipe left
        document.dispatchEvent(new CustomEvent('swipe-left'));
      } else if (deltaX < -75) {
        // Swipe right
        document.dispatchEvent(new CustomEvent('swipe-right'));
      }
    } else {
      // Vertical swipe
      if (deltaY > 75) {
        // Swipe up
        document.dispatchEvent(new CustomEvent('swipe-up'));
      } else if (deltaY < -75) {
        // Swipe down - could trigger pull-to-refresh
        document.dispatchEvent(new CustomEvent('swipe-down'));
      }
    }
  }, { passive: true });
}