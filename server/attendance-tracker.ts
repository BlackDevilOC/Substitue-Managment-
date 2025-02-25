import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const ASSIGNMENTS_PATH = path.join(__dirname, '../data/teacher_assignments.json');
const TIMETABLE_PATH = path.join(__dirname, '../data/timetable_file.csv');

export function getAllTeachers(): string[] {
  if (!fs.existsSync(TIMETABLE_PATH)) return [];

  const timetableContent = fs.readFileSync(TIMETABLE_PATH, 'utf-8');
  const timetableRecords = parse(timetableContent, {
    columns: false,
    skip_empty_lines: true,
    trim: true
  });

  const teachers = new Set<string>();
  for (let i = 1; i < timetableRecords.length; i++) {
    const row = timetableRecords[i];
    for (let j = 2; j < row.length; j++) {
      if (row[j] && row[j].toLowerCase() !== 'empty') {
        teachers.add(row[j].toLowerCase().trim());
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

function reloadAssignmentsIfChanged() {
  const assignments = JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, 'utf-8'));
  const timetableContent = fs.readFileSync(TIMETABLE_PATH, 'utf-8');
  const newAssignments = convertTimetableToJSON(timetableContent);
  
  if (JSON.stringify(assignments.teachers) !== JSON.stringify(newAssignments.teachers)) {
    fs.writeFileSync(ASSIGNMENTS_PATH, JSON.stringify(newAssignments, null, 2));
    return true;
  }
  return false;
}

export function recordAttendance(date: string, teacherName: string, status: 'Present' | 'Absent', period?: number, className?: string, substituteTeacher?: string) {
  // Check for timetable changes before recording attendance
  if (reloadAssignmentsIfChanged()) {
    console.log('Timetable changes detected and reloaded');
  }
  // Update JSON assignments
  const assignments = JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, 'utf-8'));

  if (status === 'Absent') {
    if (!assignments.absences[date]) {
      assignments.absences[date] = {};
    }
    assignments.absences[date][teacherName.toLowerCase()] = {
      periods: period ? [period] : [],
      substitute: substituteTeacher
    };
  }
  fs.writeFileSync(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2));

  // Update CSV attendance record
  const csvRecord = `${date},${teacherName},${status},${substituteTeacher || ''},${className || ''}\n`;
  fs.appendFileSync(path.join(__dirname, '../data/teacher_attendance.csv'), csvRecord);

  return assignments;
}

export function getAbsentTeachers(date: string) {
  const assignments = JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, 'utf-8'));
  return assignments.absences[date] || {};
}

const teacherAssignments: { [key: string]: TeacherAssignment } = {};

interface TeacherAssignment {
  teacherName: string;
  period: number;
  class: string;
}