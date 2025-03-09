import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Card, Title, Paragraph } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

const LoginScreen = () => {
  const { login, error, clearError, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Clear previous errors when screen is focused
  useEffect(() => {
    clearError();
  }, []);

  const handleLogin = async () => {
    try {
      await login(username, password);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>TS</Text>
        </View>
        <Text style={styles.appName}>Teacher Schedule</Text>
        <Text style={styles.tagline}>Manage schedules and substitutes</Text>
      </View>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Login</Title>
          
          {error && (
            <Paragraph style={styles.errorText}>{error}</Paragraph>
          )}
          
          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
          />
          
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secureTextEntry}
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye' : 'eye-off'}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
          />
          
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            loading={isLoading}
            disabled={isLoading || !username || !password}
          >
            Login
          </Button>
          
          <View style={styles.helpContainer}>
            <TouchableOpacity>
              <Text style={styles.helpText}>Need help?</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
      
      <View style={styles.infoContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
        <Text style={styles.offlineText}>Works offline - No internet required</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8A4FFF',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8A4FFF',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  card: {
    borderRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
  },
  loginButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 15,
    textAlign: 'center',
  },
  helpContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  helpText: {
    color: '#666',
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 5,
  },
  offlineText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LoginScreen;