import { parse } from 'csv-parse/sync';
import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';

export async function processTimetableCSV(fileContent: string): Promise<Schedule[]> {
  try {
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length < 2) { // At least header + one data row
      throw new Error("CSV file must contain at least a header row and one data row");
    }

    const schedules: Schedule[] = [];
    const validClasses = ['10a', '10b', '10c', '9a', '9b', '9c', 
                         '8a', '8b', '8c', '7a', '7b', '7c', 
                         '6a', '6b', '6c'];

    // Skip header row
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row.length < 3) { // day, period, and at least one teacher
        throw new Error(`Invalid row format at line ${i + 1}`);
      }

      const day = row[0].toLowerCase();
      const period = parseInt(row[1]);

      if (isNaN(period)) {
        throw new Error(`Invalid period number at line ${i + 1}`);
      }

      // Each subsequent column represents a teacher for a class
      for (let j = 2; j < row.length && j - 2 < validClasses.length; j++) {
        const teacherName = row[j].trim();
        if (teacherName) {
          // Find or create teacher
          let teacher = await findOrCreateTeacher(teacherName);

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
  } catch (error) {
    console.error('Error processing timetable CSV:', error);
    throw new Error(`Failed to process timetable: ${error.message}`);
  }
}

export async function processSubstituteCSV(fileContent: string): Promise<Teacher[]> {
  try {
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length < 2) {
      throw new Error("CSV file must contain at least a header row and one data row");
    }

    const teachers: Teacher[] = [];

    // Process each row (skip header)
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row.length < 2) {
        throw new Error(`Invalid row format at line ${i + 1}`);
      }

      const [name, phoneNumber] = row;
      if (!name || !phoneNumber) {
        throw new Error(`Missing name or phone number at line ${i + 1}`);
      }

      const teacher = await findOrCreateTeacher(name.trim(), true, phoneNumber.trim());
      teachers.push(teacher);
    }

    return teachers;
  } catch (error) {
    console.error('Error processing substitute CSV:', error);
    throw new Error(`Failed to process substitute data: ${error.message}`);
  }
}

async function findOrCreateTeacher(
  name: string,
  isSubstitute: boolean = false,
  phoneNumber?: string
): Promise<Teacher> {
  try {
    const teachers = await storage.getTeachers();
    const existingTeacher = teachers.find(t => t.name.toLowerCase() === name.toLowerCase());

    if (existingTeacher) {
      return existingTeacher;
    }

    return await storage.createTeacher({
      name,
      isSubstitute,
      phoneNumber: phoneNumber || null
    });
  } catch (error) {
    console.error('Error finding/creating teacher:', error);
    throw new Error(`Failed to process teacher data: ${error.message}`);
  }
}