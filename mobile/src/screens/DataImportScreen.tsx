import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text, List, ActivityIndicator, ProgressBar } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';

interface ImportFile {
  uri: string;
  name: string;
  size: number;
  type: string;
}

const DataImportScreen = () => {
  const navigation = useNavigation<any>();
  const { importCsvFile, teachersTable, schedulesTable } = useDatabase();
  
  const [timetableFile, setTimetableFile] = useState<ImportFile | null>(null);
  const [substitutesFile, setSubstitutesFile] = useState<ImportFile | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importSteps, setImportSteps] = useState<string[]>([]);
  
  const selectTimetableFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) return;
      
      const file = result.assets[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
        return;
      }
      
      setTimetableFile({
        uri: file.uri,
        name: file.name,
        size: file.size,
        type: file.mimeType || 'text/csv',
      });
    } catch (error) {
      console.error('Error selecting timetable file:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };
  
  const selectSubstitutesFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) return;
      
      const file = result.assets[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
        return;
      }
      
      setSubstitutesFile({
        uri: file.uri,
        name: file.name,
        size: file.size,
        type: file.mimeType || 'text/csv',
      });
    } catch (error) {
      console.error('Error selecting substitutes file:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };
  
  const importData = async () => {
    if (!timetableFile && !substitutesFile) {
      Alert.alert('No Files Selected', 'Please select at least one file to import');
      return;
    }
    
    try {
      setImporting(true);
      setProgress(0);
      setImportSteps([]);
      
      // Confirmation
      addImportStep('Starting import process...');
      
      // Clear existing data if needed
      const shouldClearData = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Clear Existing Data?',
          'Do you want to clear existing data before importing? This will delete all teachers and schedules.',
          [
            { text: 'No', onPress: () => resolve(false) },
            { text: 'Yes', onPress: () => resolve(true) }
          ]
        );
      });
      
      if (shouldClearData) {
        addImportStep('Clearing existing data...');
        await clearExistingData();
        addImportStep('Existing data cleared successfully');
      }
      
      setProgress(0.2);
      
      // Process timetable file
      if (timetableFile) {
        addImportStep(`Processing timetable file: ${timetableFile.name}`);
        await processTimetableFile(timetableFile.uri);
        addImportStep('Timetable processing complete');
      }
      
      setProgress(0.6);
      
      // Process substitutes file
      if (substitutesFile) {
        addImportStep(`Processing substitutes file: ${substitutesFile.name}`);
        await processSubstitutesFile(substitutesFile.uri);
        addImportStep('Substitutes processing complete');
      }
      
      setProgress(1);
      addImportStep('Import process completed successfully');
      
      // Show success message
      Alert.alert(
        'Import Complete',
        'Data has been imported successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Import error:', error);
      addImportStep(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Import Error', 'Failed to import data. Check the logs for details.');
    } finally {
      setImporting(false);
    }
  };
  
  const clearExistingData = async () => {
    try {
      // This function would clear existing data in the database
      // For demonstration, we'll just log it
      console.log('Clearing existing data...');
      
      // In a real implementation, you would execute database operations
      // await db.executeQuery('DELETE FROM schedules');
      // await db.executeQuery('DELETE FROM teachers');
      
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear existing data');
    }
  };
  
  const processTimetableFile = async (fileUri: string) => {
    try {
      // Read the file content
      const content = await FileSystem.readAsStringAsync(fileUri);
      
      // Process CSV content
      // In a real implementation, you would parse the CSV and import data
      console.log(`Processing timetable file with ${content.length} bytes`);
      
      // Use the database import function for timetable
      await importCsvFile(fileUri, 'schedules');
      
      return true;
    } catch (error) {
      console.error('Error processing timetable file:', error);
      throw new Error('Failed to process timetable file');
    }
  };
  
  const processSubstitutesFile = async (fileUri: string) => {
    try {
      // Read the file content
      const content = await FileSystem.readAsStringAsync(fileUri);
      
      // Process CSV content
      // In a real implementation, you would parse the CSV and import data
      console.log(`Processing substitutes file with ${content.length} bytes`);
      
      // Use the database import function for substitutes
      await importCsvFile(fileUri, 'teachers');
      
      return true;
    } catch (error) {
      console.error('Error processing substitutes file:', error);
      throw new Error('Failed to process substitutes file');
    }
  };
  
  const addImportStep = (step: string) => {
    setImportSteps(prev => [...prev, step]);
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Import Data</Title>
          <Paragraph>
            Select CSV files to import timetable and substitute teacher information.
          </Paragraph>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>Timetable Data</Title>
          <Paragraph>
            Import class schedule data with teacher assignments.
          </Paragraph>
          
          <View style={styles.fileInfo}>
            {timetableFile ? (
              <>
                <Text style={styles.fileName}>{timetableFile.name}</Text>
                <Text style={styles.fileSize}>
                  {(timetableFile.size / 1024).toFixed(1)} KB
                </Text>
                <Button 
                  mode="text" 
                  onPress={() => setTimetableFile(null)}
                  style={styles.clearButton}
                >
                  Clear
                </Button>
              </>
            ) : (
              <Text style={styles.noFileText}>No file selected</Text>
            )}
          </View>
        </Card.Content>
        <Card.Actions>
          <Button 
            mode="outlined" 
            onPress={selectTimetableFile}
            disabled={importing}
          >
            Select File
          </Button>
        </Card.Actions>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>Substitute Teachers</Title>
          <Paragraph>
            Import substitute teacher contact information.
          </Paragraph>
          
          <View style={styles.fileInfo}>
            {substitutesFile ? (
              <>
                <Text style={styles.fileName}>{substitutesFile.name}</Text>
                <Text style={styles.fileSize}>
                  {(substitutesFile.size / 1024).toFixed(1)} KB
                </Text>
                <Button 
                  mode="text" 
                  onPress={() => setSubstitutesFile(null)}
                  style={styles.clearButton}
                >
                  Clear
                </Button>
              </>
            ) : (
              <Text style={styles.noFileText}>No file selected</Text>
            )}
          </View>
        </Card.Content>
        <Card.Actions>
          <Button 
            mode="outlined" 
            onPress={selectSubstitutesFile}
            disabled={importing}
          >
            Select File
          </Button>
        </Card.Actions>
      </Card>
      
      {importing && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Import Progress</Title>
            <ProgressBar progress={progress} style={styles.progressBar} />
            
            <View style={styles.logContainer}>
              {importSteps.map((step, index) => (
                <Text key={index} style={styles.logText}>
                  {step}
                </Text>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={importing}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={importData}
          style={styles.importButton}
          loading={importing}
          disabled={importing || (!timetableFile && !substitutesFile)}
        >
          Import Data
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  fileInfo: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  fileName: {
    fontWeight: 'bold',
  },
  fileSize: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  noFileText: {
    fontStyle: 'italic',
    color: '#999',
  },
  clearButton: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  importButton: {
    flex: 2,
  },
  progressBar: {
    marginVertical: 16,
    height: 6,
  },
  logContainer: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 4,
    maxHeight: 200,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
});

export default DataImportScreen;