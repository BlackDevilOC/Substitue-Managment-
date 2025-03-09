import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, List, Switch, Button, Divider, Dialog, TextInput, Card, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useDatabase } from '../context/DatabaseContext';

const SettingsScreen = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [appInfo, setAppInfo] = useState({
    version: '1.0.0',
    dbSize: '0 KB',
    cacheSize: '0 KB',
    lastSync: 'Never',
  });
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { isConnected, syncData, syncStatus } = useNetwork();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { teachersTable, schedulesTable, absencesTable } = useDatabase();

  useEffect(() => {
    loadSettings();
    calculateStorageUsage();
  }, []);

  const loadSettings = async () => {
    try {
      const storedDarkMode = await AsyncStorage.getItem('darkMode');
      const storedOfflineMode = await AsyncStorage.getItem('offlineMode');
      const storedAutoSync = await AsyncStorage.getItem('autoSync');
      
      if (storedDarkMode !== null) {
        setDarkMode(JSON.parse(storedDarkMode));
      }
      
      if (storedOfflineMode !== null) {
        setOfflineMode(JSON.parse(storedOfflineMode));
      }
      
      if (storedAutoSync !== null) {
        setAutoSync(JSON.parse(storedAutoSync));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const calculateStorageUsage = async () => {
    try {
      // In a real app, this would calculate actual sizes
      const dbSize = '2.3 MB';
      const cacheSize = '1.5 MB';
      const lastSync = isConnected ? 'Just now' : 'Never';
      
      setAppInfo({
        version: '1.0.0',
        dbSize,
        cacheSize,
        lastSync,
      });
    } catch (error) {
      console.error('Error calculating storage usage:', error);
    }
  };

  const toggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    try {
      await AsyncStorage.setItem('darkMode', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving dark mode setting:', error);
    }
  };

  const toggleOfflineMode = async (value: boolean) => {
    setOfflineMode(value);
    try {
      await AsyncStorage.setItem('offlineMode', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving offline mode setting:', error);
    }
  };

  const toggleAutoSync = async (value: boolean) => {
    setAutoSync(value);
    try {
      await AsyncStorage.setItem('autoSync', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving auto sync setting:', error);
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    
    // In a real app, this would validate the current password and update it on the server
    Alert.alert('Success', 'Password has been updated');
    setPasswordDialogVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This won\'t affect your data but may temporarily slow down the app.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: async () => {
            // In a real app, we would clear the cache files
            Alert.alert('Success', 'Cache cleared successfully');
            calculateStorageUsage();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleExportData = async () => {
    try {
      await syncData();
      Alert.alert('Success', 'Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@schedulizer.app?subject=Support%20Request');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://schedulizer.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://schedulizer.app/terms');
  };

  const handleImportExport = () => {
    navigation.navigate('DataImport');
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content>
          <Text style={styles.userGreeting}>Hello, {user?.username}</Text>
          <Text style={styles.userRole}>{user?.isAdmin ? 'Administrator' : 'Teacher'}</Text>
        </Card.Content>
      </Card>

      <List.Section title="Display Settings">
        <List.Item
          title="Dark Mode"
          description="Enable dark color scheme"
          left={props => <List.Icon {...props} icon="theme-light-dark" />}
          right={props => <Switch value={darkMode} onValueChange={toggleDarkMode} />}
        />
        <Divider />
        <List.Item
          title="Offline Mode"
          description="Work without internet connection"
          left={props => <List.Icon {...props} icon="wifi-off" />}
          right={props => <Switch value={offlineMode} onValueChange={toggleOfflineMode} />}
        />
        <Divider />
        <List.Item
          title="Auto Sync"
          description="Automatically sync when online"
          left={props => <List.Icon {...props} icon="sync" />}
          right={props => <Switch value={autoSync} onValueChange={toggleAutoSync} />}
        />
      </List.Section>

      <List.Section title="Account">
        <List.Item
          title="Change Password"
          description="Update your login password"
          left={props => <List.Icon {...props} icon="lock" />}
          onPress={() => setPasswordDialogVisible(true)}
        />
        <Divider />
        <List.Item
          title="Logout"
          description="Sign out of your account"
          left={props => <List.Icon {...props} icon="logout" />}
          onPress={() => setLogoutDialogVisible(true)}
        />
      </List.Section>

      <List.Section title="Data Management">
        <List.Item
          title="Import / Export Data"
          description="Manage CSV files and teacher data"
          left={props => <List.Icon {...props} icon="database-import" />}
          onPress={handleImportExport}
        />
        <Divider />
        <List.Item
          title="Export Current Data"
          description="Save your current data to the server"
          left={props => <List.Icon {...props} icon="export" />}
          onPress={handleExportData}
          disabled={!isConnected || syncStatus === 'syncing'}
        />
        <Divider />
        <List.Item
          title="Clear Cache"
          description="Free up storage space"
          left={props => <List.Icon {...props} icon="cached" />}
          onPress={handleClearCache}
        />
      </List.Section>

      <List.Section title="Support & Help">
        <List.Item
          title="Contact Support"
          description="Get help with the app"
          left={props => <List.Icon {...props} icon="help-circle" />}
          onPress={handleContactSupport}
        />
        <Divider />
        <List.Item
          title="Privacy Policy"
          left={props => <List.Icon {...props} icon="shield-account" />}
          onPress={handlePrivacyPolicy}
        />
        <Divider />
        <List.Item
          title="Terms of Service"
          left={props => <List.Icon {...props} icon="file-document" />}
          onPress={handleTermsOfService}
        />
      </List.Section>

      <View style={styles.infoContainer}>
        <Text style={styles.appInfoText}>App Version: {appInfo.version}</Text>
        <Text style={styles.appInfoText}>Database Size: {appInfo.dbSize}</Text>
        <Text style={styles.appInfoText}>Cache Size: {appInfo.cacheSize}</Text>
        <Text style={styles.appInfoText}>Last Sync: {appInfo.lastSync}</Text>
      </View>

      {/* Change Password Dialog */}
      <Dialog
        visible={passwordDialogVisible}
        onDismiss={() => setPasswordDialogVisible(false)}
      >
        <Dialog.Title>Change Password</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Current Password"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={styles.dialogInput}
          />
          <TextInput
            label="New Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={styles.dialogInput}
          />
          <TextInput
            label="Confirm New Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.dialogInput}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setPasswordDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleChangePassword}>Change</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog
        visible={logoutDialogVisible}
        onDismiss={() => setLogoutDialogVisible(false)}
      >
        <Dialog.Title>Logout</Dialog.Title>
        <Dialog.Content>
          <Text>Are you sure you want to log out?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setLogoutDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleLogout}>Logout</Button>
        </Dialog.Actions>
      </Dialog>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
    marginBottom: 8,
  },
  userGreeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userRole: {
    fontSize: 16,
    marginTop: 4,
    color: '#666',
  },
  dialogInput: {
    marginVertical: 8,
  },
  infoContainer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginVertical: 2,
  },
});

export default SettingsScreen;