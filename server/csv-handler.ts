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

    // Skip header row
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (!row[0] || !row[1]) continue;

      // Normalize day name
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

      // Process each teacher column
      for (let j = 2; j < Math.min(row.length, validClasses.length + 2); j++) {
        const teacherName = row[j]?.trim();
        if (teacherName && teacherName.toLowerCase() !== 'empty') {
          let teacher = await findOrCreateTeacher(normalizeTeacherName(teacherName));

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
  const days = {
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
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as csv from 'csv-parser';

interface Teacher {
    name: string;
    phone?: string;
}

async function readCSV(filePath: string): Promise<Teacher[]> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return resolve([]);
        }

        const teachers: Teacher[] = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                // Try to find name and phone in various possible column names
                let name = null;
                let phone = null;

                // Check known column names for name
                if (row['name']) name = row['name'];
                else if (row['Name']) name = row['Name'];
                else if (row['teacher']) name = row['teacher'];
                else if (row['Teacher']) name = row['Teacher'];
                else {
                    // If no known column, try first column value
                    const firstKey = Object.keys(row)[0];
                    if (firstKey) name = firstKey;
                }

                // Check known column names for phone
                if (row['phone']) phone = row['phone'];
                else if (row['Phone']) phone = row['Phone'];
                else if (row['mobile']) phone = row['mobile'];
                else if (row['Mobile']) phone = row['Mobile'];
                else if (row['contact']) phone = row['contact'];
                else if (row['Contact']) phone = row['Contact'];
                else {
                    // If no known column, try second column value
                    const keys = Object.keys(row);
                    if (keys.length > 1) phone = row[keys[1]];
                }

                if (name) {
                    teachers.push({ name, phone });
                }
            })
            .on('end', () => {
                console.log(`Successfully read ${teachers.length} teachers from ${filePath}`);
                resolve(teachers);
            })
            .on('error', (error) => {
                console.error(`Error reading CSV file ${filePath}:`, error);
                reject(error);
            });
    });
}

function findSimilarTeachers(teachers: Teacher[]): Map<string, string> {
    // Map to store corrections: original name -> corrected name
    const corrections = new Map<string, string>();

    // Common patterns for names that should be the same
    const patterns = [
        // Common typos and variations
        { regex: /(\w+)\s+(\w+)b/, replacement: "$1 $2" }, // Handles "Shabeer Ahmedb" -> "Shabeer Ahmed"
        { regex: /Masseh/, replacement: "Maseeh" }, // Specific case "Rafaqat Masseh" -> "Rafaqat Maseeh"
        { regex: /\s+Shaikh$/, replacement: "" }, // Handles "Wajiudin Shaikh" -> "Wajiudin"
        { regex: /-ul-/, replacement: " Ul " }, // Normalize ul/Ul forms
        { regex: / ul /, replacement: " Ul " }, // Capitalize Ul
    ];

    // Create name map for quick lookup
    const nameMap = new Map<string, Teacher>();
    const nameVariants = new Map<string, string[]>();

    // First pass: collect all names
    teachers.forEach(teacher => {
        const name = teacher.name.trim();
        nameMap.set(name, teacher);

        // Get teacher's base name (without title)
        const baseName = name.replace(/^Sir\s+|^Ms\.\s+|^Mrs\.\s+|^Miss\s+/i, "").trim();

        if (!nameVariants.has(baseName)) {
            nameVariants.set(baseName, [name]);
        } else {
            nameVariants.get(baseName)?.push(name);
        }
    });

    // Apply pattern-based corrections
    teachers.forEach(teacher => {
        const originalName = teacher.name.trim();

        // Try each pattern
        for (const pattern of patterns) {
            if (pattern.regex.test(originalName)) {
                const correctedName = originalName.replace(pattern.regex, pattern.replacement);

                // If the corrected name exists as another teacher, mark as duplicate
                if (nameMap.has(correctedName) && correctedName !== originalName) {
                    corrections.set(originalName, correctedName);
                    console.log(`Found duplicate: "${originalName}" -> "${correctedName}"`);
                    break;
                }
            }
        }
    });

    // Second pass: check for similar names using Levenshtein distance
    nameVariants.forEach((variants, baseName) => {
        if (variants.length > 1) {
            // Sort by length (prefer shorter names as canonical)
            variants.sort((a, b) => a.length - b.length);
            const canonicalName = variants[0];

            // Mark all other variants as duplicates
            for (let i = 1; i < variants.length; i++) {
                if (!corrections.has(variants[i])) {
                    corrections.set(variants[i], canonicalName);
                    console.log(`Found similar names: "${variants[i]}" -> "${canonicalName}"`);
                }
            }
        }
    });

    return corrections;
}

export async function extractTeacherNames(timetablePath: string, substitutePath: string): Promise<Teacher[]> {
    try {
        console.log(`Reading teachers from: ${timetablePath} and ${substitutePath}`);

        // Create arrays to store teachers from both files
        let timetableTeachers: Teacher[] = [];
        let substituteTeachers: Teacher[] = [];

        // Read from timetable file
        try {
            timetableTeachers = await readCSV(timetablePath);
            console.log(`Found ${timetableTeachers.length} teachers in timetable file`);
        } catch (err: any) {
            console.warn(`Error reading timetable file: ${err.message}`);
        }

        // Read from substitute file
        try {
            substituteTeachers = await readCSV(substitutePath);
            console.log(`Found ${substituteTeachers.length} teachers in substitute file`);
        } catch (err: any) {
            console.warn(`Error reading substitute file: ${err.message}`);
        }

        // Combine all teachers 
        const allTeachers = [...timetableTeachers, ...substituteTeachers];

        // Find similar teacher names that might be duplicates
        const corrections = findSimilarTeachers(allTeachers);
        console.log(`Found ${corrections.size} potential duplicate teachers to fix`);

        // Use a Map to store unique teachers by normalized name
        const teacherMap = new Map<string, Teacher>();

        // Process each teacher, applying corrections and keeping phone numbers when available
        allTeachers.forEach(teacher => {
            if (teacher.name) {
                // Apply correction if this teacher name has a known correction
                const originalName = teacher.name.trim();
                const correctedName = corrections.has(originalName) 
                    ? corrections.get(originalName)!
                    : originalName;

                const normalizedName = correctedName.toLowerCase().trim();

                if (!teacherMap.has(normalizedName)) {
                    teacherMap.set(normalizedName, {
                        name: correctedName,
                        phone: teacher.phone
                    });
                } else if (teacher.phone && !teacherMap.get(normalizedName)?.phone) {
                    // If this entry has a phone number but stored one doesn't, update it
                    const existingTeacher = teacherMap.get(normalizedName);
                    teacherMap.set(normalizedName, {
                        ...existingTeacher!,
                        phone: teacher.phone
                    });
                }
            }
        });

        const uniqueTeachers = Array.from(teacherMap.values());
        console.log(`Extracted ${uniqueTeachers.length} unique teachers after fixing duplicates`);
        return uniqueTeachers;
    } catch (error) {
        console.error('Error extracting teacher names:', error);
        return [];
    }
}

export async function clearAttendanceStorage(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
        // Get all keys in localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('attendance_')) {
                keysToRemove.push(key);
            }
        }

        // Remove all attendance-related keys
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`Cleared ${keysToRemove.length} attendance records from storage`);
    }
}

interface TeacherSchedule {
  [day: string]: {
    [className: string]: number;  // period number
  };
}

interface DaySchedule {
  [period: number]: {
    [className: string]: string;  // teacher name
  };
}

export async function processTeacherTimetables(fileContent: string): Promise<void> {
  try {
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    const teacherSchedules: { [teacherName: string]: TeacherSchedule } = {};
    const daySchedules: { [day: string]: DaySchedule } = {};
    const validClasses = ['10a', '10b', '10c', '9a', '9b', '9c', 
                         '8a', '8b', '8c', '7a', '7b', '7c', 
                         '6a', '6b', '6c'];

    // Skip header row
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (!row[0] || !row[1]) continue;

      const rawDay = row[0].toLowerCase().trim();
      const day = normalizeDay(rawDay);
      if (!day) continue;

      const period = parseInt(row[1].trim());
      if (isNaN(period)) continue;

      // Initialize day schedule if not exists
      if (!daySchedules[day]) {
        daySchedules[day] = {};
      }
      if (!daySchedules[day][period]) {
        daySchedules[day][period] = {};
      }

      // Process each teacher column
      for (let j = 2; j < Math.min(row.length, validClasses.length + 2); j++) {
        const teacherName = row[j]?.trim();
        const className = validClasses[j - 2];

        if (teacherName && teacherName.toLowerCase() !== 'empty') {
          // Add to teacher schedule
          if (!teacherSchedules[teacherName]) {
            teacherSchedules[teacherName] = {};
          }
          if (!teacherSchedules[teacherName][day]) {
            teacherSchedules[teacherName][day] = {};
          }
          teacherSchedules[teacherName][day][className] = period;

          // Add to day schedule
          daySchedules[day][period][className] = teacherName;
        }
      }
    }

    // Save teacher schedules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataFolder = path.join(__dirname, '../data');

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataFolder)) {
      fs.mkdirSync(dataFolder, { recursive: true });
    }

    // Save individual teacher schedules
    const teacherSchedulesFolder = path.join(dataFolder, 'teacher_schedules');
    if (!fs.existsSync(teacherSchedulesFolder)) {
      fs.mkdirSync(teacherSchedulesFolder, { recursive: true });
    }

    Object.entries(teacherSchedules).forEach(([teacherName, schedule]) => {
      const filename = teacherName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_schedule.json';
      fs.writeFileSync(
        path.join(teacherSchedulesFolder, filename),
        JSON.stringify(schedule, null, 2)
      );
    });

    // Save daily schedules
    fs.writeFileSync(
      path.join(dataFolder, 'daily_schedules.json'),
      JSON.stringify(daySchedules, null, 2)
    );

    console.log(`Processed and saved schedules for ${Object.keys(teacherSchedules).length} teachers`);
    console.log('Daily schedules saved to daily_schedules.json');

  } catch (error) {
    console.error('Error processing teacher timetables:', error);
    throw error;
  }
}