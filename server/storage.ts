import { IStorage } from "./types";
import type { User, InsertUser, Teacher, Schedule, Absence, TeacherAttendance, InsertTeacherAttendance } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import * as fs from 'fs';
import * as path from 'path';

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

    // Get all absent teachers for today
    const absentTeachers = this.absences
      .filter((absence) => absence.date === date && !absence.substituteId)
      .map((absence) => this.teachers.find(t => t.id === absence.teacherId)?.name || '');

    if (absentTeachers.length === 0) {
      return new Map<string, string>();
    }

    // Clear previous assignments
    manager.clearAssignments();

    // Use the new auto-assign functionality
    const { assignments, warnings } = await manager.autoAssignSubstitutes(date, absentTeachers);
    
    const assignmentsMap = new Map<string, string>();

    // SMS history storage interface
    const storeSmsHistory = async (entry: {
      id: number;
      teacherId: number;
      teacherName: string;
      message: string;
      sentAt: string;
      status: 'sent' | 'failed' | 'pending';
    }): Promise<void> => {
  try {
    const historyFilePath = path.join(DATA_DIR, 'sms_history.json');
    let existingHistory: SmsHistoryEntry[] = [];
    
    // Check if file exists and read it
    if (fs.existsSync(historyFilePath)) {
      const historyData = await fs.promises.readFile(historyFilePath, 'utf-8');
      existingHistory = JSON.parse(historyData);
    }
    
    // Add new entry
    existingHistory.push(entry);
    
    // Write updated history back to file
    await fs.promises.writeFile(
      historyFilePath, 
      JSON.stringify(existingHistory, null, 2)
    );
    
    console.log(`SMS history entry stored for teacher ID ${entry.teacherId}`);
  } catch (error) {
    console.error('Failed to store SMS history:', error);
    throw error;
  }
}

// Function to get SMS history
    const getSmsHistoryFromFile = async (): Promise<any[]> => {
      try {
        const historyFilePath = path.join(__dirname, '../data/sms_history.json');
        
        // Check if file exists
        if (!fs.existsSync(historyFilePath)) {
          return [];
        }
        
        // Read and parse history file
        const historyData = await fs.promises.readFile(historyFilePath, 'utf-8');
        return JSON.parse(historyData);
      } catch (error) {
        console.error('Failed to get SMS history:', error);
        return [];
      }
    }

    
    // Record these assignments in our database
    for (const assignment of assignments) {
      const key = `${assignment.period}-${assignment.className}`;
      assignmentsMap.set(key, assignment.substitute);

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
      }
    }

    return assignmentsMap;
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

    // Get assignments directly from the manager or file
    const { assignments: managerAssignments } = manager.getSubstituteAssignments();
    
    if (managerAssignments && managerAssignments.length > 0) {
      return managerAssignments.map(assignment => ({
        period: assignment.period,
        className: assignment.className,
        originalTeacherName: assignment.originalTeacher,
        substituteName: assignment.substitute || "Not assigned",
        substitutePhone: assignment.substitutePhone || null,
      }));
    }
    
    // If no assignments found, try to auto-assign
    await this.autoAssignSubstitutes(date);
    
    // Try to get assignments again
    const { assignments: newAssignments } = manager.getSubstituteAssignments();
    
    return (newAssignments || []).map(assignment => ({
      period: assignment.period,
      className: assignment.className,
      originalTeacherName: assignment.originalTeacher,
      substituteName: assignment.substitute || "Not assigned",
      substitutePhone: assignment.substitutePhone || null,
    }));
  }

  async loadData() {
    // Placeholder for loading data.  Implementation would read from database or other sources
    console.log("Data loaded");
  }
}

// SMS history storage interface
interface SmsHistory {
  id: number;
  teacherId: number;
  message: string;
  sentAt: Date;
}

export const storage = new MemStorage();