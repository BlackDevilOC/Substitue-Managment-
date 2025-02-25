import { IStorage } from "./types";
import type { User, InsertUser, Teacher, Schedule, Absence, TeacherAttendance, InsertTeacherAttendance } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private teachers: Map<number, Teacher>;
  private schedules: Map<number, Schedule>;
  private absences: Map<number, Absence>;
  private teacherAttendances: Map<number, TeacherAttendance>; // Added teacher attendance storage
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.teachers = new Map();
    this.schedules = new Map();
    this.absences = new Map();
    this.teacherAttendances = new Map(); // Initialize teacher attendance map
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, isAdmin: false };
    this.users.set(id, user);
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.users.set(id, { ...user, password });
    }
  }

  // Teacher methods
  async createTeacher(teacher: Omit<Teacher, "id">): Promise<Teacher> {
    const id = this.currentId++;
    const newTeacher = { ...teacher, id };
    this.teachers.set(id, newTeacher);
    return newTeacher;
  }

  async getTeachers(): Promise<Teacher[]> {
    return Array.from(this.teachers.values());
  }

  // Schedule methods
  async createSchedule(schedule: Omit<Schedule, "id">): Promise<Schedule> {
    const id = this.currentId++;
    const newSchedule = { ...schedule, id };
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }

  async getSchedulesByDay(day: string): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(s => s.day === day);
  }

  // Clear all schedules - useful for re-uploading timetable
  async clearSchedules(): Promise<void> {
    this.schedules.clear();
  }

  // Absence methods
  async createAbsence(absence: Omit<Absence, "id">): Promise<Absence> {
    const id = this.currentId++;
    const newAbsence = { ...absence, id };
    this.absences.set(id, newAbsence);
    return newAbsence;
  }

  async getAbsences(): Promise<Absence[]> {
    return Array.from(this.absences.values());
  }

  async assignSubstitute(absenceId: number, substituteId: number): Promise<void> {
    const absence = this.absences.get(absenceId);
    if (absence) {
      this.absences.set(absenceId, { ...absence, substituteId });
    }
  }

  // Teacher Attendance methods
  async createTeacherAttendance(attendance: Omit<TeacherAttendance, "id">): Promise<TeacherAttendance> {
    const id = this.currentId++;
    const newAttendance = { ...attendance, id };
    this.teacherAttendances.set(id, newAttendance);
    return newAttendance;
  }

  async getTeacherAttendanceByDate(date: string): Promise<TeacherAttendance[]> {
    const dateObj = new Date(date);
    return Array.from(this.teacherAttendances.values()).filter(a => a.date.toDateString() === dateObj.toDateString());
  }


  async getTeacherAttendanceBetweenDates(startDate: string, endDate: string): Promise<TeacherAttendance[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Array.from(this.teacherAttendances.values()).filter(a => a.date >= start && a.date <= end);
  }

}

export const storage = new MemStorage();