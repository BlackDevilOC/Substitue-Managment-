import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase>(SQLite.openDatabase('teacherscm.db'));
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the database
  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      // Check if this is a first run
      const isFirstRun = await AsyncStorage.getItem('DB_INITIALIZED');
      
      if (!isFirstRun) {
        // Create the schema
        await createSchema();
        // Import the demo data if needed
        await importDemoData();
        // Mark as initialized
        await AsyncStorage.setItem('DB_INITIALIZED', 'true');
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  };

  const createSchema = async () => {
    // Execute schema creation queries
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone_number TEXT,
        is_substitute INTEGER DEFAULT 0,
        grade_level INTEGER DEFAULT 0
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        period INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id)
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS absences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id)
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS substitute_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        absent_teacher_id INTEGER NOT NULL,
        substitute_teacher_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        period INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        FOREIGN KEY (absent_teacher_id) REFERENCES teachers (id),
        FOREIGN KEY (substitute_teacher_id) REFERENCES teachers (id)
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS sms_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id)
      )
    `);
  };

  const importDemoData = async () => {
    // We could pre-populate with some initial data if needed
    // For now, we'll leave this empty as the user will import their data
  };

  const executeQuery = async (query: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, { rows }) => {
            resolve(rows._array);
          },
          (_, error) => {
            console.error('Query error:', query, error);
            reject(error);
            return false;
          }
        );
      });
    });
  };

  // CSV Import/Export functions
  const importCsvFile = async (fileUri: string, tableName: string) => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      // Parse CSV and insert data - full implementation needed
      console.log(`Importing ${tableName} data from ${fileUri}`);
    } catch (error) {
      console.error('Failed to import CSV:', error);
      throw error;
    }
  };

  const exportCsvFile = async (tableName: string): Promise<string> => {
    try {
      // Get the data from the table
      const data = await executeQuery(`SELECT * FROM ${tableName}`);
      
      // Convert to CSV format - full implementation needed
      const csvContent = 'id,name,phone_number\n' + 
        data.map(row => `${row.id},${row.name},${row.phone_number}`).join('\n');
      
      // Save to a file
      const fileUri = `${FileSystem.documentDirectory}${tableName}_export.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      return fileUri;
    } catch (error) {
      console.error('Failed to export CSV:', error);
      throw error;
    }
  };

  // Teacher table operations
  const teachersTable: TeachersTableFunctions = {
    getAll: async () => {
      return executeQuery('SELECT * FROM teachers ORDER BY name');
    },
    getById: async (id: number) => {
      const results = await executeQuery('SELECT * FROM teachers WHERE id = ?', [id]);
      return results[0] || null;
    },
    create: async (teacher: any) => {
      const { name, phone_number, is_substitute, grade_level } = teacher;
      const result = await executeQuery(
        'INSERT INTO teachers (name, phone_number, is_substitute, grade_level) VALUES (?, ?, ?, ?)',
        [name, phone_number, is_substitute || 0, grade_level || 0]
      );
      return { ...teacher, id: result.insertId };
    },
    update: async (teacher: any) => {
      const { id, name, phone_number, is_substitute, grade_level } = teacher;
      await executeQuery(
        'UPDATE teachers SET name = ?, phone_number = ?, is_substitute = ?, grade_level = ? WHERE id = ?',
        [name, phone_number, is_substitute || 0, grade_level || 0, id]
      );
    },
    remove: async (id: number) => {
      await executeQuery('DELETE FROM teachers WHERE id = ?', [id]);
    }
  };

  // Schedule table operations
  const schedulesTable: SchedulesTableFunctions = {
    getAll: async () => {
      return executeQuery('SELECT * FROM schedules ORDER BY day, period');
    },
    getByTeacherId: async (teacherId: number) => {
      return executeQuery('SELECT * FROM schedules WHERE teacher_id = ? ORDER BY day, period', [teacherId]);
    },
    getByDay: async (day: string) => {
      return executeQuery('SELECT * FROM schedules WHERE day = ? ORDER BY period', [day]);
    },
    create: async (schedule: any) => {
      const { teacher_id, day, period, class_name } = schedule;
      const result = await executeQuery(
        'INSERT INTO schedules (teacher_id, day, period, class_name) VALUES (?, ?, ?, ?)',
        [teacher_id, day, period, class_name]
      );
      return { ...schedule, id: result.insertId };
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
    }
  };

  // Absence table operations
  const absencesTable: AbsencesTableFunctions = {
    getAll: async () => {
      return executeQuery('SELECT * FROM absences ORDER BY date DESC');
    },
    getByDate: async (date: string) => {
      return executeQuery('SELECT * FROM absences WHERE date = ?', [date]);
    },
    getByTeacherId: async (teacherId: number) => {
      return executeQuery('SELECT * FROM absences WHERE teacher_id = ? ORDER BY date DESC', [teacherId]);
    },
    create: async (absence: any) => {
      const { teacher_id, date, status, notes } = absence;
      const result = await executeQuery(
        'INSERT INTO absences (teacher_id, date, status, notes) VALUES (?, ?, ?, ?)',
        [teacher_id, date, status, notes || '']
      );
      return { ...absence, id: result.insertId };
    },
    update: async (absence: any) => {
      const { id, teacher_id, date, status, notes } = absence;
      await executeQuery(
        'UPDATE absences SET teacher_id = ?, date = ?, status = ?, notes = ? WHERE id = ?',
        [teacher_id, date, status, notes || '', id]
      );
    },
    remove: async (id: number) => {
      await executeQuery('DELETE FROM absences WHERE id = ?', [id]);
    }
  };

  // Substitute assignments table operations
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
        ORDER BY date DESC
      `);
    },
    getByDate: async (date: string) => {
      return executeQuery(`
        SELECT sa.*, 
          t1.name as absent_teacher_name, 
          t2.name as substitute_teacher_name,
          t2.phone_number as substitute_phone_number
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
          t2.phone_number as substitute_phone_number
        FROM substitute_assignments sa
        JOIN teachers t1 ON sa.absent_teacher_id = t1.id
        JOIN teachers t2 ON sa.substitute_teacher_id = t2.id
        WHERE sa.absent_teacher_id = ? OR sa.substitute_teacher_id = ?
        ORDER BY date DESC, period
      `, [teacherId, teacherId]);
    },
    create: async (assignment: any) => {
      const { absent_teacher_id, substitute_teacher_id, date, period, class_name } = assignment;
      const result = await executeQuery(
        'INSERT INTO substitute_assignments (absent_teacher_id, substitute_teacher_id, date, period, class_name) VALUES (?, ?, ?, ?, ?)',
        [absent_teacher_id, substitute_teacher_id, date, period, class_name]
      );
      return { ...assignment, id: result.insertId };
    },
    update: async (assignment: any) => {
      const { id, absent_teacher_id, substitute_teacher_id, date, period, class_name } = assignment;
      await executeQuery(
        'UPDATE substitute_assignments SET absent_teacher_id = ?, substitute_teacher_id = ?, date = ?, period = ?, class_name = ? WHERE id = ?',
        [absent_teacher_id, substitute_teacher_id, date, period, class_name, id]
      );
    },
    remove: async (id: number) => {
      await executeQuery('DELETE FROM substitute_assignments WHERE id = ?', [id]);
    }
  };

  const value = {
    db,
    isInitialized,
    executeQuery,
    teachersTable,
    schedulesTable,
    absencesTable,
    subsAssignmentsTable,
    importCsvFile,
    exportCsvFile
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};