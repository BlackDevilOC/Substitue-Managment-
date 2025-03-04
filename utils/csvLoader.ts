
import * as fs from 'fs';
import * as csv from 'csv-parser';

interface Teacher {
  name: string;
  phone?: string;
  id?: number;
}

export async function readCSV(filePath: string): Promise<Teacher[]> {
  return new Promise((resolve, reject) => {
    const teachers: Teacher[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const name = row['name'] || row['Sir Bakir Shah']; // Adjust based on CSV structure
        const phone = row['phone'] || row['+923156103995']; // Adjust based on CSV structure
        if (name) {
          teachers.push({ name, phone });
        }
      })
      .on('end', () => {
        resolve(teachers);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

export async function extractTeacherNames(timetablePath: string, substitutePath: string): Promise<Teacher[]> {
  try {
    const timetableTeachers = await readCSV(timetablePath);
    const substituteTeachers = await readCSV(substitutePath);

    const allTeachers = [...timetableTeachers, ...substituteTeachers];
    
    // Create a map to deduplicate teachers by name
    const teacherMap = new Map<string, Teacher>();
    allTeachers.forEach((teacher, index) => {
      if (!teacherMap.has(teacher.name)) {
        teacherMap.set(teacher.name, { 
          ...teacher, 
          id: index + 1 // Assign an ID to each unique teacher
        });
      }
    });
    
    return Array.from(teacherMap.values());
  } catch (error) {
    console.error('Error extracting teacher names:', error);
    return [];
  }
}

export async function saveTeachersToAttendanceFile(teachers: Teacher[]): Promise<void> {
  try {
    // Create a simple CSV format
    const header = 'id,name,phone\n';
    const rows = teachers.map(teacher => 
      `${teacher.id || ''},${teacher.name || ''},${teacher.phone || ''}`
    ).join('\n');
    
    const csvContent = header + rows;
    
    // Save to attendance file
    fs.writeFileSync('data/teacher_attendance.csv', csvContent);
    console.log('Teachers saved to attendance file');
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error saving teachers to attendance file:', error);
    return Promise.reject(error);
  }
}

export async function loadTeachersFromAttendanceFile(): Promise<Teacher[]> {
  try {
    return await readCSV('data/teacher_attendance.csv');
  } catch (error) {
    console.error('Error loading teachers from attendance file:', error);
    return [];
  }
}
