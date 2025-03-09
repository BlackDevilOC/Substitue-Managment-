import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Snackbar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  
  const { login } = useAuth();
  const theme = useTheme();
  
  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMessage('Please enter both username and password');
      setErrorVisible(true);
      return;
    }
    
    try {
      setIsSubmitting(true);
      await login(username, password);
    } catch (error) {
      // In a real app, more specific error handling would be done here
      setErrorMessage(error instanceof Error ? error.message : 'Login failed. Please check your credentials.');
      setErrorVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = () => {
    setUsername('admin');
    setPassword('password');
    // Simulate a small delay before submitting
    setTimeout(handleLogin, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            {/* App logo would go here */}
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.appName}>Schedulizer</Text>
            <Text style={styles.appTagline}>Teacher & Substitute Management</Text>
          </View>
          
          <View style={styles.formContainer}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              left={<TextInput.Icon icon="account" />}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon 
                  icon={passwordVisible ? "eye-off" : "eye"}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                />
              }
            />
            
            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Login
            </Button>
            
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => {
                setErrorMessage('Please contact your administrator to reset your password.');
                setErrorVisible(true);
              }}
            >
              <Text style={{ color: theme.colors.primary }}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <View style={styles.demoContainer}>
              <Text style={styles.demoText}>New to Schedulizer?</Text>
              <Button
                mode="outlined"
                onPress={handleDemoLogin}
                style={styles.demoButton}
              >
                Try Demo Account
              </Button>
            </View>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        action={{
          label: 'OK',
          onPress: () => setErrorVisible(false),
        }}
        duration={3000}
      >
        {errorMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  demoContainer: {
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  demoText: {
    marginBottom: 8,
    color: '#666',
  },
  demoButton: {
    width: '80%',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default LoginScreen;