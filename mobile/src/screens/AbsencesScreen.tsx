import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text, List, Chip, FAB, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { format, isToday, parseISO } from 'date-fns';

interface Absence {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  date: string;
  status: string;
  notes?: string;
}

interface Teacher {
  id: number;
  name: string;
}

const AbsencesScreen = () => {
  const navigation = useNavigation<any>();
  const { absencesTable, teachersTable, isInitialized } = useDatabase();
  
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [teachers, setTeachers] = useState<Map<number, Teacher>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupedAbsences, setGroupedAbsences] = useState<Map<string, Absence[]>>(new Map());
  
  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [isInitialized]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all teachers for reference
      const allTeachers = await teachersTable.getAll();
      const teacherMap = new Map();
      allTeachers.forEach(teacher => {
        teacherMap.set(teacher.id, teacher);
      });
      setTeachers(teacherMap);
      
      // Load all absences
      const allAbsences = await absencesTable.getAll();
      
      // Add teacher name to each absence
      const absencesWithTeacherNames = allAbsences.map(absence => ({
        ...absence,
        teacher_name: teacherMap.get(absence.teacher_id)?.name || 'Unknown Teacher'
      }));
      
      setAbsences(absencesWithTeacherNames);
      
      // Group absences by date
      const groupedByDate = new Map<string, Absence[]>();
      absencesWithTeacherNames.forEach(absence => {
        const date = absence.date;
        if (!groupedByDate.has(date)) {
          groupedByDate.set(date, []);
        }
        groupedByDate.get(date)?.push(absence);
      });
      
      // Sort dates in descending order
      const sortedDates = [...groupedByDate.keys()].sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );
      
      const sortedGrouped = new Map<string, Absence[]>();
      sortedDates.forEach(date => {
        sortedGrouped.set(date, groupedByDate.get(date) || []);
      });
      
      setGroupedAbsences(sortedGrouped);
      setLoading(false);
    } catch (error) {
      console.error('Error loading absences:', error);
      setLoading(false);
    }
  };
  
  const renderDateSection = ({ item }: { item: [string, Absence[]] }) => {
    const [date, dateAbsences] = item;
    
    // Check if this is today
    const isCurrentDay = isToday(parseISO(date));
    
    return (
      <Card style={[styles.dateCard, isCurrentDay && styles.todayCard]}>
        <Card.Content>
          <View style={styles.dateHeaderContainer}>
            <View>
              <Title style={styles.dateTitle}>
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </Title>
              {isCurrentDay && <Chip style={styles.todayChip}>Today</Chip>}
            </View>
            <Text style={styles.absenceCount}>
              {dateAbsences.length} {dateAbsences.length === 1 ? 'Absence' : 'Absences'}
            </Text>
          </View>
          
          <Divider style={styles.divider} />
          
          {dateAbsences.map((absence, index) => (
            <View key={absence.id}>
              <List.Item
                title={absence.teacher_name}
                description={absence.notes || 'No additional notes'}
                left={props => <List.Icon {...props} icon="account-off" />}
                right={props => (
                  <IconButton
                    {...props}
                    icon="dots-vertical"
                    onPress={() => handleAbsenceOptions(absence)}
                  />
                )}
              />
              {index < dateAbsences.length - 1 && <Divider />}
            </View>
          ))}
        </Card.Content>
        <Card.Actions>
          {isCurrentDay && (
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('SubstituteAssignment', { date })}
              style={styles.assignButton}
            >
              Assign Substitutes
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };
  
  const handleAbsenceOptions = (absence: Absence) => {
    // Show options for this absence
    // This could be a modal or action sheet in a real app
    console.log('Absence options for:', absence);
  };
  
  return (
    <View style={styles.container}>
      <FlatList
        data={Array.from(groupedAbsences.entries())}
        keyExtractor={([date]) => date}
        renderItem={renderDateSection}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No absences recorded</Text>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('ManageAbsences')}
              style={styles.emptyButton}
            >
              Record Absences
            </Button>
          </View>
        }
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('ManageAbsences')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  dateCard: {
    marginBottom: 16,
  },
  todayCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#8A4FFF',
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dateTitle: {
    fontSize: 16,
  },
  absenceCount: {
    color: '#666',
  },
  todayChip: {
    marginTop: 4,
    backgroundColor: '#8A4FFF',
    width: 80,
  },
  divider: {
    marginVertical: 8,
  },
  assignButton: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyButton: {
    width: 200,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#8A4FFF',
  },
});

export default AbsencesScreen;