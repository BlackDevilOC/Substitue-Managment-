import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Card, Text, Button, FAB, ActivityIndicator, useTheme, Chip, Menu, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { useDatabase } from '../context/DatabaseContext';

interface Absence {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  date: string;
  status: string;
  notes?: string;
}

const AbsencesScreen = () => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [filteredAbsences, setFilteredAbsences] = useState<Absence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  
  const navigation = useNavigation<any>();
  const { absencesTable } = useDatabase();
  const theme = useTheme();

  useEffect(() => {
    loadAbsences();
  }, []);

  const loadAbsences = async () => {
    try {
      setIsLoading(true);
      const allAbsences = await absencesTable.getAll();
      setAbsences(allAbsences);
      applyFilter(allAbsences, filterType);
    } catch (error) {
      console.error('Error loading absences:', error);
      Alert.alert('Error', 'Failed to load absences');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (data: Absence[], filter: 'all' | 'today' | 'upcoming' | 'past') => {
    let filtered = [...data];
    const now = new Date();
    
    switch (filter) {
      case 'today':
        filtered = filtered.filter(absence => 
          isToday(parseISO(absence.date))
        );
        break;
      case 'upcoming':
        filtered = filtered.filter(absence => 
          !isPast(parseISO(absence.date)) && !isToday(parseISO(absence.date))
        );
        break;
      case 'past':
        filtered = filtered.filter(absence => 
          isPast(parseISO(absence.date)) && !isToday(parseISO(absence.date))
        );
        break;
      default:
        // All absences, no filtering
        break;
    }
    
    // Sort by date (most recent first)
    filtered.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setFilteredAbsences(filtered);
    setFilterType(filter);
  };

  const handleCreateAbsence = () => {
    navigation.navigate('ManageAbsences', { date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleAssignSubstitute = () => {
    navigation.navigate('SubstituteAssignment', { date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleAbsenceOptions = (absence: Absence) => {
    setSelectedAbsence(absence);
    setMenuVisible(true);
  };

  const handleDeleteAbsence = async (absenceId: number) => {
    try {
      await absencesTable.remove(absenceId);
      loadAbsences();
      Alert.alert('Success', 'Absence record deleted');
    } catch (error) {
      console.error('Error deleting absence:', error);
      Alert.alert('Error', 'Failed to delete absence record');
    }
  };

  const confirmDelete = (absence: Absence) => {
    Alert.alert(
      'Delete Absence',
      `Are you sure you want to delete ${absence.teacher_name}'s absence on ${format(new Date(absence.date), 'MMM dd, yyyy')}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteAbsence(absence.id),
        },
      ],
      { cancelable: true }
    );
  };

  const renderAbsenceItem = ({ item }: { item: Absence }) => {
    const absenceDate = new Date(item.date);
    const isPastAbsence = isPast(absenceDate) && !isToday(absenceDate);
    
    return (
      <Card 
        style={[
          styles.absenceCard, 
          isPastAbsence && styles.pastAbsenceCard
        ]}
      >
        <Card.Content>
          <View style={styles.absenceHeader}>
            <View>
              <Text style={styles.dateText}>{format(absenceDate, 'EEEE, MMMM d, yyyy')}</Text>
              {isToday(absenceDate) && (
                <Chip 
                  style={{ 
                    alignSelf: 'flex-start', 
                    marginTop: 4,
                    backgroundColor: theme.colors.primary + '20'
                  }}
                  textStyle={{ fontSize: 12 }}
                >
                  Today
                </Chip>
              )}
            </View>
            
            <IconButton
              icon="dots-vertical"
              size={20}
              onPress={() => handleAbsenceOptions(item)}
            />
          </View>
          
          <View style={styles.absenceDetails}>
            <Text style={styles.teacherName}>{item.teacher_name}</Text>
            {item.notes && (
              <Text style={styles.notes}>{item.notes}</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyList = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No absence records found</Text>
        <Button 
          mode="outlined" 
          onPress={handleCreateAbsence}
          style={{ marginTop: 16 }}
        >
          Mark a Teacher Absent
        </Button>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16 }}>Loading absences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Button
          mode={filterType === 'all' ? 'contained' : 'outlined'}
          onPress={() => applyFilter(absences, 'all')}
          style={styles.filterButton}
        >
          All
        </Button>
        <Button
          mode={filterType === 'today' ? 'contained' : 'outlined'}
          onPress={() => applyFilter(absences, 'today')}
          style={styles.filterButton}
        >
          Today
        </Button>
        <Button
          mode={filterType === 'upcoming' ? 'contained' : 'outlined'}
          onPress={() => applyFilter(absences, 'upcoming')}
          style={styles.filterButton}
        >
          Upcoming
        </Button>
        <Button
          mode={filterType === 'past' ? 'contained' : 'outlined'}
          onPress={() => applyFilter(absences, 'past')}
          style={styles.filterButton}
        >
          Past
        </Button>
      </View>
      
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredAbsences.length} absence {filteredAbsences.length === 1 ? 'record' : 'records'}
        </Text>
        <Button 
          mode="outlined" 
          icon="refresh"
          onPress={loadAbsences}
          compact
        >
          Refresh
        </Button>
      </View>
      
      <FlatList
        data={filteredAbsences}
        renderItem={renderAbsenceItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
      />

      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          icon="account-switch"
          onPress={handleAssignSubstitute}
          style={[styles.actionButton, { marginRight: 8 }]}
        >
          Assign Substitutes
        </Button>
        <Button
          mode="contained"
          icon="calendar-plus"
          onPress={handleCreateAbsence}
          style={styles.actionButton}
        >
          Mark Absences
        </Button>
      </View>
      
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: 0, y: 0 }} // This gets overridden by the pressable position
      >
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            if (selectedAbsence) {
              navigation.navigate('ManageAbsences', { 
                date: selectedAbsence.date,
                teacherId: selectedAbsence.teacher_id 
              });
            }
          }}
          title="Edit"
          leadingIcon="pencil"
        />
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            if (selectedAbsence) {
              navigation.navigate('SubstituteAssignment', { 
                date: selectedAbsence.date,
                teacherId: selectedAbsence.teacher_id 
              });
            }
          }}
          title="Assign Substitute"
          leadingIcon="account-switch"
        />
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            if (selectedAbsence) {
              confirmDelete(selectedAbsence);
            }
          }}
          title="Delete"
          leadingIcon="delete"
        />
      </Menu>
    </View>
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80, // Space for action buttons
  },
  absenceCard: {
    marginBottom: 12,
    elevation: 2,
  },
  pastAbsenceCard: {
    opacity: 0.7,
  },
  absenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  absenceDetails: {
    marginTop: 8,
  },
  teacherName: {
    fontSize: 16,
    marginBottom: 4,
  },
  notes: {
    fontStyle: 'italic',
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
  },
});

export default AbsencesScreen;