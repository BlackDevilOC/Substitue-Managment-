import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Searchbar, List, Avatar, Divider, FAB, Text, Badge } from 'react-native-paper';
import { useDatabase } from '../context/DatabaseContext';
import { useNavigation } from '@react-navigation/native';

interface Teacher {
  id: number;
  name: string;
  phone_number: string;
  is_substitute: number;
  grade_level: number;
}

const TeachersScreen = () => {
  const navigation = useNavigation<any>();
  const { teachersTable, absencesTable, isInitialized } = useDatabase();
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [absentTeacherIds, setAbsentTeacherIds] = useState<Set<number>>(new Set());
  const [today] = useState(new Date().toISOString().split('T')[0]);
  
  useEffect(() => {
    if (isInitialized) {
      loadTeachers();
    }
  }, [isInitialized]);
  
  const loadTeachers = async () => {
    try {
      setLoading(true);
      
      // Load all teachers
      const allTeachers = await teachersTable.getAll();
      setTeachers(allTeachers);
      setFilteredTeachers(allTeachers);
      
      // Get absent teachers for today
      const absences = await absencesTable.getByDate(today);
      const absentIds = new Set(absences.map(absence => absence.teacher_id));
      setAbsentTeacherIds(absentIds);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading teachers:', error);
      setLoading(false);
    }
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredTeachers(teachers);
    } else {
      const filtered = teachers.filter(teacher => 
        teacher.name.toLowerCase().includes(query.toLowerCase()) ||
        (teacher.phone_number && teacher.phone_number.includes(query))
      );
      setFilteredTeachers(filtered);
    }
  };
  
  const handleTeacherPress = (teacher: Teacher) => {
    navigation.navigate('TeacherDetail', { teacherId: teacher.id });
  };
  
  const renderTeacherItem = ({ item }: { item: Teacher }) => {
    const isAbsent = absentTeacherIds.has(item.id);
    
    return (
      <TouchableOpacity onPress={() => handleTeacherPress(item)}>
        <List.Item
          title={item.name}
          description={item.phone_number || 'No phone number'}
          left={props => (
            <View style={styles.avatarContainer}>
              <Avatar.Text 
                size={40} 
                label={item.name.split(' ').map(n => n[0]).join('')} 
                {...props} 
              />
              {item.is_substitute === 1 && (
                <Badge style={styles.substituteBadge}>Sub</Badge>
              )}
            </View>
          )}
          right={props => 
            isAbsent ? (
              <View style={styles.statusContainer}>
                <Badge size={12} style={styles.absentBadge} />
                <Text style={styles.statusText}>Absent Today</Text>
              </View>
            ) : null
          }
          style={[
            styles.teacherItem, 
            isAbsent && styles.absentTeacher
          ]}
        />
        <Divider />
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search teachers..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <FlatList
        data={filteredTeachers}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTeacherItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadTeachers}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No teachers found</Text>
          </View>
        }
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('TeacherDetail', { teacherId: 'new' })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 80,
  },
  teacherItem: {
    backgroundColor: 'white',
  },
  absentTeacher: {
    backgroundColor: '#FFEBEE',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 8,
  },
  substituteBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#8A4FFF',
    fontSize: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  absentBadge: {
    backgroundColor: '#F44336',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#F44336',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#8A4FFF',
  },
});

export default TeachersScreen;