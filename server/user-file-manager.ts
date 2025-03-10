import * as fs from 'fs';
import * as path from 'path';
import { User } from '@shared/schema';

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

/**
 * Read users from the JSON file
 */
export function readUsersFile(): User[] {
  try {
    if (!fs.existsSync(USERS_FILE_PATH)) {
      // Create default user if file doesn't exist
      const defaultUsers = [
        {
          id: 1,
          username: 'Rehan',
          password: '0315',
          isAdmin: true
        }
      ];
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(defaultUsers, null, 2));
      return defaultUsers;
    }
    
    const fileContent = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
}

/**
 * Write users to the JSON file
 */
export function writeUsersFile(users: User[]): boolean {
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing users file:', error);
    return false;
  }
}

/**
 * Get a user by username
 */
export function getUserByUsername(username: string): User | undefined {
  const users = readUsersFile();
  return users.find(user => user.username.toLowerCase() === username.toLowerCase());
}

/**
 * Get a user by ID
 */
export function getUserById(id: number): User | undefined {
  const users = readUsersFile();
  return users.find(user => user.id === id);
}

/**
 * Update a user's password
 */
export function updateUserPassword(id: number, newPassword: string): boolean {
  const users = readUsersFile();
  const userIndex = users.findIndex(user => user.id === id);
  
  if (userIndex === -1) {
    return false;
  }
  
  users[userIndex].password = newPassword;
  return writeUsersFile(users);
}

/**
 * Update a user's username
 */
export function updateUsername(id: number, newUsername: string): boolean {
  const users = readUsersFile();
  
  // Check if username already exists
  if (users.some(user => user.id !== id && user.username.toLowerCase() === newUsername.toLowerCase())) {
    return false;
  }
  
  const userIndex = users.findIndex(user => user.id === id);
  
  if (userIndex === -1) {
    return false;
  }
  
  users[userIndex].username = newUsername;
  return writeUsersFile(users);
}

/**
 * Verify a user's password
 */
export function verifyPassword(username: string, password: string): User | null {
  const user = getUserByUsername(username);
  
  if (!user || user.password !== password) {
    return null;
  }
  
  return user;
}