/**
 * Database Helper Functions
 * 
 * This module provides utility functions for SQLite database operations
 * in the mobile app, allowing for better offline support and data persistence.
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Database instance cache
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Get or create the database instance
export function getDatabase(): SQLite.SQLiteDatabase {
  if (dbInstance === null) {
    dbInstance = SQLite.openDatabase('schedulizer.db');
  }
  return dbInstance;
}

// Execute a SQL query with parameters
export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<T[]> {
  const db = getDatabase();
  
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
}

// Insert a record and return the inserted ID
export async function insertRecord(
  table: string, 
  data: Record<string, any>
): Promise<number> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map(() => '?').join(', ');
  
  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  
  try {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          values,
          (_, result) => {
            resolve(result.insertId || 0);
          },
          (_, error) => {
            console.error('Insert error:', error, query, values);
            reject(error);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Insert transaction error:', error);
    throw error;
  }
}

// Update a record
export async function updateRecord(
  table: string, 
  data: Record<string, any>, 
  whereClause: string, 
  whereParams: any[] = []
): Promise<number> {
  const setClause = Object.keys(data)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const values = [...Object.values(data), ...whereParams];
  
  const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  
  try {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          values,
          (_, result) => {
            resolve(result.rowsAffected);
          },
          (_, error) => {
            console.error('Update error:', error, query, values);
            reject(error);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    throw error;
  }
}

// Delete a record
export async function deleteRecord(
  table: string, 
  whereClause: string, 
  whereParams: any[] = []
): Promise<number> {
  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  
  try {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          whereParams,
          (_, result) => {
            resolve(result.rowsAffected);
          },
          (_, error) => {
            console.error('Delete error:', error, query, whereParams);
            reject(error);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    throw error;
  }
}

// Export the database to a CSV file
export async function exportTableToCSV(
  table: string
): Promise<string> {
  try {
    // Get all records from the table
    const records = await executeQuery(`SELECT * FROM ${table}`);
    
    if (!records.length) {
      return '';
    }
    
    // Create column headers
    const headers = Object.keys(records[0]).join(',');
    
    // Create CSV rows
    const rows = records.map(record => {
      return Object.values(record).map(value => {
        // Handle special characters and wrap with quotes if needed
        if (value === null || value === undefined) {
          return '';
        }
        
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',');
    });
    
    // Combine headers and rows
    const csvContent = [headers, ...rows].join('\n');
    
    // Create a temporary file
    const timestamp = new Date().getTime();
    const filePath = `${FileSystem.documentDirectory}${table}_${timestamp}.csv`;
    
    // Write to the file
    await FileSystem.writeAsStringAsync(filePath, csvContent);
    
    return filePath;
  } catch (error) {
    console.error('Error exporting table to CSV:', error);
    throw error;
  }
}

// Import data from a CSV file into a table
export async function importCSVToTable(
  filePath: string, 
  table: string,
  createIfNotExists: boolean = false
): Promise<number> {
  try {
    // Read the file content
    const fileContent = await FileSystem.readAsStringAsync(filePath);
    const lines = fileContent.split('\n');
    
    if (lines.length < 2) { // Need at least header + 1 row
      throw new Error('CSV file is empty or has no data rows');
    }
    
    // Parse the header row
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Parse the data rows
    const dataRows = lines.slice(1).filter(line => line.trim() !== '').map(line => {
      const values: string[] = [];
      let inQuotes = false;
      let currentValue = '';
      
      // Parse CSV considering quoted fields that may contain commas
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      values.push(currentValue); // Add the last value
      
      // Create an object with header keys
      const rowObject: Record<string, any> = {};
      headers.forEach((header, index) => {
        rowObject[header] = values[index] ? values[index].replace(/^"(.*)"$/, '$1') : '';
      });
      
      return rowObject;
    });
    
    // If table doesn't exist and createIfNotExists is true, create it
    if (createIfNotExists) {
      const columnDefs = headers.map(header => `${header} TEXT`).join(', ');
      const createTableQuery = `CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columnDefs})`;
      await executeQuery(createTableQuery);
    }
    
    // Insert all rows in a transaction
    const db = getDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          dataRows.forEach(row => {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = columns.map(() => '?').join(', ');
            
            const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            
            tx.executeSql(
              insertQuery,
              values,
              undefined,
              (_, error) => {
                console.error('Error inserting CSV row:', error);
                return false;
              }
            );
          });
        },
        error => {
          console.error('Transaction error importing CSV:', error);
          reject(error);
        },
        () => {
          resolve(dataRows.length);
        }
      );
    });
  } catch (error) {
    console.error('Error importing CSV to table:', error);
    throw error;
  }
}

// Get record count for a table
export async function getTableCount(table: string): Promise<number> {
  try {
    const result = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
    return result[0]?.count || 0;
  } catch (error) {
    console.error(`Error getting count for table ${table}:`, error);
    return 0;
  }
}

// Get last sync timestamp
export async function getLastSyncTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('lastSyncTimestamp');
  } catch (error) {
    console.error('Error retrieving last sync timestamp:', error);
    return null;
  }
}

// Set last sync timestamp
export async function setLastSyncTimestamp(timestamp?: string): Promise<void> {
  try {
    const timeString = timestamp || new Date().toISOString();
    await AsyncStorage.setItem('lastSyncTimestamp', timeString);
  } catch (error) {
    console.error('Error setting last sync timestamp:', error);
  }
}