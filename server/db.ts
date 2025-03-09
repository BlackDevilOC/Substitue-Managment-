import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// Create a new database connection
const sqlite = new Database('school_schedule.db');

// Create drizzle database instance
export const db = drizzle(sqlite, { schema });

// Export the raw SQLite connection for advanced operations if needed
export const sqliteDb = sqlite;