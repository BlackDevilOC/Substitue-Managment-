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
  Text,
  SafeAreaView,
  Dimensions
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Loading screen component with correct styling
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Image
      source={require('../assets/schedulizer-logo.png')}
      style={styles.logo}
      resizeMode="contain"
    />
    <Text style={styles.loadingText}>Stay Organized, Stay Ahead!</Text>
    <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
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
          new CustomEvent('network-status-change', { 
            detail: { isOnline: ${Boolean(state.isConnected)} } 
          })
        );
        true;
      `);
    });

    return () => unsubscribe();
  }, []);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, []);

  // Handle message from WebView
  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'SAVE_STATE':
          await saveToStorage(data.key, data.payload);
          break;

        case 'LOAD_STATE':
          const state = await loadFromStorage(data.key);
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(
              new CustomEvent('state-loaded', { detail: ${JSON.stringify(state)} })
            );
            true;
          `);
          break;

        case 'SEND_SMS':
          if (isOffline) return;

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

            if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
          }

          SendSMS.send({
            body: message,
            recipients: [phoneNumber],
            successTypes: ['sent', 'queued'],
            allowAndroidSendWithoutReadPermission: true,
          }, (completed, cancelled, error) => {
            console.log('SMS Status:', { completed, cancelled, error });
          });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#8A4FFF" barStyle="light-content" />
      {isLoading && <LoadingScreen />}

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            You are currently offline. Some features may be limited.
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: 'http://localhost:5000' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onLoadEnd={() => setIsLoading(false)}
        onMessage={handleMessage}
        injectedJavaScript={`
          window.isNativeApp = true;
          window.mobileAppVersion = '1.0.0';
          true;
        `}
        renderLoading={() => <LoadingScreen />}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    zIndex: 1000,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 24,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 20,
  },
  offlineBanner: {
    backgroundColor: '#EAB308',
    padding: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default WebViewBridge;