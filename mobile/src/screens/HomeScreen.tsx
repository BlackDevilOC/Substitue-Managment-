import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Avatar, Button, Divider, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { useDatabase } from '../context/DatabaseContext';
import { format } from 'date-fns';

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isConnected, lastOnlineAt } = useNetwork();
  const { teachersTable, absencesTable, subsAssignmentsTable, isInitialized } = useDatabase();
  const theme = useTheme();
  
  const [teacherCount, setTeacherCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [substitutions, setSubstitutions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Load dashboard data
  useEffect(() => {
    if (isInitialized) {
      loadDashboardData();
    }
  }, [isInitialized]);
  
  const loadDashboardData = async () => {
    try {
      // Get teacher count
      const teachers = await teachersTable.getAll();
      setTeacherCount(teachers.length);
      
      // Get absent teachers for today
      const absences = await absencesTable.getByDate(today);
      setAbsentCount(absences.length);
      
      // Get today's substitutions
      const subs = await subsAssignmentsTable.getByDate(today);
      setSubstitutions(subs);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome card */}
      <Card style={styles.card}>
        <Card.Content style={styles.welcomeCard}>
          <View>
            <Title>Welcome, {user?.username || 'User'}</Title>
            <Paragraph>Today is {format(new Date(), 'EEEE, MMMM d, yyyy')}</Paragraph>
          </View>
          <Avatar.Icon size={48} icon="account" style={{ backgroundColor: theme.colors.primary }} />
        </Card.Content>
      </Card>
      
      {/* Status indicator */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#4CAF50' : '#FF9800' }]} />
        <Text style={styles.statusText}>
          {isConnected 
            ? 'Online Mode: Changes will sync when possible' 
            : 'Offline Mode: Working with local data only'}
        </Text>
        {!isConnected && lastOnlineAt && (
          <Text style={styles.lastOnlineText}>
            Last online: {format(lastOnlineAt, 'MMM d, h:mm a')}
          </Text>
        )}
      </View>
      
      {/* Stats cards */}
      <View style={styles.statsRow}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.statsNumber}>{teacherCount}</Title>
            <Paragraph>Total Teachers</Paragraph>
          </Card.Content>
        </Card>
        
        <Card style={[styles.statsCard, { marginLeft: 10 }]}>
          <Card.Content>
            <Title style={styles.statsNumber}>{absentCount}</Title>
            <Paragraph>Absent Today</Paragraph>
          </Card.Content>
        </Card>
      </View>
      
      {/* Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Quick Actions</Title>
        </Card.Content>
        <Divider />
        <Card.Actions style={styles.actionsContainer}>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('ManageAbsences')}
            style={styles.actionButton}
          >
            Mark Absences
          </Button>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('SubstituteAssignment')}
            style={styles.actionButton}
          >
            Assign Substitutes
          </Button>
        </Card.Actions>
        <Card.Actions style={styles.actionsContainer}>
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('DataImport')}
            style={styles.actionButton}
          >
            Import Data
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => {/* Add functionality */}}
            style={styles.actionButton}
          >
            Send Notifications
          </Button>
        </Card.Actions>
      </Card>
      
      {/* Today's Substitutions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Today's Substitutions</Title>
          {substitutions.length === 0 ? (
            <Paragraph style={styles.noDataText}>No substitutions assigned for today</Paragraph>
          ) : (
            <View>
              {substitutions.map((sub: any, index: number) => (
                <View key={index} style={styles.substitutionItem}>
                  <Paragraph style={styles.substitutionText}>
                    <Text style={{ fontWeight: 'bold' }}>{sub.substitute_teacher_name}</Text> 
                    {' replacing '} 
                    <Text style={{ fontWeight: 'bold' }}>{sub.absent_teacher_name}</Text>
                  </Paragraph>
                  <Paragraph>Period {sub.period}, Class {sub.class_name}</Paragraph>
                  {index < substitutions.length - 1 && <Divider style={styles.itemDivider} />}
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
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
    elevation: 2,
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    elevation: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  lastOnlineText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    elevation: 2,
  },
  statsNumber: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  substitutionItem: {
    marginVertical: 8,
  },
  substitutionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemDivider: {
    marginVertical: 8,
  },
  noDataText: {
    fontStyle: 'italic',
    marginTop: 8,
    color: '#666',
  },
});

export default HomeScreen;