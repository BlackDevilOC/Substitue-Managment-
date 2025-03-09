import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Paragraph, TextInput, Button, Divider, List, Switch, Text, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TeacherSchedule {
  id: number;
  teacher_id: number;
  day: string;
  period: number;
  class_name: string;
}

const TeacherDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { teachersTable, schedulesTable, isInitialized } = useDatabase();
  const theme = useTheme();
  
  // @ts-ignore - Route params type
  const { teacherId } = route.params;
  const isNewTeacher = teacherId === 'new';
  
  const [teacher, setTeacher] = useState({
    id: 0,
    name: '',
    phone_number: '',
    is_substitute: 0,
    grade_level: 0
  });
  
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isInitialized && !isNewTeacher) {
      loadTeacherData();
    }
  }, [isInitialized, teacherId]);
  
  const loadTeacherData = async () => {
    try {
      setLoading(true);
      
      // Get teacher details
      const teacherData = await teachersTable.getById(Number(teacherId));
      if (teacherData) {
        setTeacher(teacherData);
        
        // Get teacher's schedule
        const scheduleData = await schedulesTable.getByTeacherId(Number(teacherId));
        setSchedules(scheduleData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading teacher data:', error);
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      // Validate required fields
      if (!teacher.name.trim()) {
        Alert.alert('Validation Error', 'Teacher name is required');
        return;
      }
      
      setLoading(true);
      
      if (isNewTeacher) {
        // Create new teacher
        const newTeacher = await teachersTable.create({
          name: teacher.name,
          phone_number: teacher.phone_number,
          is_substitute: teacher.is_substitute,
          grade_level: teacher.grade_level
        });
        
        Alert.alert('Success', 'Teacher created successfully');
        navigation.goBack();
      } else {
        // Update existing teacher
        await teachersTable.update(teacher);
        Alert.alert('Success', 'Teacher updated successfully');
        navigation.goBack();
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error saving teacher:', error);
      Alert.alert('Error', 'Failed to save teacher information');
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this teacher? This will also delete all associated schedules and absences.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              await teachersTable.remove(teacher.id);
              
              Alert.alert('Success', 'Teacher deleted successfully');
              navigation.goBack();
              
              setLoading(false);
            } catch (error) {
              console.error('Error deleting teacher:', error);
              Alert.alert('Error', 'Failed to delete teacher');
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const handleInputChange = (name: string, value: any) => {
    setTeacher(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const getDayLabel = (day: string) => {
    // Format the day for display (e.g., 'monday' -> 'Monday')
    return day.charAt(0).toUpperCase() + day.slice(1);
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{isNewTeacher ? 'Add New Teacher' : 'Edit Teacher'}</Title>
          
          <TextInput
            label="Teacher Name"
            value={teacher.name}
            onChangeText={(value) => handleInputChange('name', value)}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Phone Number"
            value={teacher.phone_number}
            onChangeText={(value) => handleInputChange('phone_number', value)}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
          />
          
          <TextInput
            label="Grade Level"
            value={teacher.grade_level.toString()}
            onChangeText={(value) => handleInputChange('grade_level', parseInt(value) || 0)}
            mode="outlined"
            style={styles.input}
            keyboardType="number-pad"
          />
          
          <View style={styles.switchContainer}>
            <Text>Substitute Teacher</Text>
            <Switch
              value={!!teacher.is_substitute}
              onValueChange={(value) => handleInputChange('is_substitute', value ? 1 : 0)}
              color={theme.colors.primary}
            />
          </View>
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="outlined" 
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSave}
            style={styles.actionButton}
            loading={loading}
          >
            Save
          </Button>
        </Card.Actions>
      </Card>
      
      {!isNewTeacher && (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Title>Schedule</Title>
              {schedules.length === 0 ? (
                <Paragraph style={styles.noDataText}>No schedule entries found</Paragraph>
              ) : (
                <View>
                  {schedules.map((schedule, index) => (
                    <View key={index}>
                      <List.Item
                        title={`${getDayLabel(schedule.day)} - Period ${schedule.period}`}
                        description={`Class: ${schedule.class_name}`}
                        left={props => (
                          <List.Icon {...props} icon="calendar" />
                        )}
                      />
                      {index < schedules.length - 1 && <Divider />}
                    </View>
                  ))}
                </View>
              )}
            </Card.Content>
            <Card.Actions>
              <Button 
                mode="outlined" 
                onPress={() => {/* Navigate to schedule editor */}}
              >
                Edit Schedule
              </Button>
            </Card.Actions>
          </Card>
          
          <View style={styles.deleteContainer}>
            <Button 
              mode="contained" 
              onPress={handleDelete}
              style={styles.deleteButton}
              icon={({size, color}) => (
                <MaterialCommunityIcons name="delete" size={size} color={color} />
              )}
            >
              Delete Teacher
            </Button>
          </View>
        </>
      )}
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
  input: {
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    marginLeft: 8,
  },
  noDataText: {
    fontStyle: 'italic',
    marginTop: 8,
    color: '#666',
  },
  deleteContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
});

export default TeacherDetailScreen;