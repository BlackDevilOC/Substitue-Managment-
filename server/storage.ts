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
  private dayOverride: string | null;
  sessionStore: session.Store;
  currentId: number;
  private smsHistory: Map<number, SmsHistory>;

  constructor() {
    this.users = new Map();
    this.teachers = new Map();
    this.schedules = new Map();
    this.absences = new Map();
    this.teacherAttendances = new Map();
    this.substituteUsage = new Map();
    this.smsHistory = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  private isTeacherOverloaded(teacherId: number, date: string): boolean {
    const MAX_DAILY_SUBSTITUTIONS = 3;
    const assignments = Array.from(this.absences.values())
      .filter(a => a.date === date && a.substituteId === teacherId);
    return assignments.length >= MAX_DAILY_SUBSTITUTIONS;
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

  async clearTeachers() {
    // await db.delete(teachers);  //Commented out as it references a non-existent db variable.
    console.log('All teachers deleted from database');
  }


  // Schedule methods
  async createSchedule(schedule: Omit<Schedule, "id">): Promise<Schedule> {
    const id = this.currentId++;
    const newSchedule = { ...schedule, id };
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }

  async getSchedulesByDay(day: string): Promise<Schedule[]> {
    const effectiveDay = this.dayOverride || day;
    return Array.from(this.schedules.values()).filter(s => s.day === effectiveDay.toLowerCase());
  }

  async setDayOverride(day: string | null): Promise<void> {
    this.dayOverride = day?.toLowerCase() || null;
  }

  async getCurrentDay(): Promise<string> {
    return this.dayOverride || new Date().toLocaleDateString('en-US', { weekday: 'wednesday' }).toLowerCase();
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

  async autoAssignSubstitutes(date: string): Promise<Map<string, string>> {
    await this.loadData();

    // Import the SubstituteManager dynamically to avoid circular dependencies
    const { SubstituteManager } = await import('./substitute-manager.js');
    const manager = new SubstituteManager();

    // Load fresh data from CSV files every time to ensure we have the latest data
    await manager.loadData();

    const day = await this.getCurrentDay();
    const assignments = new Map<string, string>();

    // Get all absent teachers for today
    const absentTeachers = this.absences
      .filter((absence) => absence.date === date && !absence.substituteId)
      .map((absence) => this.teachers.find(t => t.id === absence.teacherId)?.name || '');

    if (absentTeachers.length === 0) {
      console.log('No absent teachers found for today');
      return assignments;
    }

    console.log(`Found ${absentTeachers.length} absent teachers for ${date}: ${absentTeachers.join(', ')}`);

    // Clear previous assignments
    manager.clearAssignments();

    // For each absent teacher, find and assign substitutes
    for (const absentTeacher of absentTeachers) {
      if (!absentTeacher) continue;

      console.log(`Processing absent teacher: ${absentTeacher}`);
      const teacherAssignments = manager.assignSubstitutes(absentTeacher, day);

      // Record these assignments in our database
      for (const assignment of teacherAssignments) {
        const key = `${assignment.period}-${assignment.className}`;
        assignments.set(key, assignment.substitute);

        // Find the absence record
        const absentTeacherId = this.teachers.find(t => 
          t.name.toLowerCase() === assignment.originalTeacher.toLowerCase())?.id;

        if (!absentTeacherId) continue;

        const absenceRecord = this.absences.find(
          a => a.teacherId === absentTeacherId && a.date === date
        );

        if (!absenceRecord) continue;

        // Find substitute teacher ID
        const substituteId = this.teachers.find(t => 
          t.name.toLowerCase() === assignment.substitute.toLowerCase())?.id;

        if (substituteId) {
          // Update the absence record with the substitute
          await this.assignSubstitute(absenceRecord.id, substituteId);
          console.log(`Assigned ${assignment.substitute} to cover for ${assignment.originalTeacher}, period ${assignment.period}, class ${assignment.className}`);
        }
      }
    }

    // Generate and log verification report
    const report = manager.verifyAssignments();
    console.log('Substitute assignment verification report:');
    console.log(JSON.stringify(report, null, 2));

    return assignments;
  }

  private getTeacherPeriod(teacherId: number, date: string): number {
    const schedules = Array.from(this.schedules.values())
      .find(s => s.teacherId === teacherId && s.day.toLowerCase() === new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
    return schedules?.period || 0;
  }


  async createSmsHistory(sms: Omit<SmsHistory, "id" | "sentAt">): Promise<SmsHistory> {
    const id = this.currentId++;
    const newSms = { 
      ...sms, 
      id, 
      sentAt: new Date() 
    };
    this.smsHistory.set(id, newSms);
    return newSms;
  }

  async getSmsHistory(): Promise<SmsHistory[]> {
    return Array.from(this.smsHistory.values());
  }

  private getTeacherClass(teacherId: number, date: string): string {
    const schedules = Array.from(this.schedules.values())
      .find(s => s.teacherId === teacherId && s.day.toLowerCase() === new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
    return schedules?.className || '';
  }

  async getSubstituteAssignments(date: string): Promise<any[]> {
    await this.loadData();

    // Import the SubstituteManager dynamically
    const { SubstituteManager } = await import('./substitute-manager.js');
    const manager = new SubstituteManager();

    // Load fresh data from CSV files
    await manager.loadData();

    const day = await this.getCurrentDay();
    const assignments = [];

    // Get all absent teachers for today
    const absentTeachers = this.absences
      .filter((absence) => absence.date === date)
      .map((absence) => {
        const teacher = this.teachers.find(t => t.id === absence.teacherId);
        const substitute = absence.substituteId ? 
          this.teachers.find(t => t.id === absence.substituteId) : null;

        return {
          teacherId: absence.teacherId,
          teacherName: teacher?.name || "Unknown",
          substituteId: absence.substituteId,
          substituteName: substitute?.name || null,
          substitutePhone: substitute?.phoneNumber || null
        };
      });

    if (absentTeachers.length === 0) {
      return assignments;
    }

    // Get schedules from our database
    const todaySchedules = this.schedules.filter((s) => s.day === day);

    // For each absent teacher
    for (const absentTeacher of absentTeachers) {
      // Find all classes this teacher teaches today
      const teacherClasses = todaySchedules.filter(
        (s) => s.teacherId === absentTeacher.teacherId,
      );

      for (const classInfo of teacherClasses) {
        assignments.push({
          period: classInfo.period,
          className: classInfo.className,
          originalTeacherName: absentTeacher.teacherName,
          substituteName: absentTeacher.substituteName || "Not assigned",
          substitutePhone: absentTeacher.substitutePhone || null,
        });
      }
    }

    // If we have no assignments from the database, try to use the manager's assignments
    if (assignments.length === 0) {
      // Try to auto-assign if needed
      await this.autoAssignSubstitutes(date);

      // Get assignments from manager
      const managerAssignments = manager.getSubstituteAssignments();

      // Convert to our format
      for (const key in managerAssignments) {
        const assignment = managerAssignments[key];
        assignments.push({
          period: assignment.period,
          className: assignment.className,
          originalTeacherName: assignment.originalTeacher,
          substituteName: assignment.substitute || "Not assigned",
          substitutePhone: assignment.substitutePhone || null,
        });
      }
    }

    return assignments;
  }

  async loadData() {
    // Placeholder for loading data.  Implementation would read from database or other sources
    console.log("Data loaded");
  }
}

export const storage = new MemStorage();

interface SmsHistory {
  id: number;
  teacherId: number;
  message: string;
  sentAt: Date;
}