import { IStorage } from "./types";
import type { User, InsertUser, Teacher, Schedule, Absence, HistoricalTimetable, HistoricalTeacher, TeacherAttendance } from "@shared/schema";
import { users, teachers, schedules, absences, historicalTimetables, historicalTeachers, teacherAttendance } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, id));
  }

  // Teacher methods
  async createTeacher(teacher: Omit<Teacher, "id">): Promise<Teacher> {
    const [newTeacher] = await db.insert(teachers).values(teacher).returning();
    return newTeacher;
  }

  async getTeachers(): Promise<Teacher[]> {
    return db.select().from(teachers);
  }

  // Schedule methods
  async createSchedule(schedule: Omit<Schedule, "id">): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    return newSchedule;
  }

  async getSchedulesByDay(day: string): Promise<Schedule[]> {
    return db.select().from(schedules).where(eq(schedules.day, day));
  }

  // Absence methods
  async createAbsence(absence: Omit<Absence, "id">): Promise<Absence> {
    const [newAbsence] = await db.insert(absences).values(absence).returning();
    return newAbsence;
  }

  async getAbsences(): Promise<Absence[]> {
    return db.select().from(absences);
  }

  async assignSubstitute(absenceId: number, substituteId: number): Promise<void> {
    await db.update(absences)
      .set({ substituteId })
      .where(eq(absences.id, absenceId));
  }

  // Historical tracking methods
  async saveHistoricalTimetable(data: Omit<HistoricalTimetable, "id">): Promise<HistoricalTimetable> {
    const [record] = await db.insert(historicalTimetables).values(data).returning();
    return record;
  }

  async saveHistoricalTeacher(data: Omit<HistoricalTeacher, "id">): Promise<HistoricalTeacher> {
    const [record] = await db.insert(historicalTeachers).values(data).returning();
    return record;
  }

  async recordTeacherAttendance(data: Omit<TeacherAttendance, "id">): Promise<TeacherAttendance> {
    const [record] = await db.insert(teacherAttendance).values(data).returning();
    return record;
  }

  async getTeacherAttendance(teacherId: number, date: Date): Promise<TeacherAttendance | undefined> {
    const [record] = await db.select()
      .from(teacherAttendance)
      .where(
        and(
          eq(teacherAttendance.teacherId, teacherId),
          eq(teacherAttendance.date, date)
        )
      );
    return record;
  }
}

export const storage = new DatabaseStorage();