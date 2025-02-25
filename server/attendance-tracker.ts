
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse, stringify } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATTENDANCE_FILE_PATH = path.join(__dirname, '../data/teacher_attendance.csv');
const TIMETABLE_PATH = path.join(__dirname, '../data/timetable_file.csv');
const SUBSTITUTE_PATH = path.join(__dirname, '../data/Substitude_file.csv');

interface TeacherAttendance {
  date: string;
  teacherName: string;
  status: 'Present' | 'Absent';
  notes?: string;
}

export function getAllTeachers(): string[] {
  const teachers = new Set<string>();
  
  // Read from timetable
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

  // Read from substitute file
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

  return Array.from(teachers);
}

export function recordAttendance(date: string, teacherName: string, status: 'Present' | 'Absent', notes?: string) {
  const record: TeacherAttendance = {
    date,
    teacherName: teacherName.toLowerCase().trim(),
    status,
    notes
  };

  const content = `${record.date},${record.teacherName},${record.status},${record.notes || ''}\n`;
  fs.appendFileSync(ATTENDANCE_FILE_PATH, content);
}

export function getAttendanceByDate(date: string): TeacherAttendance[] {
  const content = fs.readFileSync(ATTENDANCE_FILE_PATH, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return records.filter((record: TeacherAttendance) => record.date === date);
}
