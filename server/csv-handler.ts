import { parse } from 'csv-parse/sync';
import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIMETABLE_PATH = path.join(__dirname, '../data/timetable_file.csv');
const SUBSTITUTE_PATH = path.join(__dirname, '../data/Substitude_file.csv');
const TOTAL_TEACHERS_PATH = path.join(__dirname, '../data/Total_Teacher.csv');

interface TeacherInfo {
  name: string;
  isSubstitute: boolean;
  phoneNumber?: string;
}

export function extractAndSaveTeachers(timetableContent: string, substituteContent: string): TeacherInfo[] {
  const teachers = new Set<string>();
  const teacherInfo: TeacherInfo[] = [];
  const substitutes = new Map<string, string>(); // name -> phone number

  // Process substitute teachers first
  const substituteRecords = parse(substituteContent, {
    columns: false,
    skip_empty_lines: true,
    trim: true
  });

  for (const row of substituteRecords) {
    if (row[0]) {
      const name = normalizeTeacherName(row[0]);
      const phone = row[1]?.trim() || undefined;
      substitutes.set(name, phone);
      teachers.add(name);
    }
  }

  // Process timetable teachers
  const timetableRecords = parse(timetableContent, {
    columns: false,
    skip_empty_lines: true,
    trim: true
  });

  // Skip header row
  for (let i = 1; i < timetableRecords.length; i++) {
    const row = timetableRecords[i];
    for (let j = 2; j < row.length; j++) {
      if (row[j] && row[j].toLowerCase() !== 'empty') {
        const name = normalizeTeacherName(row[j]);
        teachers.add(name);
      }
    }
  }

  // Convert to TeacherInfo array
  for (const name of teachers) {
    teacherInfo.push({
      name,
      isSubstitute: substitutes.has(name),
      phoneNumber: substitutes.get(name)
    });
  }

  // Save to Total_Teacher.csv
  const csvContent = 'Name,IsSubstitute,PhoneNumber\n' + 
    teacherInfo.map(t => 
      `${t.name},${t.isSubstitute},${t.phoneNumber || ''}`
    ).join('\n');

  // Ensure data directory exists
  const dataDir = path.dirname(TOTAL_TEACHERS_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(TOTAL_TEACHERS_PATH, csvContent, 'utf-8');

  return teacherInfo;
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

    // Save timetable file
    fs.writeFileSync(TIMETABLE_PATH, fileContent, 'utf-8');

    // Clear existing schedules before adding new ones
    await storage.clearSchedules();

    // Skip header row
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (!row[0] || !row[1]) continue;

      const rawDay = row[0].toLowerCase().trim();
      const day = normalizeDay(rawDay);
      if (!day) {
        console.warn(`Skipping invalid day at line ${i + 1}: ${rawDay}`);
        continue;
      }

      const period = parseInt(row[1].trim());
      if (isNaN(period)) {
        console.warn(`Skipping invalid period number at line ${i + 1}`);
        continue;
      }

      for (let j = 2; j < Math.min(row.length, validClasses.length + 2); j++) {
        const teacherName = row[j]?.trim();
        if (teacherName && teacherName.toLowerCase() !== 'empty') {
          let teacher = await findOrCreateTeacher(normalizeTeacherName(teacherName));

          schedules.push({
            id: 0,
            day,
            period,
            teacherId: teacher.id,
            className: validClasses[j - 2]
          });
        }
      }
    }

    return schedules;
  } catch (error: any) {
    console.error('Error processing timetable CSV:', error);
    throw new Error(`Failed to process timetable: ${error.message}`);
  }
}

export async function processSubstituteCSV(fileContent: string): Promise<Teacher[]> {
  try {
    // Save substitute file
    fs.writeFileSync(SUBSTITUTE_PATH, fileContent, 'utf-8');

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

    // If both files exist, extract and save total teachers
    if (fs.existsSync(TIMETABLE_PATH)) {
      const timetableContent = fs.readFileSync(TIMETABLE_PATH, 'utf-8');
      extractAndSaveTeachers(timetableContent, fileContent);
    }

    return teachers;
  } catch (error: any) {
    console.error('Error processing substitute CSV:', error);
    throw new Error(`Failed to process substitute data: ${error.message}`);
  }
}

function normalizeDay(day: string): string | null {
  const days: Record<string, string> = {
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'thurday': 'thursday', // Handle common typo
    'friday': 'friday',
    'saturday': 'saturday'
  };
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