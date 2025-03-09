import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Button, TextInput, Text, Surface } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { login, error, clearError } = useAuth();

  const handleLogin = async () => {
    if (username.trim() === '' || password.trim() === '') {
      // You could implement your own error handling here
      return;
    }

    try {
      await login(username, password);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  // Clear any errors when inputs change
  const handleInputChange = (field: 'username' | 'password', value: string) => {
    if (error) {
      clearError();
    }

    if (field === 'username') {
      setUsername(value);
    } else {
      setPassword(value);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 70}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.surface}>
          <View style={styles.logoContainer}>
            <Text style={styles.appTitle}>Teacher Schedule Manager</Text>
            <Text style={styles.subtitle}>Mobile Edition</Text>
          </View>
          
          <View style={styles.form}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={(text) => handleInputChange('username', text)}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              left={<TextInput.Icon icon="account" />}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => handleInputChange('password', text)}
              secureTextEntry={!isPasswordVisible}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={isPasswordVisible ? "eye-off" : "eye"}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                />
              }
            />
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <Button 
              mode="contained" 
              onPress={handleLogin} 
              style={styles.button}
            >
              Login
            </Button>
            
            <Text style={styles.hint}>
              For demonstration, use:
            </Text>
            <Text style={styles.hint}>
              Username: admin, Password: password
            </Text>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8A4FFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  surface: {
    padding: 20,
    borderRadius: 10,
    elevation: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8A4FFF',
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: '#FF4F4F',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
  hint: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 12,
  },
});

export default LoginScreen;