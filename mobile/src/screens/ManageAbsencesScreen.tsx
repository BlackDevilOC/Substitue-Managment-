import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Button, Checkbox, Divider, TextInput, Text, List, Avatar, Searchbar, Card, Title, RadioButton, Surface } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { format } from 'date-fns';

interface Teacher {
  id: number;
  name: string;
  phone_number?: string;
  is_substitute: number;
}

interface AbsenceRecord {
  teacher_id: number;
  isAbsent: boolean;
  notes: string;
}

const ManageAbsencesScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { teachersTable, absencesTable, isInitialized } = useDatabase();
  
  // Get date from params or use today
  // @ts-ignore - Route params type
  const selectedDate = route.params?.date || new Date().toISOString().split('T')[0];
  const formattedDate = format(new Date(selectedDate), 'EEEE, MMMM d, yyyy');
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [absenceRecords, setAbsenceRecords] = useState<Map<number, AbsenceRecord>>(new Map());
  const [savingData, setSavingData] = useState(false);
  
  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [isInitialized]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all teachers
      const allTeachers = await teachersTable.getAll();
      
      // Sort by name
      const sortedTeachers = [...allTeachers].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setTeachers(sortedTeachers);
      setFilteredTeachers(sortedTeachers);
      
      // Load existing absences for this date
      const existingAbsences = await absencesTable.getByDate(selectedDate);
      
      // Create absence records map
      const recordsMap = new Map<number, AbsenceRecord>();
      
      // Initialize all teachers as present
      sortedTeachers.forEach(teacher => {
        recordsMap.set(teacher.id, {
          teacher_id: teacher.id,
          isAbsent: false,
          notes: ''
        });
      });
      
      // Update with existing absences
      existingAbsences.forEach(absence => {
        recordsMap.set(absence.teacher_id, {
          teacher_id: absence.teacher_id,
          isAbsent: absence.status === 'absent',
          notes: absence.notes || ''
        });
      });
      
      setAbsenceRecords(recordsMap);
      setLoading(false);
    } catch (error) {
      console.error('Error loading teacher data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load teacher data');
    }
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredTeachers(teachers);
    } else {
      const filtered = teachers.filter(teacher => 
        teacher.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTeachers(filtered);
    }
  };
  
  const handleToggleAbsence = (teacherId: number) => {
    setAbsenceRecords(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(teacherId);
      
      if (current) {
        newMap.set(teacherId, {
          ...current,
          isAbsent: !current.isAbsent
        });
      }
      
      return newMap;
    });
  };
  
  const handleNoteChange = (teacherId: number, note: string) => {
    setAbsenceRecords(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(teacherId);
      
      if (current) {
        newMap.set(teacherId, {
          ...current,
          notes: note
        });
      }
      
      return newMap;
    });
  };
  
  const handleSave = async () => {
    try {
      setSavingData(true);
      
      // Get existing absences for this date to know what to update/delete
      const existingAbsences = await absencesTable.getByDate(selectedDate);
      const existingMap = new Map();
      existingAbsences.forEach(absence => {
        existingMap.set(absence.teacher_id, absence);
      });
      
      // Process each teacher's absence record
      for (const [teacherId, record] of absenceRecords.entries()) {
        const existing = existingMap.get(teacherId);
        
        if (record.isAbsent) {
          // Teacher is marked as absent
          if (existing) {
            // Update existing record
            await absencesTable.update({
              id: existing.id,
              teacher_id: teacherId,
              date: selectedDate,
              status: 'absent',
              notes: record.notes
            });
          } else {
            // Create new absence record
            await absencesTable.create({
              teacher_id: teacherId,
              date: selectedDate,
              status: 'absent',
              notes: record.notes
            });
          }
        } else if (existing) {
          // Teacher is present but had an absence record - delete it
          await absencesTable.remove(existing.id);
        }
      }
      
      Alert.alert(
        'Success',
        'Attendance records saved successfully',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // If there are absences, ask if they want to assign substitutes
              const absentCount = Array.from(absenceRecords.values()).filter(r => r.isAbsent).length;
              
              if (absentCount > 0) {
                Alert.alert(
                  'Assign Substitutes',
                  `${absentCount} teacher(s) marked absent. Would you like to assign substitutes now?`,
                  [
                    { text: 'Not Now', style: 'cancel' },
                    { 
                      text: 'Assign Substitutes', 
                      onPress: () => navigation.navigate('SubstituteAssignment', { date: selectedDate })
                    }
                  ]
                );
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      );
      
      setSavingData(false);
    } catch (error) {
      console.error('Error saving absence records:', error);
      Alert.alert('Error', 'Failed to save attendance records');
      setSavingData(false);
    }
  };
  
  const renderTeacherItem = ({ item }: { item: Teacher }) => {
    const record = absenceRecords.get(item.id);
    const isAbsent = record?.isAbsent || false;
    
    return (
      <Surface style={[styles.teacherItem, isAbsent && styles.absentTeacherItem]}>
        <View style={styles.checkboxContainer}>
          <Checkbox
            status={isAbsent ? 'checked' : 'unchecked'}
            onPress={() => handleToggleAbsence(item.id)}
          />
        </View>
        
        <View style={styles.teacherInfoContainer}>
          <Text style={styles.teacherName}>{item.name}</Text>
          {isAbsent && (
            <TextInput
              placeholder="Reason for absence (optional)"
              value={record?.notes || ''}
              onChangeText={(text) => handleNoteChange(item.id, text)}
              style={styles.notesInput}
              mode="outlined"
              dense
            />
          )}
        </View>
      </Surface>
    );
  };
  
  return (
    <View style={styles.container}>
      <Card style={styles.dateCard}>
        <Card.Content>
          <Title>Attendance for {formattedDate}</Title>
        </Card.Content>
      </Card>
      
      <Searchbar
        placeholder="Search teachers..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <Text style={styles.instructionText}>
        Select teachers who are absent today:
      </Text>
      
      <FlatList
        data={filteredTeachers}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTeacherItem}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadData}
      />
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleSave}
          style={styles.saveButton}
          loading={savingData}
          disabled={savingData}
        >
          Save Attendance
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  dateCard: {
    margin: 16,
    marginBottom: 8,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  instructionText: {
    marginHorizontal: 16,
    marginBottom: 8,
    color: '#666',
  },
  listContent: {
    paddingBottom: 100,
  },
  teacherItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
  },
  absentTeacherItem: {
    backgroundColor: '#FFEBEE',
  },
  checkboxContainer: {
    justifyContent: 'center',
    marginRight: 8,
  },
  teacherInfoContainer: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    marginBottom: 4,
  },
  notesInput: {
    marginTop: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 4,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 2,
  },
});

export default ManageAbsencesScreen;