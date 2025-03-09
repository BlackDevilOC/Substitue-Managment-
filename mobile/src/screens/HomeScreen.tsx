import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, Button, IconButton, useTheme, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { useNetwork } from '../context/NetworkContext';
import { format } from 'date-fns';

const HomeScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { isConnected } = useNetwork();
  const { isInitialized, teachersTable, schedulesTable, absencesTable, subsAssignmentsTable } = useDatabase();
  
  const [refreshing, setRefreshing] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const dayOfWeek = format(new Date(), 'EEEE').toLowerCase();

  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [isInitialized]);

  const loadData = async () => {
    try {
      // Get counts
      const teachersList = await teachersTable.getAll();
      setTeachers(teachersList);
      
      // Get today's absences
      const todayAbsences = await absencesTable.getByDate(today);
      setAbsences(todayAbsences);
      
      // Get today's assignments
      const todayAssignments = await subsAssignmentsTable.getByDate(today);
      setAssignments(todayAssignments);
      
      // Get today's schedule
      const daySchedule = await schedulesTable.getByDay(dayOfWeek);
      setTodaySchedule(daySchedule);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const goToAbsenceManagement = () => {
    navigation.navigate('ManageAbsences', { date: today });
  };

  const goToSubstituteAssignment = () => {
    navigation.navigate('SubstituteAssignment', { date: today });
  };

  const goToImportData = () => {
    navigation.navigate('DataImport');
  };

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Initializing database...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header section with date and sync status */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>
          <Text style={[styles.connectionStatus, { color: isConnected ? theme.colors.primary : '#F44336' }]}>
            {isConnected ? 'Online' : 'Offline'} Mode
          </Text>
        </View>
        <IconButton
          icon="refresh"
          size={24}
          onPress={onRefresh}
        />
      </View>
      
      {/* Quick actions */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title>Quick Actions</Title>
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              icon="account-cancel"
              onPress={goToAbsenceManagement}
              style={styles.actionButton}
            >
              Mark Absences
            </Button>
            <Button
              mode="contained"
              icon="account-switch"
              onPress={goToSubstituteAssignment}
              style={styles.actionButton}
            >
              Assign Substitutes
            </Button>
            <Button
              mode="contained"
              icon="file-import"
              onPress={goToImportData}
              style={styles.actionButton}
            >
              Import Data
            </Button>
          </View>
        </Card.Content>
      </Card>
      
      {/* Statistics overview */}
      <View style={styles.statsContainer}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>Teachers</Title>
            <Paragraph style={styles.statNumber}>{teachers.length}</Paragraph>
          </Card.Content>
        </Card>
        
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>Absences Today</Title>
            <Paragraph style={styles.statNumber}>{absences.length}</Paragraph>
          </Card.Content>
        </Card>
        
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>Assignments</Title>
            <Paragraph style={styles.statNumber}>{assignments.length}</Paragraph>
          </Card.Content>
        </Card>
      </View>
      
      {/* Today's absences */}
      <Card style={styles.listCard}>
        <Card.Content>
          <Title>Today's Absences</Title>
          <Divider style={{ marginVertical: 10 }} />
          {absences.length > 0 ? (
            absences.map((absence: any, index: number) => (
              <View key={absence.id || index} style={styles.listItem}>
                <Text style={styles.teacherName}>{absence.teacher_name}</Text>
                <Text style={styles.details}>{absence.notes || 'No notes'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No absences recorded for today</Text>
          )}
        </Card.Content>
        {absences.length > 0 && (
          <Card.Actions>
            <Button
              onPress={goToAbsenceManagement}
            >
              Manage Absences
            </Button>
          </Card.Actions>
        )}
      </Card>
      
      {/* Today's substitute assignments */}
      <Card style={styles.listCard}>
        <Card.Content>
          <Title>Today's Substitute Assignments</Title>
          <Divider style={{ marginVertical: 10 }} />
          {assignments.length > 0 ? (
            assignments.map((assignment: any, index: number) => (
              <View key={assignment.id || index} style={styles.listItem}>
                <Text style={styles.teacherName}>
                  {assignment.absent_teacher_name} → {assignment.substitute_teacher_name}
                </Text>
                <Text style={styles.details}>
                  Period {assignment.period}, Class {assignment.class_name}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No substitute assignments for today</Text>
          )}
        </Card.Content>
        {absences.length > 0 && assignments.length < absences.length && (
          <Card.Actions>
            <Button
              onPress={goToSubstituteAssignment}
            >
              Assign Substitutes
            </Button>
          </Card.Actions>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionStatus: {
    fontSize: 14,
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  actionButton: {
    margin: 4,
    flex: 1,
    minWidth: '45%',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  listCard: {
    marginBottom: 16,
    elevation: 2,
  },
  listItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 16,
    fontStyle: 'italic',
  },
});

export default HomeScreen;