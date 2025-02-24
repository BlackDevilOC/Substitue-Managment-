import { parse } from 'csv-parse/sync';
import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';

export async function processTimetableCSV(fileContent: string): Promise<Schedule[]> {
  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true
  });

  const schedules: Schedule[] = [];
  const validClasses = ['10a', '10b', '10c', '9a', '9b', '9c', 
                       '8a', '8b', '8c', '7a', '7b', '7c', 
                       '6a', '6b', '6c'];

  // Skip header row
  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    const day = row[0].toLowerCase();
    const period = parseInt(row[1]);

    // Each subsequent column represents a teacher for a class
    for (let j = 2; j < row.length; j++) {
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
}

export async function processSubstituteCSV(fileContent: string): Promise<Teacher[]> {
  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true
  });

  const teachers: Teacher[] = [];
  
  // Process each row (skip header)
  for (let i = 1; i < records.length; i++) {
    const [name, phoneNumber] = records[i];
    if (name && phoneNumber) {
      const teacher = await findOrCreateTeacher(name.trim(), true, phoneNumber.trim());
      teachers.push(teacher);
    }
  }

  return teachers;
}

async function findOrCreateTeacher(
  name: string,
  isSubstitute: boolean = false,
  phoneNumber?: string
): Promise<Teacher> {
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
}
