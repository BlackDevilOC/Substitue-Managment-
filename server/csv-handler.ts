import { parse } from 'csv-parse/sync';
import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface TeacherData {
  name: string;
  phone?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIMETABLE_PATH = path.join(__dirname, '../data/timetable_file.csv');
const SUBSTITUTE_PATH = path.join(__dirname, '../data/Substitude_file.csv');

export async function loadInitialData() {
  try {
    // Check if files exist before reading
    if (!fs.existsSync(TIMETABLE_PATH)) {
      console.log(`Timetable file not found at ${TIMETABLE_PATH}`);
    } else {
      const timetableContent = fs.readFileSync(TIMETABLE_PATH, 'utf-8');
      await processTimetableCSV(timetableContent);
      console.log('Timetable data loaded successfully');
    }

    if (!fs.existsSync(SUBSTITUTE_PATH)) {
      console.log(`Substitute file not found at ${SUBSTITUTE_PATH}`);
    } else {
      const substituteContent = fs.readFileSync(SUBSTITUTE_PATH, 'utf-8');
      await processSubstituteCSV(substituteContent);
      console.log('Substitute data loaded successfully');
    }

    console.log('Initial data loading completed');
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
}

export async function processTimetableCSV(fileContent: string): Promise<Schedule[]> {
  try {
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    if (records.length < 2) {
      throw new Error("CSV file must contain at least a header row and one data row");
    }

    const schedules: Schedule[] = [];
    const validClasses = ['10a', '10b', '10c', '9a', '9b', '9c', 
                       '8a', '8b', '8c', '7a', '7b', '7c', 
                       '6a', '6b', '6c'];

    // Clear existing schedules before adding new ones
    await storage.clearSchedules();

    // Skip header row explicitly
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (!row[0] || !row[1]) {
        console.warn(`Skipping invalid row ${i + 1}: missing day or period`);
        continue;
      }

      // Normalize day name
      const rawDay = row[0].toLowerCase().trim();
      const day = normalizeDay(rawDay);
      if (!day) {
        console.warn(`Skipping invalid day at line ${i + 1}: ${rawDay}`);
        continue;
      }

      const period = parseInt(row[1].trim());
      if (isNaN(period) || period < 1 || period > 8) {
        console.warn(`Skipping invalid period number at line ${i + 1}: ${row[1]}`);
        continue;
      }

      // Process each teacher column
      for (let j = 2; j < Math.min(row.length, validClasses.length + 2); j++) {
        const teacherName = row[j]?.trim();
        if (teacherName && teacherName.toLowerCase() !== 'empty') {
          const normalizedTeacherName = normalizeTeacherName(teacherName);
          let teacher = await findOrCreateTeacher(normalizedTeacherName);

          schedules.push({
            id: 0, // Will be set by storage
            day,
            period,
            teacherId: teacher.id,
            className: validClasses[j - 2]
          });
        }
      }
    }

    console.log(`Processed ${schedules.length} schedule entries`);
    return schedules;
  } catch (error: any) {
    console.error('Error processing timetable CSV:', error);
    throw new Error(`Failed to process timetable: ${error.message}`);
  }
}

export async function processSubstituteCSV(fileContent: string): Promise<Teacher[]> {
  try {
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    const teachers: Teacher[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      if (row.length < 1) continue;

      const name = row[0]?.trim();
      const phoneNumber = row[1]?.trim() || null;

      if (name) {
        const teacher = await findOrCreateTeacher(normalizeTeacherName(name), true, phoneNumber);
        teachers.push(teacher);
      }
    }

    return teachers;
  } catch (error: any) {
    console.error('Error processing substitute CSV:', error);
    throw new Error(`Failed to process substitute data: ${error.message}`);
  }
}

function normalizeDay(day: string): string | null {
  const days: { [key: string]: string } = {
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'thurday': 'thursday', // Handle common typo
    'friday': 'friday',
    'saturday': 'saturday',
    // Add common variations
    'mon': 'monday',
    'tue': 'tuesday',
    'tues': 'tuesday',
    'wed': 'wednesday',
    'thu': 'thursday',
    'thur': 'thursday',
    'thurs': 'thursday',
    'fri': 'friday',
    'sat': 'saturday'
  };

  // Skip header row
  if (day.toLowerCase() === 'day') return null;

  return days[day.toLowerCase()] || null;
}

function normalizeTeacherName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findOrCreateTeacher(
  name: string,
  isSubstitute: boolean = false,
  phoneNumber?: string | null
): Promise<Teacher> {
  try {
    const teachers = await storage.getTeachers();
    const existingTeacher = teachers.find(
      t => normalizeTeacherName(t.name) === name
    );

    if (existingTeacher) {
      return existingTeacher;
    }

    return await storage.createTeacher({
      name,
      isSubstitute,
      phoneNumber: phoneNumber || null
    });
  } catch (error: any) {
    console.error('Error finding/creating teacher:', error);
    throw new Error(`Failed to process teacher data: ${error.message}`);
  }
}

export function clearAttendanceStorage(): void {
  if (typeof localStorage !== 'undefined') {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendance_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} attendance records from storage`);
  }
}