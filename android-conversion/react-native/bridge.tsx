
import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { BackHandler, Platform, View, StyleSheet, ActivityIndicator, Linking, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SendSMS from 'react-native-sms';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'react-native';

// Build-time configuration
const WEB_APP_URL = 'https://your-replit-app-url.replit.app';

const WebViewBridge = () => {
  const webViewRef = useRef<WebView>(null);

  // Inject JavaScript into WebView to listen for network status changes
  const INJECT_NETWORK_LISTENER = `
    (function() {
      function updateOnlineStatus() {
        window.dispatchEvent(
          new CustomEvent('app-network-status-change', { detail: { isOnline: navigator.onLine } })
        );
      }
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
    })();
    true;
  `;

  // Handle message from WebView
  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'SEND_SMS') {
        const { phoneNumber, message } = data.payload;
        
        // Request SMS permission on Android
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            {
              title: "SMS Permission",
              message: "This app needs access to send SMS messages",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log("SMS permission denied");
            return;
          }
        }
        
        // Send SMS
        SendSMS.send({
          body: message,
          recipients: [phoneNumber],
          successTypes: ['sent', 'queued'],
          allowAndroidSendWithoutReadPermission: true,
        }, (completed, cancelled, error) => {
          console.log('SMS Callback: completed: ' + completed + ' cancelled: ' + cancelled + 'error: ' + error);
        });
      }
      
      if (data.type === 'GET_DEVICE_INFO') {
        // Get network info
        const netInfo = await NetInfo.fetch();
        
        // Send device info back to the WebView
        const deviceInfo = {
          platform: Platform.OS,
          version: Platform.Version,
          isConnected: netInfo.isConnected,
          connectionType: netInfo.type,
          isInternetReachable: netInfo.isInternetReachable
        };
        
        webViewRef.current?.injectJavaScript(`
          window.dispatchEvent(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'DEVICE_INFO_RESPONSE',
              payload: ${JSON.stringify(deviceInfo)}
            })
          }));
          true;
        `);
      }
    } catch (error) {
      console.error('Error handling message', error);
    }
  };

  // Handle back button press on Android
  useEffect(() => {
    const backAction = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  // Handle external URL opening
  const handleShouldStartLoadWithRequest = (request: any) => {
    // Allow navigation within app
    if (request.url.startsWith(WEB_APP_URL)) {
      return true;
    }
    
    // Open external links in system browser
    Linking.openURL(request.url);
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4a6cf7" barStyle="light-content" />
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a6cf7" />
          </View>
        )}
        onMessage={handleMessage}
        injectedJavaScript={INJECT_NETWORK_LISTENER}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        pullToRefreshEnabled={true}
        allowsBackForwardNavigationGestures={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default WebViewBridge;
