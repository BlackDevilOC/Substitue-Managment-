import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, Linking, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Card, Title, Paragraph, List, Divider, Text, Surface, IconButton, Chip, Dialog, Portal, RadioButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { format } from 'date-fns';

interface Teacher {
  id: number;
  name: string;
  phone_number?: string;
  is_substitute: number;
  grade_level: number;
}

interface TeacherSchedule {
  id: number;
  teacher_id: number;
  day: string;
  period: number;
  class_name: string;
}

interface SubstituteAssignment {
  id?: number;
  absent_teacher_id: number;
  substitute_teacher_id: number;
  date: string;
  period: number;
  class_name: string;
}

const SubstituteAssignmentScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { teachersTable, schedulesTable, absencesTable, subsAssignmentsTable, isInitialized } = useDatabase();
  
  // Get date from params or use today
  // @ts-ignore - Route params type
  const selectedDate = route.params?.date || new Date().toISOString().split('T')[0];
  const formattedDate = format(new Date(selectedDate), 'EEEE, MMMM d, yyyy');
  const dayOfWeek = format(new Date(selectedDate), 'EEEE').toLowerCase();
  
  const [loading, setLoading] = useState(true);
  const [absentTeachers, setAbsentTeachers] = useState<Teacher[]>([]);
  const [availableSubstitutes, setAvailableSubstitutes] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<SubstituteAssignment[]>([]);
  const [schedules, setSchedules] = useState<Map<number, TeacherSchedule[]>>(new Map());
  const [dialogVisible, setDialogVisible] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<{
    absentTeacher: Teacher;
    period: number;
    className: string;
    substituteId?: number;
  } | null>(null);
  
  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [isInitialized]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get absent teachers for the selected date
      const absences = await absencesTable.getByDate(selectedDate);
      
      if (absences.length === 0) {
        Alert.alert(
          'No Absences',
          'No teachers are marked absent for this date.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // Load teacher details for absent teachers
      const absentTeacherIds = absences.map(a => a.teacher_id);
      const allTeachers = await teachersTable.getAll();
      
      const absentTeacherList = allTeachers.filter(t => 
        absentTeacherIds.includes(t.id)
      );
      
      setAbsentTeachers(absentTeacherList);
      
      // Load available substitutes (teachers marked as substitutes)
      const substitutes = allTeachers.filter(t => 
        t.is_substitute === 1 && !absentTeacherIds.includes(t.id)
      );
      
      setAvailableSubstitutes(substitutes);
      
      // Load schedules for the current day for absent teachers
      const schedulesMap = new Map<number, TeacherSchedule[]>();
      
      for (const teacher of absentTeacherList) {
        // Get all schedules for this teacher
        const teacherSchedules = await schedulesTable.getByTeacherId(teacher.id);
        
        // Filter for the current day of week
        const daySchedules = teacherSchedules.filter(s => 
          s.day.toLowerCase() === dayOfWeek
        );
        
        schedulesMap.set(teacher.id, daySchedules);
      }
      
      setSchedules(schedulesMap);
      
      // Load existing substitute assignments for this date
      const existingAssignments = await subsAssignmentsTable.getByDate(selectedDate);
      setAssignments(existingAssignments);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading substitute data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load data for substitute assignments');
    }
  };
  
  const handleAssignSubstitute = (absentTeacher: Teacher, period: number, className: string, currentSubstituteId?: number) => {
    setCurrentAssignment({
      absentTeacher,
      period,
      className,
      substituteId: currentSubstituteId
    });
    
    setDialogVisible(true);
  };
  
  const handleConfirmAssignment = async () => {
    if (!currentAssignment) return;
    
    const { absentTeacher, period, className, substituteId } = currentAssignment;
    
    try {
      // Check if this is a new assignment or update
      const existingAssignment = assignments.find(a => 
        a.absent_teacher_id === absentTeacher.id && 
        a.period === period && 
        a.class_name === className
      );
      
      if (existingAssignment) {
        // Update existing assignment
        await subsAssignmentsTable.update({
          ...existingAssignment,
          substitute_teacher_id: substituteId
        });
      } else if (substituteId) {
        // Create new assignment
        await subsAssignmentsTable.create({
          absent_teacher_id: absentTeacher.id,
          substitute_teacher_id: substituteId,
          date: selectedDate,
          period,
          class_name: className
        });
      }
      
      // Reload data
      const updatedAssignments = await subsAssignmentsTable.getByDate(selectedDate);
      setAssignments(updatedAssignments);
      
      setDialogVisible(false);
      setCurrentAssignment(null);
    } catch (error) {
      console.error('Error saving substitute assignment:', error);
      Alert.alert('Error', 'Failed to save substitute assignment');
    }
  };
  
  const handleRemoveAssignment = async (assignment: SubstituteAssignment) => {
    try {
      await subsAssignmentsTable.remove(assignment.id!);
      
      // Update local state
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
    } catch (error) {
      console.error('Error removing substitute assignment:', error);
      Alert.alert('Error', 'Failed to remove substitute assignment');
    }
  };
  
  const handleSendSMS = (phoneNumber: string, message: string) => {
    // Attempt to send SMS using the device
    Linking.openURL(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`);
  };
  
  const renderTeacherCard = (teacher: Teacher) => {
    const teacherSchedules = schedules.get(teacher.id) || [];
    
    return (
      <Card style={styles.teacherCard} key={teacher.id}>
        <Card.Content>
          <Title>{teacher.name}</Title>
          <Paragraph>{teacher.phone_number || 'No phone number'}</Paragraph>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.schedulesTitle}>Schedule for {dayOfWeek}:</Text>
          
          {teacherSchedules.length === 0 ? (
            <Paragraph style={styles.noScheduleText}>No classes scheduled for this day</Paragraph>
          ) : (
            teacherSchedules.map((schedule, index) => {
              // Find if there's an assignment for this period
              const assignment = assignments.find(a => 
                a.absent_teacher_id === teacher.id && 
                a.period === schedule.period &&
                a.class_name === schedule.class_name
              );
              
              // Find the substitute teacher if assigned
              const substitute = assignment 
                ? availableSubstitutes.find(s => s.id === assignment.substitute_teacher_id) 
                : undefined;
              
              return (
                <Surface key={index} style={styles.scheduleItem}>
                  <View style={styles.periodRow}>
                    <View style={styles.periodInfo}>
                      <Text style={styles.periodText}>Period {schedule.period}</Text>
                      <Text style={styles.classText}>Class: {schedule.class_name}</Text>
                    </View>
                    
                    <View style={styles.substituteContainer}>
                      {substitute ? (
                        <>
                          <Chip 
                            style={styles.substituteChip}
                            onClose={() => {
                              if (assignment) {
                                handleRemoveAssignment(assignment);
                              }
                            }}
                          >
                            {substitute.name}
                          </Chip>
                          {substitute.phone_number && (
                            <IconButton 
                              icon="message-text" 
                              size={20}
                              onPress={() => {
                                const message = `You have been assigned to substitute for ${teacher.name}, Period ${schedule.period}, Class ${schedule.class_name} on ${formattedDate}.`;
                                handleSendSMS(substitute.phone_number || '', message);
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <Button 
                          mode="outlined" 
                          onPress={() => handleAssignSubstitute(teacher, schedule.period, schedule.class_name)}
                        >
                          Assign
                        </Button>
                      )}
                    </View>
                  </View>
                </Surface>
              );
            })
          )}
        </Card.Content>
      </Card>
    );
  };
  
  const renderSubstituteDialog = () => {
    if (!currentAssignment) return null;
    
    const { absentTeacher, period, className, substituteId } = currentAssignment;
    const [selectedSubstitute, setSelectedSubstitute] = useState<number | undefined>(substituteId);
    
    return (
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Assign Substitute</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogInfo}>
              Assigning substitute for:
            </Paragraph>
            <Paragraph style={styles.dialogHighlight}>
              {absentTeacher.name}
            </Paragraph>
            <Paragraph style={styles.dialogInfo}>
              Period {period}, Class {className}
            </Paragraph>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.dialogSubheader}>Available Substitutes:</Text>
            
            <RadioButton.Group 
              onValueChange={value => setSelectedSubstitute(Number(value))} 
              value={selectedSubstitute?.toString() || ''}
            >
              <ScrollView style={styles.substitutesList}>
                {availableSubstitutes.length === 0 ? (
                  <Paragraph style={styles.noSubstitutesText}>No substitutes available</Paragraph>
                ) : (
                  availableSubstitutes.map(sub => (
                    <TouchableOpacity 
                      key={sub.id} 
                      style={styles.substituteOption}
                      onPress={() => setSelectedSubstitute(sub.id)}
                    >
                      <RadioButton value={sub.id.toString()} />
                      <View style={styles.substituteDetails}>
                        <Text style={styles.substituteText}>{sub.name}</Text>
                        <Text style={styles.substitutePhone}>{sub.phone_number || 'No phone'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={() => {
                setCurrentAssignment({
                  ...currentAssignment,
                  substituteId: selectedSubstitute
                });
                handleConfirmAssignment();
              }}
              disabled={!selectedSubstitute}
            >
              Assign
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };
  
  return (
    <View style={styles.container}>
      <Card style={styles.dateCard}>
        <Card.Content>
          <Title>Assign Substitutes</Title>
          <Paragraph>{formattedDate}</Paragraph>
        </Card.Content>
      </Card>
      
      <ScrollView 
        style={styles.scrollContent}
        refreshing={loading}
        onRefresh={loadData}
      >
        {absentTeachers.map(renderTeacherCard)}
        
        {absentTeachers.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No absent teachers for this date</Text>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('ManageAbsences')}
              style={styles.emptyButton}
            >
              Mark Absences
            </Button>
          </View>
        )}
      </ScrollView>
      
      {renderSubstituteDialog()}
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
        >
          Done
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  teacherCard: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 12,
  },
  schedulesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noScheduleText: {
    fontStyle: 'italic',
    color: '#666',
  },
  scheduleItem: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodInfo: {
    flex: 1,
  },
  periodText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  classText: {
    fontSize: 14,
    color: '#666',
  },
  substituteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  substituteChip: {
    backgroundColor: '#E3F2FD',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyButton: {
    width: 200,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 4,
  },
  doneButton: {
    width: '100%',
  },
  dialogInfo: {
    marginBottom: 4,
  },
  dialogHighlight: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  dialogSubheader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  substitutesList: {
    maxHeight: 300,
  },
  substituteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  substituteDetails: {
    marginLeft: 8,
  },
  substituteText: {
    fontSize: 15,
  },
  substitutePhone: {
    fontSize: 13,
    color: '#666',
  },
  noSubstitutesText: {
    fontStyle: 'italic',
    color: '#666',
  },
});

export default SubstituteAssignmentScreen;