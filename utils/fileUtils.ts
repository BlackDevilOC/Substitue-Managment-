
import * as fs from 'fs';
import * as path from 'path';

/**
 * Safely reads a JSON file and returns the parsed data
 * @param filePath Path to the JSON file
 * @param defaultValue Default value to return if file doesn't exist or is invalid
 */
export function safeReadJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return defaultValue;
  }
}

/**
 * Safely writes data to a JSON file
 * @param filePath Path to the JSON file
 * @param data Data to write
 * @param pretty Whether to pretty-print the JSON
 */
export function safeWriteJsonFile(filePath: string, data: any, pretty = true): boolean {
  try {
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Write file
    const jsonString = pretty 
      ? JSON.stringify(data, null, 2) 
      : JSON.stringify(data);
      
    fs.writeFileSync(filePath, jsonString);
    return true;
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    return false;
  }
}
