
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse, stringify } from 'csv-parse/sync';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATTENDANCE_FILE_PATH = path.join(__dirname, '../data/teacher_attendance.csv');
const TIMETABLE_PATH = path.join(__dirname, '../data/timetable_file.csv');
const SUBSTITUTE_PATH = path.join(__dirname, '../data/Substitude_file.csv');

interface TeacherAttendance {
  date: string;
  teacherName: string;
  status: 'Present' | 'Absent';
  period?: number;
  class?: string;
  notes?: string;
}

interface TeacherAssignment {
  teacherName: string;
  period: number;
  class: string;
}

const teacherAssignments: { [key: string]: TeacherAssignment } = {};

export function getAllTeachers(): string[] {
  const teachers = new Set<string>();
  
  // Read from timetable
  if (fs.existsSync(TIMETABLE_PATH)) {
    const timetableContent = fs.readFileSync(TIMETABLE_PATH, 'utf-8');
    const timetableRecords = parse(timetableContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    // Skip header row and collect teachers
    for (let i = 1; i < timetableRecords.length; i++) {
      const row = timetableRecords[i];
      for (let j = 2; j < row.length; j++) {
        if (row[j] && row[j].toLowerCase() !== 'empty') {
          teachers.add(row[j].toLowerCase().trim());
        }
      }
    }
  }

  // Read from substitute file
  if (fs.existsSync(SUBSTITUTE_PATH)) {
    const substituteContent = fs.readFileSync(SUBSTITUTE_PATH, 'utf-8');
    const substituteRecords = parse(substituteContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    // Collect substitute teachers
    for (const row of substituteRecords) {
      if (row[0]) {
        teachers.add(row[0].toLowerCase().trim());
      }
    }
  }

  return Array.from(teachers);
}

export function assignTeacher(teacherName: string, period: number, className: string) {
  const key = `${period}-${className}`;
  teacherAssignments[key] = {
    teacherName: teacherName.toLowerCase().trim(),
    period,
    class: className.toLowerCase().trim()
  };
  return teacherAssignments[key];
}

export function getTeacherForClass(period: number, className: string) {
  const key = `${period}-${className}`;
  return teacherAssignments[key];
}

export function recordAttendance(date: string, teacherName: string, status: 'Present' | 'Absent', period?: number, className?: string, notes?: string) {
  const record: TeacherAttendance = {
    date,
    teacherName: teacherName.toLowerCase().trim(),
    status,
    period,
    notes
  };

  // Ensure directory exists
  const dir = path.dirname(ATTENDANCE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create file with header if it doesn't exist
  if (!fs.existsSync(ATTENDANCE_FILE_PATH)) {
    fs.writeFileSync(ATTENDANCE_FILE_PATH, 'Date,TeacherName,Status,Period,Notes\n');
  }

  // Save to CSV file
  const content = `${record.date},${record.teacherName},${record.status},${record.period || ''},${record.notes || ''}\n`;
  fs.appendFileSync(ATTENDANCE_FILE_PATH, content);
  return record;
}

export function getAttendanceByDate(date: string): TeacherAttendance[] {
  if (!fs.existsSync(ATTENDANCE_FILE_PATH)) {
    return [];
  }

  const content = fs.readFileSync(ATTENDANCE_FILE_PATH, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return records.filter((record: TeacherAttendance) => record.date === date);
}

export function getAllTeachersAttendance(): TeacherAttendance[] {
  if (!fs.existsSync(ATTENDANCE_FILE_PATH)) {
    return [];
  }

  const content = fs.readFileSync(ATTENDANCE_FILE_PATH, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return records;
}
