
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSIGNMENTS_PATH = path.join(__dirname, '../data/teacher_assignments.json');
const ABSENCES_PATH = path.join(__dirname, '../data/absent_teachers.json');

interface User {
  id: number;
  username: string;
  password: string;
}

let users: User[] = [];
let nextUserId = 1;

export const storage = {
  sessionStore: new Map(),

  async getUser(id: number) {
    return users.find(u => u.id === id);
  },

  async getUserByUsername(username: string) {
    return users.find(u => u.username === username);
  },

  async createUser(data: { username: string; password: string }) {
    const user = {
      id: nextUserId++,
      username: data.username,
      password: data.password
    };
    users.push(user);
    return user;
  },

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
