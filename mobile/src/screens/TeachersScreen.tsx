import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text, Card, Avatar, Searchbar, Button, FAB, useTheme, Chip, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';

interface Teacher {
  id: number;
  name: string;
  phone_number: string;
  is_substitute: number;
  grade_level: number;
}

const TeachersScreen = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubstitutes, setFilterSubstitutes] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigation = useNavigation<any>();
  const { teachersTable } = useDatabase();
  const theme = useTheme();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      const allTeachers = await teachersTable.getAll();
      setTeachers(allTeachers);
      setFilteredTeachers(allTeachers);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTeachers = (query: string, substituteFilter: boolean | null) => {
    let filtered = teachers;
    
    // Apply search filter
    if (query) {
      filtered = filtered.filter(teacher => 
        teacher.name.toLowerCase().includes(query.toLowerCase()) ||
        (teacher.phone_number && teacher.phone_number.includes(query))
      );
    }
    
    // Apply substitute filter
    if (substituteFilter !== null) {
      filtered = filtered.filter(teacher => 
        substituteFilter ? teacher.is_substitute === 1 : teacher.is_substitute === 0
      );
    }
    
    setFilteredTeachers(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterTeachers(query, filterSubstitutes);
  };

  const handleTeacherPress = (teacher: Teacher) => {
    navigation.navigate('TeacherDetail', { teacherId: teacher.id });
  };

  const handleAddTeacher = () => {
    // In a complete app, navigate to an "AddTeacher" form
    console.log('Add teacher');
    // For demo, we'll just add a mock teacher directly to the database
    const mockTeacher = {
      name: `New Teacher ${Math.floor(Math.random() * 100)}`,
      phone_number: `+92${Math.floor(Math.random() * 10000000000)}`,
      is_substitute: Math.random() > 0.5 ? 1 : 0,
      grade_level: Math.floor(Math.random() * 12) + 1
    };
    
    teachersTable.create(mockTeacher)
      .then(newTeacher => {
        // Reload the teachers list
        loadTeachers();
      })
      .catch(error => {
        console.error('Error adding teacher:', error);
      });
  };

  const applySubstituteFilter = (isSubstitute: boolean | null) => {
    setFilterSubstitutes(isSubstitute);
    filterTeachers(searchQuery, isSubstitute);
  };

  const renderTeacherItem = ({ item }: { item: Teacher }) => {
    const isSubstitute = item.is_substitute === 1;
    
    return (
      <TouchableOpacity onPress={() => handleTeacherPress(item)}>
        <Card style={styles.teacherCard}>
          <Card.Content style={styles.cardContent}>
            <Avatar.Text 
              size={50} 
              label={item.name.substring(0, 2).toUpperCase()} 
              style={{ 
                backgroundColor: isSubstitute 
                  ? theme.colors.accent 
                  : theme.colors.primary 
              }} 
            />
            <View style={styles.teacherInfo}>
              <Text style={styles.teacherName}>{item.name}</Text>
              {item.phone_number && (
                <Text style={styles.teacherPhone}>{item.phone_number}</Text>
              )}
              {isSubstitute && (
                <Chip 
                  style={{ 
                    alignSelf: 'flex-start',
                    marginTop: 4,
                    backgroundColor: theme.colors.accent + '20'
                  }}
                  textStyle={{ fontSize: 12 }}
                >
                  Substitute
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search by name or phone"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <View style={styles.filterContainer}>
        <Button 
          mode={filterSubstitutes === null ? "contained" : "outlined"}
          onPress={() => applySubstituteFilter(null)}
          style={styles.filterButton}
        >
          All
        </Button>
        <Button 
          mode={filterSubstitutes === false ? "contained" : "outlined"}
          onPress={() => applySubstituteFilter(false)}
          style={styles.filterButton}
        >
          Regular
        </Button>
        <Button 
          mode={filterSubstitutes === true ? "contained" : "outlined"}
          onPress={() => applySubstituteFilter(true)}
          style={styles.filterButton}
        >
          Substitutes
        </Button>
      </View>
      
      <Divider />
      
      <Text style={styles.resultsCount}>
        {filteredTeachers.length} {filteredTeachers.length === 1 ? 'teacher' : 'teachers'} found
      </Text>
      
      <FlatList
        data={filteredTeachers}
        renderItem={renderTeacherItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No teachers found</Text>
            <Button mode="outlined" onPress={loadTeachers}>
              Refresh
            </Button>
          </View>
        }
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddTeacher}
        color="white"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  resultsCount: {
    padding: 16,
    paddingBottom: 8,
    fontSize: 12,
    color: '#666',
  },
  listContainer: {
    padding: 8,
    paddingBottom: 80, // To avoid FAB overlap
  },
  teacherCard: {
    marginHorizontal: 8,
    marginVertical: 4,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherInfo: {
    marginLeft: 16,
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  teacherPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyText: {
    marginBottom: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default TeachersScreen;