import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Chip, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { useNetwork } from '../context/NetworkContext';

const HomeScreen = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [absentTeachers, setAbsentTeachers] = useState<any[]>([]);
  const [substitutesNeeded, setSubstitutesNeeded] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDay, setCurrentDay] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { teachersTable, schedulesTable, absencesTable, subsAssignmentsTable } = useDatabase();
  const { isConnected, syncStatus, syncData } = useNetwork();
  const theme = useTheme();

  useEffect(() => {
    loadData();
    
    // Set current day and date
    const date = new Date();
    setCurrentDay(format(date, 'EEEE').toLowerCase());
    setCurrentDate(format(date, 'yyyy-MM-dd'));
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load teachers
      const allTeachers = await teachersTable.getAll();
      setTeachers(allTeachers);
      
      // Load absences for today
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayAbsences = await absencesTable.getByDate(today);
      setAbsentTeachers(todayAbsences);
      
      // Load schedule for today
      const day = format(new Date(), 'EEEE').toLowerCase();
      const daySchedule = await schedulesTable.getByDay(day);
      setTodaySchedule(daySchedule);
      
      // Find which absences need substitutes
      const assignments = await subsAssignmentsTable.getByDate(today);
      const assignedTeacherIds = assignments.map(a => a.absent_teacher_id);
      
      const needSubstitutes = todayAbsences.filter(
        absence => !assignedTeacherIds.includes(absence.teacher_id)
      );
      setSubstitutesNeeded(needSubstitutes);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleManageAbsences = () => {
    navigation.navigate('ManageAbsences', { date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleAssignSubstitutes = () => {
    navigation.navigate('SubstituteAssignment', { date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleImportData = () => {
    navigation.navigate('DataImport');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerDate}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Text>
        <Chip 
          icon={isConnected ? "wifi" : "wifi-off"}
          style={{
            backgroundColor: isConnected 
              ? theme.colors.successGreen 
              : theme.colors.error + '20'
          }}
        >
          {isConnected ? "Online" : "Offline"}
        </Chip>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statValue}>{teachers.length}</Text>
            <Text style={styles.statLabel}>Total Teachers</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statValue}>{absentTeachers.length}</Text>
            <Text style={styles.statLabel}>Absent Today</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={[styles.statValue, {
              color: substitutesNeeded.length > 0 
                ? theme.colors.error 
                : theme.colors.successGreen
            }]}>
              {substitutesNeeded.length}
            </Text>
            <Text style={styles.statLabel}>Need Substitutes</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button 
          mode="contained" 
          icon="calendar-check" 
          style={styles.actionButton}
          onPress={handleManageAbsences}
        >
          Mark Absences
        </Button>
        
        <Button 
          mode="contained" 
          icon="account-switch" 
          style={styles.actionButton}
          onPress={handleAssignSubstitutes}
          disabled={absentTeachers.length === 0}
        >
          Assign Substitutes
        </Button>
        
        <Button 
          mode="outlined" 
          icon="database-import" 
          style={styles.actionButton}
          onPress={handleImportData}
        >
          Import/Export Data
        </Button>
      </View>

      {/* Today's Absences */}
      <Card style={styles.cardContainer}>
        <Card.Title title="Today's Absences" />
        <Card.Content>
          {absentTeachers.length === 0 ? (
            <Text>No absences reported for today.</Text>
          ) : (
            absentTeachers.map((teacher, index) => (
              <Chip 
                key={index}
                style={styles.teacherChip}
                icon="account-cancel"
              >
                {teacher.teacher_name}
              </Chip>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Substitutes Needed */}
      {substitutesNeeded.length > 0 && (
        <Card style={[styles.cardContainer, { borderLeftColor: theme.colors.error, borderLeftWidth: 4 }]}>
          <Card.Title 
            title="Substitutes Needed" 
            titleStyle={{ color: theme.colors.error }}
          />
          <Card.Content>
            <Text style={{ marginBottom: 10 }}>
              The following absent teachers need substitutes assigned:
            </Text>
            {substitutesNeeded.map((teacher, index) => (
              <Chip 
                key={index}
                style={[styles.teacherChip, { backgroundColor: theme.colors.error + '20' }]}
                icon="alert-circle"
              >
                {teacher.teacher_name}
              </Chip>
            ))}
            <Button 
              mode="contained" 
              icon="account-switch" 
              style={{ marginTop: 10, backgroundColor: theme.colors.error }}
              onPress={handleAssignSubstitutes}
            >
              Assign Now
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card style={styles.cardContainer}>
        <Card.Title title={`Today's Schedule (${format(new Date(), 'EEEE')})`} />
        <Card.Content>
          {todaySchedule.length === 0 ? (
            <Text>No classes scheduled for today.</Text>
          ) : (
            todaySchedule.slice(0, 5).map((schedule, index) => (
              <View key={index} style={styles.scheduleItem}>
                <Text style={styles.periodText}>Period {schedule.period}</Text>
                <Text style={styles.classText}>{schedule.class_name}</Text>
                <Text style={styles.teacherText}>{schedule.teacher_name}</Text>
              </View>
            ))
          )}
          {todaySchedule.length > 5 && (
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('ScheduleList', { day: currentDay })}
            >
              View All {todaySchedule.length} Classes
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Sync Status */}
      <Card style={[styles.cardContainer, styles.syncCard]}>
        <Card.Content>
          <View style={styles.syncContainer}>
            <Text>Last synced: {isConnected ? 'Just now' : 'Never'}</Text>
            <Button 
              mode="outlined"
              icon="sync"
              disabled={!isConnected || syncStatus === 'syncing'}
              loading={syncStatus === 'syncing'}
              onPress={syncData}
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </Button>
          </View>
        </Card.Content>
      </Card>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Logged in as {user?.username} • 
          Schedulizer v1.0
        </Text>
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
  loadingText: {
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerDate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  statsCard: {
    width: '31%',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  actionContainer: {
    padding: 16,
  },
  actionButton: {
    marginBottom: 10,
  },
  cardContainer: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
    elevation: 2,
  },
  teacherChip: {
    margin: 4,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  periodText: {
    width: '20%',
    fontWeight: 'bold',
  },
  classText: {
    width: '40%',
  },
  teacherText: {
    width: '40%',
    textAlign: 'right',
    color: '#666',
  },
  syncCard: {
    backgroundColor: '#f9f9f9',
  },
  syncContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
  },
});

export default HomeScreen;