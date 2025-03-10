import fs from 'fs';
import path from 'path';
import { User } from '@shared/schema';
import { safeReadJsonFile, safeWriteJsonFile } from '../utils/fileUtils';
import crypto from 'crypto';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

/**
 * Hashes a password using SHA-256
 * Simple implementation for demonstration purposes
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verifies a password against a stored hash
 */
function verifyPassword(password: string, hash: string): boolean {
  const hashedInput = hashPassword(password);
  return hashedInput === hash;
}

/**
 * Read users from the JSON file
 */
export function readUsersFile(): User[] {
  return safeReadJsonFile<User[]>(USERS_FILE, []);
}

/**
 * Write users to the JSON file
 */
export function writeUsersFile(users: User[]): boolean {
  return safeWriteJsonFile(USERS_FILE, users);
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
  
  users[userIndex].password = hashPassword(newPassword);
  return writeUsersFile(users);
}

/**
 * Update a user's username
 */
export function updateUsername(id: number, newUsername: string): boolean {
  const users = readUsersFile();
  
  // Check if the new username already exists
  if (users.some(user => user.username.toLowerCase() === newUsername.toLowerCase() && user.id !== id)) {
    return false; // Username already exists
  }
  
  const userIndex = users.findIndex(user => user.id === id);
  
  if (userIndex === -1) {
    return false;
  }
  
  // Update username and ensure it's saved
  users[userIndex].username = newUsername;
  const saved = writeUsersFile(users);
  
  if (saved) {
    console.log(`Username updated successfully for user ID ${id} to: ${newUsername}`);
  } else {
    console.error(`Failed to save username change for user ID ${id}`);
  }
  
  return saved;
}

/**
 * Verify a user's password
 */
export function verifyUserPassword(username: string, password: string): User | null {
  const user = getUserByUsername(username);
  
  if (!user) {
    return null;
  }
  
  const isValid = verifyPassword(password, user.password);
  return isValid ? user : null;
}

/**
 * Initialize the users file with a default admin user if it doesn't exist
 */
export function initializeUsersFile(): void {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUser: User = {
      id: 1,
      username: 'Rehan',
      password: hashPassword('0315'),
      isAdmin: true
    };
    
    writeUsersFile([defaultUser]);
    console.log('Created default user file with admin account');
  }
}