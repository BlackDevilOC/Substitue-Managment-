
// This file acts as a bridge between the web app and React Native features

// Check if the app is running in a React Native WebView
export const isRunningInReactNative = (): boolean => {
  return typeof (window as any).ReactNativeWebView !== 'undefined';
};

// Send an SMS using React Native's native capabilities
export const sendSMS = (phoneNumber: string, message: string): boolean => {
  if (isRunningInReactNative()) {
    try {
      // Send a message to the React Native host
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'SEND_SMS',
          payload: {
            phoneNumber,
            message
          }
        })
      );
      return true;
    } catch (error) {
      console.error('Failed to communicate with native app', error);
      return false;
    }
  }
  return false;
};

// Get device information
export const getDeviceInfo = (): Promise<any> => {
  if (isRunningInReactNative()) {
    return new Promise((resolve) => {
      const messageHandler = (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'DEVICE_INFO_RESPONSE') {
            window.removeEventListener('message', messageHandler);
            resolve(data.payload);
          }
        } catch (e) {
          console.error('Error parsing device info response', e);
        }
      };

      window.addEventListener('message', messageHandler);

      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'GET_DEVICE_INFO',
          payload: {}
        })
      );
    });
  }
  
  return Promise.resolve({
    platform: 'web',
    version: 'unknown',
    isConnected: navigator.onLine
  });
};
