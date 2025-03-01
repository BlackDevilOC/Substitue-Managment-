import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep existing tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isSubstitute: boolean("is_substitute").default(false).notNull(),
  phoneNumber: text("phone_number"),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  day: text("day").notNull(),
  period: integer("period").notNull(),
  teacherId: integer("teacher_id").notNull(),
  className: text("class_name").notNull(),
});

export const absences = pgTable("absences", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  date: date("date").notNull(),
  substituteId: integer("substitute_id"),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // 'timetable' or 'substitute'
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  hash: text("hash").notNull(), // To check for duplicates
});

export const historicalTimetables = pgTable("historical_timetables", {
  id: serial("id").primaryKey(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
});

export const historicalTeachers = pgTable("historical_teachers", {
  id: serial("id").primaryKey(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
});

export const teacherAttendance = pgTable("teacher_attendance", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  date: date("date").notNull(),
  isPresent: boolean("is_present").notNull(),
  notes: text("notes"),
});

export const smsHistory = pgTable("sms_history", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  status: text("status").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Add the changePasswordSchema that was missing
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertTeacherSchema = createInsertSchema(teachers);
export const insertScheduleSchema = createInsertSchema(schedules);
export const insertAbsenceSchema = createInsertSchema(absences);
export const insertHistoricalTimetableSchema = createInsertSchema(historicalTimetables);
export const insertHistoricalTeacherSchema = createInsertSchema(historicalTeachers);
export const insertTeacherAttendanceSchema = createInsertSchema(teacherAttendance);
export const insertUploadedFileSchema = createInsertSchema(uploadedFiles);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Teacher = typeof teachers.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Absence = typeof absences.$inferSelect;
export type TeacherAttendance = typeof teacherAttendance.$inferSelect;
export type SmsHistory = typeof smsHistory.$inferSelect;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type ChangePassword = z.infer<typeof changePasswordSchema>;