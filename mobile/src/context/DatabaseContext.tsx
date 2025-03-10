import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { parse as csvParse } from 'csv-parse/sync';

// Database context type definition
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

// Table function interfaces
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

// Create the database context
const DatabaseContext = createContext<DatabaseContextType>({} as DatabaseContextType);

// Hook to use the database context
export const useDatabase = () => useContext(DatabaseContext);

// Database provider component
export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase>(() => SQLite.openDatabase('schedulizer.db'));
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the database on mount
  useEffect(() => {
    const initDb = async () => {
      try {
        // Create tables if they don't exist
        await createTables();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing database:', error);
        Alert.alert('Database Error', 'Failed to initialize the database.');
      }
    };

    initDb();
  }, []);

  // Create database tables
  const createTables = async () => {
    const queries = [
      // Teachers table
      `CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone_number TEXT,
        is_substitute INTEGER DEFAULT 0,
        grade_level INTEGER DEFAULT 0
      )`,
      
      // Schedules table
      `CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        period INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE CASCADE
      )`,
      
      // Absences table
      `CREATE TABLE IF NOT EXISTS absences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'absent',
        notes TEXT,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE CASCADE
      )`,
      
      // Substitute assignments table
      `CREATE TABLE IF NOT EXISTS substitute_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        absent_teacher_id INTEGER NOT NULL,
        substitute_teacher_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        period INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        FOREIGN KEY (absent_teacher_id) REFERENCES teachers (id) ON DELETE CASCADE,
        FOREIGN KEY (substitute_teacher_id) REFERENCES teachers (id) ON DELETE CASCADE
      )`
    ];

    for (const query of queries) {
      await executeQuery(query);
    }
    
    // Optional: Check if we need sample data
    const hasData = await AsyncStorage.getItem('hasInitialData');
    if (!hasData) {
      await insertSampleData();
      await AsyncStorage.setItem('hasInitialData', 'true');
    }
  };

  // Insert sample data for testing
  const insertSampleData = async () => {
    // Sample teachers
    const teacherQueries = [
      "INSERT INTO teachers (name, phone_number, is_substitute, grade_level) VALUES ('John Smith', '+1234567890', 0, 5)",
      "INSERT INTO teachers (name, phone_number, is_substitute, grade_level) VALUES ('Jane Doe', '+0987654321', 0, 4)",
      "INSERT INTO teachers (name, phone_number, is_substitute, grade_level) VALUES ('Michael Brown', '+1122334455', 1, 3)",
      "INSERT INTO teachers (name, phone_number, is_substitute, grade_level) VALUES ('Sarah Wilson', '+5566778899', 1, 6)"
    ];
    
    // Sample schedules
    const scheduleQueries = [
      "INSERT INTO schedules (teacher_id, day, period, class_name) VALUES (1, 'monday', 1, 'Math 101')",
      "INSERT INTO schedules (teacher_id, day, period, class_name) VALUES (1, 'monday', 2, 'Math 202')",
      "INSERT INTO schedules (teacher_id, day, period, class_name) VALUES (2, 'monday', 1, 'English 101')",
      "INSERT INTO schedules (teacher_id, day, period, class_name) VALUES (2, 'tuesday', 3, 'Literature')"
    ];
    
    // Sample absences
    const today = new Date().toISOString().split('T')[0];
    const absenceQueries = [
      `INSERT INTO absences (teacher_id, date, status, notes) VALUES (1, '${today}', 'absent', 'Sick leave')`,
      `INSERT INTO absences (teacher_id, date, status, notes) VALUES (2, '${today}', 'absent', 'Family emergency')`
    ];
    
    // Sample substitute assignments
    const assignmentQueries = [
      `INSERT INTO substitute_assignments (absent_teacher_id, substitute_teacher_id, date, period, class_name) 
       VALUES (1, 3, '${today}', 1, 'Math 101')`
    ];
    
    const allQueries = [...teacherQueries, ...scheduleQueries, ...absenceQueries, ...assignmentQueries];
    
    for (const query of allQueries) {
      await executeQuery(query);
    }
  };

  // Execute a SQL query
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
            console.error('Query error:', error, query, params);
            reject(error);
            return false;
          }
        );
      });
    });
  };

  // Teachers table functions
  const teachersTable: TeachersTableFunctions = {
    getAll: async () => {
      return executeQuery('SELECT * FROM teachers ORDER BY name');
    },
    
    getById: async (id: number) => {
      const results = await executeQuery('SELECT * FROM teachers WHERE id = ?', [id]);
      return results.length ? results[0] : null;
    },
    
    create: async (teacher: any) => {
      const { name, phone_number, is_substitute, grade_level } = teacher;
      
      const results = await executeQuery(
        'INSERT INTO teachers (name, phone_number, is_substitute, grade_level) VALUES (?, ?, ?, ?)',
        [name, phone_number, is_substitute ? 1 : 0, grade_level || 0]
      );
      
      return {
        ...teacher,
        id: results.insertId
      };
    },
    
    update: async (teacher: any) => {
      const { id, name, phone_number, is_substitute, grade_level } = teacher;
      
      await executeQuery(
        'UPDATE teachers SET name = ?, phone_number = ?, is_substitute = ?, grade_level = ? WHERE id = ?',
        [name, phone_number, is_substitute ? 1 : 0, grade_level || 0, id]
      );
    },
    
    remove: async (id: number) => {
      await executeQuery('DELETE FROM teachers WHERE id = ?', [id]);
    }
  };

  // Schedules table functions
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
      return executeQuery(`
        SELECT s.*, t.name as teacher_name 
        FROM schedules s
        JOIN teachers t ON s.teacher_id = t.id
        WHERE s.teacher_id = ?
        ORDER BY s.day, s.period
      `, [teacherId]);
    },
    
    getByDay: async (day: string) => {
      return executeQuery(`
        SELECT s.*, t.name as teacher_name 
        FROM schedules s
        JOIN teachers t ON s.teacher_id = t.id
        WHERE s.day = ?
        ORDER BY s.period
      `, [day.toLowerCase()]);
    },
    
    create: async (schedule: any) => {
      const { teacher_id, day, period, class_name } = schedule;
      
      const results = await executeQuery(
        'INSERT INTO schedules (teacher_id, day, period, class_name) VALUES (?, ?, ?, ?)',
        [teacher_id, day.toLowerCase(), period, class_name]
      );
      
      return {
        ...schedule,
        id: results.insertId
      };
    },
    
    update: async (schedule: any) => {
      const { id, teacher_id, day, period, class_name } = schedule;
      
      await executeQuery(
        'UPDATE schedules SET teacher_id = ?, day = ?, period = ?, class_name = ? WHERE id = ?',
        [teacher_id, day.toLowerCase(), period, class_name, id]
      );
    },
    
    remove: async (id: number) => {
      await executeQuery('DELETE FROM schedules WHERE id = ?', [id]);
    }
  };

  // Absences table functions
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
      return executeQuery(`
        SELECT a.*, t.name as teacher_name 
        FROM absences a
        JOIN teachers t ON a.teacher_id = t.id
        WHERE a.date = ?
        ORDER BY t.name
      `, [date]);
    },
    
    getByTeacherId: async (teacherId: number) => {
      return executeQuery(`
        SELECT a.*, t.name as teacher_name 
        FROM absences a
        JOIN teachers t ON a.teacher_id = t.id
        WHERE a.teacher_id = ?
        ORDER BY a.date DESC
      `, [teacherId]);
    },
    
    create: async (absence: any) => {
      const { teacher_id, date, status, notes } = absence;
      
      const results = await executeQuery(
        'INSERT INTO absences (teacher_id, date, status, notes) VALUES (?, ?, ?, ?)',
        [teacher_id, date, status || 'absent', notes || '']
      );
      
      return {
        ...absence,
        id: results.insertId
      };
    },
    
    update: async (absence: any) => {
      const { id, teacher_id, date, status, notes } = absence;
      
      await executeQuery(
        'UPDATE absences SET teacher_id = ?, date = ?, status = ?, notes = ? WHERE id = ?',
        [teacher_id, date, status || 'absent', notes || '', id]
      );
    },
    
    remove: async (id: number) => {
      await executeQuery('DELETE FROM absences WHERE id = ?', [id]);
    }
  };

  // Substitute assignments table functions
  const subsAssignmentsTable: SubsAssignmentsTableFunctions = {
    getAll: async () => {
      return executeQuery(`
        SELECT sa.*, 
          t1.name as absent_teacher_name,
          t2.name as substitute_teacher_name,
          t2.phone_number as substitute_phone
        FROM substitute_assignments sa
        JOIN teachers t1 ON sa.absent_teacher_id = t1.id
        JOIN teachers t2 ON sa.substitute_teacher_id = t2.id
        ORDER BY sa.date DESC, sa.period
      `);
    },
    
    getByDate: async (date: string) => {
      return executeQuery(`
        SELECT sa.*, 
          t1.name as absent_teacher_name,
          t2.name as substitute_teacher_name,
          t2.phone_number as substitute_phone
        FROM substitute_assignments sa
        JOIN teachers t1 ON sa.absent_teacher_id = t1.id
        JOIN teachers t2 ON sa.substitute_teacher_id = t2.id
        WHERE sa.date = ?
        ORDER BY sa.period
      `, [date]);
    },
    
    getByTeacherId: async (teacherId: number) => {
      return executeQuery(`
        SELECT sa.*, 
          t1.name as absent_teacher_name,
          t2.name as substitute_teacher_name,
          t2.phone_number as substitute_phone
        FROM substitute_assignments sa
        JOIN teachers t1 ON sa.absent_teacher_id = t1.id
        JOIN teachers t2 ON sa.substitute_teacher_id = t2.id
        WHERE sa.absent_teacher_id = ? OR sa.substitute_teacher_id = ?
        ORDER BY sa.date DESC, sa.period
      `, [teacherId, teacherId]);
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
        ...assignment,
        id: results.insertId
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
    }
  };

  // Import CSV file to a table
  const importCsvFile = async (fileUri: string, tableName: string): Promise<void> => {
    try {
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      // Parse CSV content
      const records = csvParse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      if (!records.length) {
        throw new Error('No records found in the CSV file');
      }
      
      // Begin transaction
      return new Promise((resolve, reject) => {
        db.transaction(
          tx => {
            records.forEach((record: any) => {
              // Get column names and values
              const columns = Object.keys(record);
              const values = Object.values(record);
              const placeholders = columns.map(() => '?').join(', ');
              
              // Create and execute INSERT query
              const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
              
              tx.executeSql(
                insertQuery,
                values,
                undefined,
                (_, error) => {
                  console.error('Error inserting record:', error);
                  return false;
                }
              );
            });
          },
          (error) => {
            console.error('Transaction error:', error);
            reject(error);
          },
          () => {
            resolve();
          }
        );
      });
    } catch (error) {
      console.error('Import CSV error:', error);
      throw error;
    }
  };

  // Export table data to a CSV file
  const exportCsvFile = async (tableName: string): Promise<string> => {
    try {
      // Get all data from the specified table
      const records = await executeQuery(`SELECT * FROM ${tableName}`);
      
      if (!records.length) {
        throw new Error(`No records found in the ${tableName} table`);
      }
      
      // Get column names
      const columns = Object.keys(records[0]);
      
      // Create CSV header row
      const headerRow = columns.join(',');
      
      // Create CSV data rows
      const dataRows = records.map(record => 
        columns.map(col => {
          const value = record[col];
          // Handle values that need quotes (strings with commas, etc.)
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      
      // Combine header and data rows
      const csvContent = [headerRow, ...dataRows].join('\n');
      
      // Create a temporary file
      const documentsDir = FileSystem.documentDirectory;
      const filePath = `${documentsDir}${tableName}_export_${Date.now()}.csv`;
      
      // Write CSV content to file
      await FileSystem.writeAsStringAsync(filePath, csvContent);
      
      return filePath;
    } catch (error) {
      console.error('Export CSV error:', error);
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
        exportCsvFile,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

