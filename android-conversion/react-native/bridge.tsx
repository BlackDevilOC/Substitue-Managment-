import React, { useRef, useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { 
  BackHandler, 
  Platform, 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Linking, 
  PermissionsAndroid,
  Image,
  Text 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SendSMS from 'react-native-sms';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Loading screen component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Image
      source={require('../assets/icon-192x192.png')}
      style={styles.logo}
    />
    <Text style={styles.loadingText}>Stay Organized, Stay Ahead!</Text>
    <ActivityIndicator size="large" color="#ffffff" />
  </View>
);

const WebViewBridge = () => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Handle offline storage
  const saveToStorage = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const loadFromStorage = async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error loading data:', error);
      return null;
    }
  };

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);

      // Inject network status into WebView
      webViewRef.current?.injectJavaScript(`
        window.dispatchEvent(
          new CustomEvent('app-network-status-change', { 
            detail: { isOnline: ${Boolean(state.isConnected)} } 
          })
        );
        true;
      `);
    });

    return () => unsubscribe();
  }, []);

  // Handle message from WebView
  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'SAVE_STATE') {
        await saveToStorage(data.key, data.payload);
      }

      if (data.type === 'LOAD_STATE') {
        const state = await loadFromStorage(data.key);
        webViewRef.current?.injectJavaScript(`
          window.dispatchEvent(
            new CustomEvent('state-loaded', { detail: ${JSON.stringify(state)} })
          );
          true;
        `);
      }

      if (data.type === 'SEND_SMS' && !isOffline) {
        const { phoneNumber, message } = data.payload;

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
            return;
          }
        }

        SendSMS.send({
          body: message,
          recipients: [phoneNumber],
          successTypes: ['sent', 'queued'],
          allowAndroidSendWithoutReadPermission: true,
        }, (completed, cancelled, error) => {
          console.log('SMS Callback:', { completed, cancelled, error });
        });
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#8A4FFF" barStyle="light-content" />
      {isLoading && <LoadingScreen />}
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onLoadEnd={() => setIsLoading(false)}
        onMessage={handleMessage}
        injectedJavaScript={`
          window.isNativeApp = true;
          window.addEventListener('offline', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'OFFLINE_MODE',
              payload: true
            }));
          });
          true;
        `}
        renderLoading={() => <LoadingScreen />}
        onShouldStartLoadWithRequest={request => {
          if (request.url.startsWith(WEB_APP_URL)) {
            return true;
          }
          Linking.openURL(request.url);
          return false;
        }}
      />
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            You are currently offline. Some features may be limited.
          </Text>
        </View>
      )}
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
    backgroundColor: '#8A4FFF',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EAB308',
    padding: 8,
  },
  offlineText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default WebViewBridge;