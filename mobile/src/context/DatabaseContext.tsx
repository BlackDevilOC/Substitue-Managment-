import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { parse as parseCSV } from 'csv-parse/sync';

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase;
  isInitialized: boolean;
  executeQuery: (query: string, params?: any[]) => Promise<any[]>;
  teachersTable: TeachersTableFunctions;
  schedulesTable: SchedulesTableFunctions;
  absencesTable: AbsencesTableFunctions;
  subsAssignmentsTable: SubsAssignmentsTableFunctions;
  importCsvFile: (fileUri: string, tableName: string) => Promise<void>;
  exportCsvFile: (tableName: string) => Promise<string>;
}

interface TeachersTableFunctions {
  getAll: () => Promise<any[]>;
  getById: (id: number) => Promise<any>;
  create: (teacher: any) => Promise<any>;
  update: (teacher: any) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

interface SchedulesTableFunctions {
  getAll: () => Promise<any[]>;
  getByTeacherId: (teacherId: number) => Promise<any[]>;
  getByDay: (day: string) => Promise<any[]>;
  create: (schedule: any) => Promise<any>;
  update: (schedule: any) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

interface AbsencesTableFunctions {
  getAll: () => Promise<any[]>;
  getByDate: (date: string) => Promise<any[]>;
  getByTeacherId: (teacherId: number) => Promise<any[]>;
  create: (absence: any) => Promise<any>;
  update: (absence: any) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

interface SubsAssignmentsTableFunctions {
  getAll: () => Promise<any[]>;
  getByDate: (date: string) => Promise<any[]>;
  getByTeacherId: (teacherId: number) => Promise<any[]>;
  create: (assignment: any) => Promise<any>;
  update: (assignment: any) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase>(SQLite.openDatabase('teacher_app.db'));
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Initialize database
  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('Initializing database...');
        
        // Create tables if they don't exist
        await createTables();
        
        // Check if we need to load initial data
        const hasInitialData = await AsyncStorage.getItem('hasInitialData');
        
        if (hasInitialData !== 'true') {
          await loadInitialData();
          await AsyncStorage.setItem('hasInitialData', 'true');
        }
        
        setIsInitialized(true);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Database initialization error:', error);
        Alert.alert('Database Error', 'Failed to initialize the database. Please restart the app.');
      }
    };
    
    initDatabase();
  }, []);

  // Create database tables
  const createTables = async () => {
    try {
      // Teachers table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS teachers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone_number TEXT,
          is_substitute INTEGER DEFAULT 0,
          grade_level INTEGER DEFAULT 0
        )
      `);
      
      // Schedules table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER NOT NULL,
          day TEXT NOT NULL,
          period INTEGER NOT NULL,
          class_name TEXT NOT NULL,
          FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE CASCADE
        )
      `);
      
      // Absences table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS absences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT,
          FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE CASCADE
        )
      `);
      
      // Substitute assignments table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS substitute_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          absent_teacher_id INTEGER NOT NULL,
          substitute_teacher_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          period INTEGER NOT NULL,
          class_name TEXT NOT NULL,
          FOREIGN KEY (absent_teacher_id) REFERENCES teachers (id) ON DELETE CASCADE,
          FOREIGN KEY (substitute_teacher_id) REFERENCES teachers (id) ON DELETE CASCADE
        )
      `);
      
      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  };

  // Load initial data (sample data for demo)
  const loadInitialData = async () => {
    try {
      console.log('Loading initial data...');
      
      // Sample teachers
      const sampleTeachers = [
        { name: 'John Smith', phone_number: '+1234567890', is_substitute: 0, grade_level: 9 },
        { name: 'Jane Doe', phone_number: '+1987654321', is_substitute: 0, grade_level: 10 },
        { name: 'Bob Johnson', phone_number: '+1122334455', is_substitute: 1, grade_level: 8 },
        { name: 'Alice Williams', phone_number: '+1555666777', is_substitute: 1, grade_level: 11 },
      ];
      
      // Insert sample teachers
      for (const teacher of sampleTeachers) {
        await teachersTable.create(teacher);
      }
      
      console.log('Initial data loaded successfully');
    } catch (error) {
      console.error('Error loading initial data:', error);
      throw error;
    }
  };

  // Execute SQL query with proper error handling
  const executeQuery = async (query: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, result) => {
            resolve(result.rows._array);
          },
          (_, error) => {
            console.error('SQL Error:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  };

  // Define table operations
  const teachersTable: TeachersTableFunctions = {
    getAll: async () => {
      return executeQuery('SELECT * FROM teachers ORDER BY name');
    },
    
    getById: async (id: number) => {
      const results = await executeQuery(
        'SELECT * FROM teachers WHERE id = ?',
        [id]
      );
      return results.length > 0 ? results[0] : null;
    },
    
    create: async (teacher: any) => {
      const { name, phone_number, is_substitute, grade_level } = teacher;
      
      const results = await executeQuery(
        'INSERT INTO teachers (name, phone_number, is_substitute, grade_level) VALUES (?, ?, ?, ?)',
        [name, phone_number || null, is_substitute || 0, grade_level || 0]
      );
      
      return {
        id: results.insertId,
        name,
        phone_number,
        is_substitute,
        grade_level
      };
    },
    
    update: async (teacher: any) => {
      const { id, name, phone_number, is_substitute, grade_level } = teacher;
      
      await executeQuery(
        'UPDATE teachers SET name = ?, phone_number = ?, is_substitute = ?, grade_level = ? WHERE id = ?',
        [name, phone_number || null, is_substitute || 0, grade_level || 0, id]
      );
    },
    
    remove: async (id: number) => {
      await executeQuery('DELETE FROM teachers WHERE id = ?', [id]);
    },
  };
  
  const schedulesTable: SchedulesTableFunctions = {
    getAll: async () => {
      return executeQuery(`
        SELECT s.*, t.name as teacher_name 
        FROM schedules s
        JOIN teachers t ON s.teacher_id = t.id
        ORDER BY s.day, s.period
      `);
    },
    
    getByTeacherId: async (teacherId: number) => {
      return executeQuery(
        'SELECT * FROM schedules WHERE teacher_id = ? ORDER BY day, period',
        [teacherId]
      );
    },
    
    getByDay: async (day: string) => {
      return executeQuery(
        `SELECT s.*, t.name as teacher_name 
         FROM schedules s
         JOIN teachers t ON s.teacher_id = t.id
         WHERE s.day = ?
         ORDER BY s.period, s.class_name`,
        [day]
      );
    },
    
    create: async (schedule: any) => {
      const { teacher_id, day, period, class_name } = schedule;
      
      const results = await executeQuery(
        'INSERT INTO schedules (teacher_id, day, period, class_name) VALUES (?, ?, ?, ?)',
        [teacher_id, day, period, class_name]
      );
      
      return {
        id: results.insertId,
        teacher_id,
        day,
        period,
        class_name
      };
    },
    
    update: async (schedule: any) => {
      const { id, teacher_id, day, period, class_name } = schedule;
      
      await executeQuery(
        'UPDATE schedules SET teacher_id = ?, day = ?, period = ?, class_name = ? WHERE id = ?',
        [teacher_id, day, period, class_name, id]
      );
    },
    
    remove: async (id: number) => {
      await executeQuery('DELETE FROM schedules WHERE id = ?', [id]);
    },
  };
  
  const absencesTable: AbsencesTableFunctions = {
    getAll: async () => {
      return executeQuery(`
        SELECT a.*, t.name as teacher_name 
        FROM absences a
        JOIN teachers t ON a.teacher_id = t.id
        ORDER BY a.date DESC
      `);
    },
    
    getByDate: async (date: string) => {
      return executeQuery(
        `SELECT a.*, t.name as teacher_name, t.phone_number 
         FROM absences a
         JOIN teachers t ON a.teacher_id = t.id
         WHERE a.date = ?
         ORDER BY t.name`,
        [date]
      );
    },
    
    getByTeacherId: async (teacherId: number) => {
      return executeQuery(
        'SELECT * FROM absences WHERE teacher_id = ? ORDER BY date DESC',
        [teacherId]
      );
    },
    
    create: async (absence: any) => {
      const { teacher_id, date, status, notes } = absence;
      
      const results = await executeQuery(
        'INSERT INTO absences (teacher_id, date, status, notes) VALUES (?, ?, ?, ?)',
        [teacher_id, date, status, notes || null]
      );
      
      return {
        id: results.insertId,
        teacher_id,
        date,
        status,
        notes
      };
    },
    
    update: async (absence: any) => {
      const { id, teacher_id, date, status, notes } = absence;
      
      await executeQuery(
        'UPDATE absences SET teacher_id = ?, date = ?, status = ?, notes = ? WHERE id = ?',
        [teacher_id, date, status, notes || null, id]
      );
    },
    
    remove: async (id: number) => {
      await executeQuery('DELETE FROM absences WHERE id = ?', [id]);
    },
  };
  
  const subsAssignmentsTable: SubsAssignmentsTableFunctions = {
    getAll: async () => {
      return executeQuery(`
        SELECT sa.*, 
               t1.name as absent_teacher_name, 
               t2.name as substitute_teacher_name,
               t2.phone_number as substitute_phone_number
        FROM substitute_assignments sa
        JOIN teachers t1 ON sa.absent_teacher_id = t1.id
        JOIN teachers t2 ON sa.substitute_teacher_id = t2.id
        ORDER BY sa.date DESC, sa.period
      `);
    },
    
    getByDate: async (date: string) => {
      return executeQuery(
        `SELECT sa.*, 
                t1.name as absent_teacher_name, 
                t2.name as substitute_teacher_name,
                t2.phone_number as substitute_phone_number
         FROM substitute_assignments sa
         JOIN teachers t1 ON sa.absent_teacher_id = t1.id
         JOIN teachers t2 ON sa.substitute_teacher_id = t2.id
         WHERE sa.date = ?
         ORDER BY sa.absent_teacher_id, sa.period`,
        [date]
      );
    },
    
    getByTeacherId: async (teacherId: number) => {
      return executeQuery(
        `SELECT sa.*, 
                t1.name as absent_teacher_name, 
                t2.name as substitute_teacher_name,
                t2.phone_number as substitute_phone_number
         FROM substitute_assignments sa
         JOIN teachers t1 ON sa.absent_teacher_id = t1.id
         JOIN teachers t2 ON sa.substitute_teacher_id = t2.id
         WHERE sa.absent_teacher_id = ? OR sa.substitute_teacher_id = ?
         ORDER BY sa.date DESC, sa.period`,
        [teacherId, teacherId]
      );
    },
    
    create: async (assignment: any) => {
      const { absent_teacher_id, substitute_teacher_id, date, period, class_name } = assignment;
      
      const results = await executeQuery(
        `INSERT INTO substitute_assignments 
         (absent_teacher_id, substitute_teacher_id, date, period, class_name) 
         VALUES (?, ?, ?, ?, ?)`,
        [absent_teacher_id, substitute_teacher_id, date, period, class_name]
      );
      
      return {
        id: results.insertId,
        absent_teacher_id,
        substitute_teacher_id,
        date,
        period,
        class_name
      };
    },
    
    update: async (assignment: any) => {
      const { id, absent_teacher_id, substitute_teacher_id, date, period, class_name } = assignment;
      
      await executeQuery(
        `UPDATE substitute_assignments 
         SET absent_teacher_id = ?, substitute_teacher_id = ?, date = ?, period = ?, class_name = ? 
         WHERE id = ?`,
        [absent_teacher_id, substitute_teacher_id, date, period, class_name, id]
      );
    },
    
    remove: async (id: number) => {
      await executeQuery('DELETE FROM substitute_assignments WHERE id = ?', [id]);
    },
  };

  // Import CSV file into database
  const importCsvFile = async (fileUri: string, tableName: string) => {
    try {
      // Read CSV file
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      // Parse CSV data
      const records = parseCSV(fileContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      if (records.length === 0) {
        throw new Error('CSV file is empty or could not be parsed');
      }
      
      // Process based on table name
      if (tableName === 'teachers') {
        await importTeachers(records);
      } else if (tableName === 'schedules') {
        await importSchedules(records);
      } else {
        throw new Error(`Import for ${tableName} is not supported`);
      }
    } catch (error) {
      console.error('Error importing CSV file:', error);
      throw error;
    }
  };
  
  // Helper function to import teachers
  const importTeachers = async (records: any[]) => {
    for (const record of records) {
      const teacher = {
        name: record.name || record.Name || record.teacher_name || record['Teacher Name'],
        phone_number: record.phone || record.Phone || record.phone_number || record['Phone Number'] || null,
        is_substitute: record.is_substitute === 'true' || record.is_substitute === '1' ? 1 : 0,
        grade_level: parseInt(record.grade_level || record['Grade Level'] || '0', 10)
      };
      
      if (!teacher.name) continue;
      
      await teachersTable.create(teacher);
    }
  };
  
  // Helper function to import schedules
  const importSchedules = async (records: any[]) => {
    for (const record of records) {
      // Need to find teacher by name first
      const teacherName = record.teacher || record.Teacher || record.teacher_name || record['Teacher Name'];
      const day = (record.day || record.Day || '').toLowerCase();
      const period = parseInt(record.period || record.Period || '0', 10);
      const className = record.class || record.Class || record.class_name || record['Class Name'] || '';
      
      if (!teacherName || !day || !period || !className) continue;
      
      // Find or create teacher
      const teachers = await executeQuery('SELECT * FROM teachers WHERE name = ?', [teacherName]);
      let teacherId;
      
      if (teachers.length > 0) {
        teacherId = teachers[0].id;
      } else {
        // Create new teacher if not found
        const newTeacher = await teachersTable.create({
          name: teacherName,
          phone_number: null,
          is_substitute: 0,
          grade_level: 0
        });
        teacherId = newTeacher.id;
      }
      
      // Create schedule entry
      await schedulesTable.create({
        teacher_id: teacherId,
        day,
        period,
        class_name: className
      });
    }
  };
  
  // Export table to CSV file
  const exportCsvFile = async (tableName: string): Promise<string> => {
    try {
      let records;
      let headers;
      
      // Get data based on table name
      if (tableName === 'teachers') {
        records = await teachersTable.getAll();
        headers = ['id', 'name', 'phone_number', 'is_substitute', 'grade_level'];
      } else if (tableName === 'schedules') {
        records = await schedulesTable.getAll();
        headers = ['id', 'teacher_id', 'teacher_name', 'day', 'period', 'class_name'];
      } else if (tableName === 'absences') {
        records = await absencesTable.getAll();
        headers = ['id', 'teacher_id', 'teacher_name', 'date', 'status', 'notes'];
      } else if (tableName === 'substitute_assignments') {
        records = await subsAssignmentsTable.getAll();
        headers = ['id', 'absent_teacher_id', 'absent_teacher_name', 'substitute_teacher_id', 
                  'substitute_teacher_name', 'date', 'period', 'class_name'];
      } else {
        throw new Error(`Export for ${tableName} is not supported`);
      }
      
      // Convert records to CSV
      let csvContent = headers.join(',') + '\n';
      
      records.forEach(record => {
        const row = headers.map(header => {
          const value = record[header];
          // Handle values that might contain commas
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          } else {
            return value;
          }
        });
        
        csvContent += row.join(',') + '\n';
      });
      
      // Save CSV file
      const fileName = `${tableName}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      return fileUri;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  };

  return (
    <DatabaseContext.Provider
      value={{
        db,
        isInitialized,
        executeQuery,
        teachersTable,
        schedulesTable,
        absencesTable,
        subsAssignmentsTable,
        importCsvFile,
        exportCsvFile
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export default DatabaseContext;