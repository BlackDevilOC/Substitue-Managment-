import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Avatar, Button, Badge, List, Divider, useTheme, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDatabase } from '../context/DatabaseContext';

interface TeacherSchedule {
  id: number;
  teacher_id: number;
  day: string;
  period: number;
  class_name: string;
}

const TeacherDetailScreen = () => {
  const [teacher, setTeacher] = useState<any>(null);
  const [schedule, setSchedule] = useState<TeacherSchedule[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { teachersTable, schedulesTable, absencesTable } = useDatabase();
  const theme = useTheme();
  
  const teacherId = route.params?.teacherId;
  
  useEffect(() => {
    if (teacherId) {
      loadTeacherData();
    }
  }, [teacherId]);
  
  const loadTeacherData = async () => {
    try {
      setIsLoading(true);
      
      // Load teacher details
      const teacherData = await teachersTable.getById(teacherId);
      setTeacher(teacherData);
      
      // Load schedule
      const scheduleData = await schedulesTable.getByTeacherId(teacherId);
      setSchedule(scheduleData);
      
      // Load absences
      const absenceData = await absencesTable.getByTeacherId(teacherId);
      setAbsences(absenceData);
      
    } catch (error) {
      console.error('Error loading teacher data:', error);
      Alert.alert('Error', 'Failed to load teacher data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAbsent = () => {
    navigation.navigate('ManageAbsences', {
      date: format(new Date(), 'yyyy-MM-dd'),
      teacherId: teacherId,
    });
  };

  const handleAssignSubstitute = () => {
    navigation.navigate('SubstituteAssignment', {
      date: format(new Date(), 'yyyy-MM-dd'),
      teacherId: teacherId,
    });
  };

  const handleEditTeacher = () => {
    // Navigate to edit teacher form (in real app)
    Alert.alert(
      'Edit Teacher',
      'This functionality would allow editing the teacher details'
    );
  };

  const handleDeleteTeacher = () => {
    Alert.alert(
      'Delete Teacher',
      'Are you sure you want to delete this teacher? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await teachersTable.remove(teacherId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting teacher:', error);
              Alert.alert('Error', 'Failed to delete teacher');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderDaySchedules = (day: string) => {
    const daySchedules = schedule.filter(s => s.day.toLowerCase() === day.toLowerCase());
    const isExpanded = expandedDay === day;
    
    if (daySchedules.length === 0) {
      return null;
    }
    
    return (
      <List.Accordion
        title={day.charAt(0).toUpperCase() + day.slice(1)}
        left={props => <List.Icon {...props} icon="calendar-day" />}
        expanded={isExpanded}
        onPress={() => setExpandedDay(isExpanded ? null : day)}
        style={styles.accordionHeader}
      >
        {daySchedules
          .sort((a, b) => a.period - b.period)
          .map((scheduleItem, index) => (
            <List.Item
              key={index}
              title={`Period ${scheduleItem.period}`}
              description={scheduleItem.class_name}
              left={props => (
                <Badge
                  {...props}
                  style={[styles.periodBadge, { backgroundColor: theme.colors.primary }]}
                >
                  {scheduleItem.period}
                </Badge>
              )}
              style={styles.scheduleItem}
            />
          ))}
      </List.Accordion>
    );
  };

  if (isLoading || !teacher) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading teacher data...</Text>
      </View>
    );
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={80}
            label={teacher.name.substring(0, 2).toUpperCase()}
            style={{
              backgroundColor: teacher.is_substitute === 1
                ? theme.colors.accent
                : theme.colors.primary
            }}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.teacherName}>{teacher.name}</Text>
            {teacher.is_substitute === 1 && (
              <Badge style={styles.substituteBadge}>Substitute</Badge>
            )}
            {teacher.phone_number && (
              <View style={styles.phoneContainer}>
                <MaterialCommunityIcons name="phone" size={16} color="#666" />
                <Text style={styles.phoneText}>{teacher.phone_number}</Text>
              </View>
            )}
          </View>
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            icon="calendar-minus"
            onPress={handleMarkAbsent}
            style={styles.actionButton}
          >
            Mark Absent
          </Button>
          {teacher.is_substitute === 1 && (
            <Button
              mode="outlined"
              icon="account-switch"
              onPress={handleAssignSubstitute}
              style={styles.actionButton}
            >
              Assign
            </Button>
          )}
        </Card.Actions>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Title title="Schedule" />
        <Card.Content>
          {schedule.length === 0 ? (
            <Text>No schedule information available</Text>
          ) : (
            <List.Section>
              {days.map(day => renderDaySchedules(day))}
            </List.Section>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Title title="Recent Absences" />
        <Card.Content>
          {absences.length === 0 ? (
            <Text>No absence records</Text>
          ) : (
            absences
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((absence, index) => (
                <View key={index} style={styles.absenceItem}>
                  <View style={styles.absenceDate}>
                    <Text style={styles.absenceDateText}>{format(new Date(absence.date), 'MMM dd')}</Text>
                  </View>
                  <View style={styles.absenceDetails}>
                    <Text>{format(new Date(absence.date), 'EEEE, MMMM d, yyyy')}</Text>
                    {absence.notes && <Text style={styles.absenceNotes}>{absence.notes}</Text>}
                  </View>
                </View>
              ))
          )}
        </Card.Content>
      </Card>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Management Options</Text>
        <View style={styles.dangerButtons}>
          <Button
            mode="outlined"
            icon="account-edit"
            onPress={handleEditTeacher}
            style={styles.dangerButton}
          >
            Edit Teacher
          </Button>
          <Button
            mode="outlined"
            icon="account-remove"
            onPress={handleDeleteTeacher}
            style={[styles.dangerButton, { borderColor: theme.colors.error }]}
            textColor={theme.colors.error}
          >
            Delete Teacher
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    margin: 16,
    elevation: 2,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  teacherName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  substituteBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  phoneText: {
    marginLeft: 4,
    color: '#666',
  },
  actionButton: {
    flex: 1,
    margin: 4,
  },
  sectionCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  accordionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scheduleItem: {
    paddingLeft: 16,
  },
  periodBadge: {
    marginRight: 8,
    paddingHorizontal: 8,
    alignSelf: 'center',
  },
  absenceItem: {
    flexDirection: 'row',
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  absenceDate: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absenceDateText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  absenceDetails: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  absenceNotes: {
    fontStyle: 'italic',
    marginTop: 4,
    color: '#666',
  },
  dangerZone: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dangerZoneTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dangerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dangerButton: {
    flex: 1,
    margin: 4,
  },
});

export default TeacherDetailScreen;