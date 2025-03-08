
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';

// Example component for teacher management in React Native
export default function App() {
  const [teachers, setTeachers] = useState([]);
  const [absentTeachers, setAbsentTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTeachers();
    fetchAbsentTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('https://your-api-endpoint.com/api/teachers');
      const data = await response.json();
      setTeachers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      Alert.alert('Error', 'Failed to load teachers');
      setLoading(false);
    }
  };

  const fetchAbsentTeachers = async () => {
    try {
      const response = await fetch('https://your-api-endpoint.com/api/get-absent-teachers');
      const data = await response.json();
      setAbsentTeachers(data);
    } catch (error) {
      console.error('Error fetching absent teachers:', error);
      Alert.alert('Error', 'Failed to load absent teachers');
    }
  };

  const markTeacherAttendance = async (teacherName, status) => {
    try {
      const response = await fetch('https://your-api-endpoint.com/api/mark-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName,
          status,
          phoneNumber: teachers.find(t => t.name === teacherName)?.phoneNumber || ''
        }),
      });
      
      if (response.ok) {
        fetchAbsentTeachers(); // Refresh the absent teachers list
        Alert.alert('Success', `Teacher marked as ${status}`);
      } else {
        Alert.alert('Error', 'Failed to update teacher status');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to update teacher status');
    }
  };

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teacher Attendance</Text>
      
      <TextInput
        style={styles.searchInput}
        placeholder="Search teachers..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {loading ? (
        <Text>Loading teachers...</Text>
      ) : (
        <FlatList
          data={filteredTeachers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isAbsent = absentTeachers.some(
              teacher => teacher.name === item.name
            );
            
            return (
              <View style={styles.teacherItem}>
                <Text style={styles.teacherName}>{item.name}</Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, isAbsent ? styles.buttonInactive : styles.buttonActive]}
                    onPress={() => markTeacherAttendance(item.name, 'present')}
                  >
                    <Text style={styles.buttonText}>Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, isAbsent ? styles.buttonActive : styles.buttonInactive]}
                    onPress={() => markTeacherAttendance(item.name, 'absent')}
                  >
                    <Text style={styles.buttonText}>Absent</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  teacherItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
  },
  buttonInactive: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
});
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WebViewBridge from './bridge';

const App = () => {
  return (
    <SafeAreaProvider>
      <WebViewBridge />
    </SafeAreaProvider>
  );
};

export default App;
