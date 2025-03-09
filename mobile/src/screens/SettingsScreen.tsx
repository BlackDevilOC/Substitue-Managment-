import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { List, Switch, Divider, Button, Dialog, Portal, TextInput, Text, Card, Title, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { useNetwork } from '../context/NetworkContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { format } from 'date-fns';

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { isInitialized, exportCsvFile } = useDatabase();
  const { isConnected, syncData, syncStatus } = useNetwork();
  
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const toggleSmsNotifications = () => {
    setSmsNotifications(!smsNotifications);
    // Save to AsyncStorage in real implementation
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Save to AsyncStorage and apply theme in real implementation
  };
  
  const toggleAutoSync = () => {
    setAutoSync(!autoSync);
    // Save to AsyncStorage in real implementation
  };
  
  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('No Connection', 'You are currently offline. Please connect to the internet and try again.');
      return;
    }
    
    try {
      await syncData();
      Alert.alert('Sync Complete', 'Data has been synchronized successfully.');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', 'Failed to synchronize data. Please try again later.');
    }
  };
  
  const handleExport = async () => {
    setExportDialogVisible(false);
    
    try {
      // Export teachers and schedules
      const teachersFileUri = await exportCsvFile('teachers');
      const schedulesFileUri = await exportCsvFile('schedules');
      
      // Create a zip file with both exports
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const zipFileName = `teacherapp_export_${timestamp}.zip`;
      const zipFileUri = `${FileSystem.documentDirectory}${zipFileName}`;
      
      // In a real implementation, you would create a zip file here
      // For this demo, we'll just show the export paths
      
      Alert.alert(
        'Export Complete',
        `Data has been exported to:\n${teachersFileUri}\n${schedulesFileUri}`
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Error', 'Failed to export data. Please try again later.');
    }
  };
  
  const handleResetApp = async () => {
    setResetDialogVisible(false);
    
    try {
      // Clear all app data
      await AsyncStorage.clear();
      
      Alert.alert(
        'Reset Complete',
        'All app data has been cleared. The app will now restart.',
        [{ text: 'OK', onPress: () => logout() }]
      );
    } catch (error) {
      console.error('Reset error:', error);
      Alert.alert('Reset Error', 'Failed to reset app data. Please try again later.');
    }
  };
  
  const handleChangePassword = () => {
    // Validate passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }
    
    // Check current password - in real app, validate against stored password
    if (currentPassword !== 'password') {
      Alert.alert('Error', 'Current password is incorrect');
      return;
    }
    
    // Change password - in real app, update stored password
    Alert.alert('Success', 'Password changed successfully');
    setPasswordDialogVisible(false);
    // Clear password fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };
  
  const renderExportDialog = () => (
    <Portal>
      <Dialog visible={exportDialogVisible} onDismiss={() => setExportDialogVisible(false)}>
        <Dialog.Title>Export Data</Dialog.Title>
        <Dialog.Content>
          <Paragraph>
            This will export all your data (teachers, schedules, absences) as CSV files.
            Would you like to continue?
          </Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setExportDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleExport}>Export</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
  
  const renderResetDialog = () => (
    <Portal>
      <Dialog visible={resetDialogVisible} onDismiss={() => setResetDialogVisible(false)}>
        <Dialog.Title>Reset Application</Dialog.Title>
        <Dialog.Content>
          <Paragraph>
            This will delete all data and reset the application to its initial state.
            This action cannot be undone.
          </Paragraph>
          <Paragraph style={styles.warningText}>
            Are you sure you want to continue?
          </Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setResetDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleResetApp} color="#F44336">Reset</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
  
  const renderPasswordDialog = () => (
    <Portal>
      <Dialog visible={passwordDialogVisible} onDismiss={() => setPasswordDialogVisible(false)}>
        <Dialog.Title>Change Password</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            mode="outlined"
            style={styles.dialogInput}
          />
          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            mode="outlined"
            style={styles.dialogInput}
          />
          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            mode="outlined"
            style={styles.dialogInput}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setPasswordDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleChangePassword}>Change</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <View style={styles.profileInfo}>
            <Title>{user?.username || 'User'}</Title>
            <Paragraph>{user?.isAdmin ? 'Administrator' : 'Regular User'}</Paragraph>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button 
            mode="outlined" 
            onPress={() => setPasswordDialogVisible(true)}
          >
            Change Password
          </Button>
          <Button 
            mode="outlined" 
            onPress={logout}
          >
            Log Out
          </Button>
        </Card.Actions>
      </Card>
      
      <List.Section>
        <List.Subheader>Preferences</List.Subheader>
        
        <List.Item
          title="SMS Notifications"
          description="Enable SMS notifications for substitute assignments"
          left={props => <List.Icon {...props} icon="message-text" />}
          right={props => <Switch {...props} value={smsNotifications} onValueChange={toggleSmsNotifications} />}
        />
        
        <Divider />
        
        <List.Item
          title="Dark Mode"
          description="Enable dark theme throughout the app"
          left={props => <List.Icon {...props} icon="theme-light-dark" />}
          right={props => <Switch {...props} value={darkMode} onValueChange={toggleDarkMode} />}
        />
        
        <Divider />
        
        <List.Item
          title="Auto Sync"
          description="Automatically sync data when online"
          left={props => <List.Icon {...props} icon="sync" />}
          right={props => <Switch {...props} value={autoSync} onValueChange={toggleAutoSync} />}
        />
      </List.Section>
      
      <List.Section>
        <List.Subheader>Data Management</List.Subheader>
        
        <List.Item
          title="Import Data"
          description="Import teachers and timetable data"
          left={props => <List.Icon {...props} icon="database-import" />}
          onPress={() => navigation.navigate('DataImport')}
        />
        
        <Divider />
        
        <List.Item
          title="Export Data"
          description="Export your data as CSV files"
          left={props => <List.Icon {...props} icon="database-export" />}
          onPress={() => setExportDialogVisible(true)}
        />
        
        <Divider />
        
        <List.Item
          title="Sync Now"
          description={isConnected ? "Synchronize data with server" : "Currently offline"}
          left={props => <List.Icon {...props} icon="cloud-sync" />}
          onPress={handleSync}
          disabled={!isConnected}
        />
      </List.Section>
      
      <List.Section>
        <List.Subheader>Application</List.Subheader>
        
        <List.Item
          title="About"
          description="About this application"
          left={props => <List.Icon {...props} icon="information" />}
          onPress={() => {/* Show about dialog */}}
        />
        
        <Divider />
        
        <List.Item
          title="Help & Support"
          description="Get help using this application"
          left={props => <List.Icon {...props} icon="help-circle" />}
          onPress={() => {/* Show help/support dialog */}}
        />
        
        <Divider />
        
        <List.Item
          title="Reset Application"
          description="Reset all data and settings"
          left={props => <List.Icon {...props} icon="delete" color="#F44336" />}
          onPress={() => setResetDialogVisible(true)}
          titleStyle={{ color: '#F44336' }}
          descriptionStyle={{ color: '#F44336' }}
        />
      </List.Section>
      
      <Text style={styles.versionText}>Version 1.0.0</Text>
      
      {renderExportDialog()}
      {renderResetDialog()}
      {renderPasswordDialog()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  profileCard: {
    margin: 16,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  dialogInput: {
    marginBottom: 12,
  },
  warningText: {
    color: '#F44336',
    fontWeight: 'bold',
    marginTop: 8,
  },
  versionText: {
    textAlign: 'center',
    marginVertical: 24,
    color: '#999',
    fontSize: 12,
  },
});

export default SettingsScreen;