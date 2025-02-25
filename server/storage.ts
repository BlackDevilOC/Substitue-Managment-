
import * as fs from 'fs';
import * as path from 'path';

const ASSIGNMENTS_PATH = path.join(__dirname, '../data/teacher_assignments.json');
const ABSENCES_PATH = path.join(__dirname, '../data/absent_teachers.json');

export const storage = {
  getTeachers() {
    const assignments = JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, 'utf-8'));
    return Object.keys(assignments.teachers || {});
  },

  getSchedulesByDay(day: string) {
    const assignments = JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, 'utf-8'));
    return assignments.teachers?.[day.toLowerCase()] || {};
  },

  createAbsence(data: { teacherId: string, date: string }) {
    const absences = JSON.parse(fs.readFileSync(ABSENCES_PATH, 'utf-8'));
    absences.absent_teachers.push({
      name: data.teacherId,
      date: data.date
    });
    fs.writeFileSync(ABSENCES_PATH, JSON.stringify(absences, null, 2));
    return absences;
  },

  assignSubstitute(teacherId: string, substituteId: string, date: string) {
    const assignments = JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, 'utf-8'));
    if (!assignments.absences[date]) {
      assignments.absences[date] = {};
    }
    assignments.absences[date][teacherId] = {
      substitute: substituteId
    };
    fs.writeFileSync(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2));
  }
};
