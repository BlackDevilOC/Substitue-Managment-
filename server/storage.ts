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
  private teacherAttendances: Map<number, TeacherAttendance>;
  private substituteUsage: Map<number, number>; // Track how many times each substitute is assigned
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.teachers = new Map();
    this.schedules = new Map();
    this.absences = new Map();
    this.teacherAttendances = new Map();
    this.substituteUsage = new Map();
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

  async getTeacher(id: number): Promise<Teacher | undefined> {
    return this.teachers.get(id);
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

  async autoAssignSubstitutes(date: string): Promise<Map<number, number>> {
    const assignments = new Map<number, number>(); // absenceId -> substituteId
    const absentTeachers = Array.from(this.absences.values())
      .filter(a => a.date === date && !a.substituteId);

    for (const absence of absentTeachers) {
      const absentTeacher = await this.getTeacher(absence.teacherId);
      if (!absentTeacher) continue;

      // Get all schedules for the absent teacher on this day
      const daySchedules = Array.from(this.schedules.values())
        .filter(s => s.teacherId === absence.teacherId);

      // Find available substitutes
      const allTeachers = await this.getTeachers();
      const substitutes = allTeachers.filter(t => 
        t.isSubstitute && 
        !absentTeachers.some(a => a.teacherId === t.id) &&
        !this.isTeacherOverloaded(t.id, date)
      );

      if (substitutes.length === 0) {
        // Try using regular teachers as backup
        const regularTeachers = allTeachers.filter(t => 
          !t.isSubstitute && 
          !absentTeachers.some(a => a.teacherId === t.id) &&
          !this.isTeacherOverloaded(t.id, date)
        );
        
        if (regularTeachers.length > 0) {
          // Use regular teacher with least workload
          const substitute = regularTeachers.sort((a, b) => 
            (this.substituteUsage.get(a.id) || 0) - (this.substituteUsage.get(b.id) || 0)
          )[0];
          await this.assignSubstitute(absence.id, substitute.id);
          this.substituteUsage.set(substitute.id, (this.substituteUsage.get(substitute.id) || 0) + 1);
          assignments.set(absence.id, substitute.id);
        }
        continue;
      }

      // Sort substitutes by usage count
      const sortedSubstitutes = substitutes.sort((a, b) => 
        (this.substituteUsage.get(a.id) || 0) - (this.substituteUsage.get(b.id) || 0)
      );

      // Assign the substitute with the least workload
      const substitute = sortedSubstitutes[0];
      await this.assignSubstitute(absence.id, substitute.id);
      this.substituteUsage.set(substitute.id, (this.substituteUsage.get(substitute.id) || 0) + 1);
      assignments.set(absence.id, substitute.id);
    }

    return assignments;
  }

  async getSubstituteAssignments(date: string): Promise<{ 
    absence: Absence;
    teacher: Teacher;
    substitute?: Teacher;
    schedules: Schedule[];
  }[]> {
    const absences = Array.from(this.absences.values())
      .filter(a => a.date === date);

    const result = [];

    for (const absence of absences) {
      const teacher = await this.getTeacher(absence.teacherId);
      const substitute = absence.substituteId ? await this.getTeacher(absence.substituteId) : undefined;
      const schedules = Array.from(this.schedules.values())
        .filter(s => s.teacherId === absence.teacherId);

      if (teacher) {
        result.push({ absence, teacher, substitute, schedules });
      }
    }

    return result;
  }
}

export const storage = new MemStorage();
  private isTeacherOverloaded(teacherId: number, date: string): boolean {
    const MAX_DAILY_SUBSTITUTIONS = 3;
    const assignments = Array.from(this.absences.values())
      .filter(a => a.date === date && a.substituteId === teacherId);
    return assignments.length >= MAX_DAILY_SUBSTITUTIONS;
  }
