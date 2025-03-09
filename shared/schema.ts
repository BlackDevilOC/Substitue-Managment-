import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
});

// Teachers table
export const teachers = sqliteTable("teachers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  isSubstitute: integer("is_substitute", { mode: "boolean" }).notNull().default(false),
  phoneNumber: text("phone_number"),
});

// Schedules table
export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull(),
  period: integer("period").notNull(),
  teacherId: integer("teacher_id").notNull(),
  className: text("class_name").notNull(),
});

// Absences table
export const absences = sqliteTable("absences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teacherId: integer("teacher_id").notNull(),
  date: text("date").notNull(), // SQLite doesn't have a date type
  substituteId: integer("substitute_id"),
});

// Notifications table
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  recipientId: integer("recipient_id").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  data: text("data"), // Store JSON as text in SQLite
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

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
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Teacher = typeof teachers.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Absence = typeof absences.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;


export const uploadedFiles = sqliteTable("uploaded_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // 'timetable' or 'substitute'
  content: text("content").notNull(),
  uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  hash: text("hash").notNull(), // To check for duplicates
});

export const historicalTimetables = sqliteTable("historical_timetables", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
});

export const historicalTeachers = sqliteTable("historical_teachers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
});

export const teacherAttendance = sqliteTable("teacher_attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teacherId: integer("teacher_id").notNull(),
  date: text("date").notNull(),
  isPresent: integer("is_present", { mode: "boolean" }).notNull(),
  notes: text("notes"),
});

export const smsHistory = sqliteTable("sms_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teacherId: integer("teacher_id").notNull(),
  message: text("message").notNull(),
  sentAt: text("sent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  status: text("status").notNull(),
});

export const experiments = sqliteTable("experiments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  changeType: text("change_type").notNull(),
  targetFile: text("target_file").notNull(),
  codeSnippet: text("code_snippet"),
  description: text("description").notNull(),
  androidCompatibilityCheck: integer("android_compatibility_check", { mode: "boolean" }).notNull().default(1),
  status: text("status").notNull(), // 'pending', 'validated', 'failed', 'applied'
  submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  submittedBy: text("submitted_by").notNull(),
});

export const versionControl = sqliteTable("version_control", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  experimentId: integer("experiment_id").notNull(),
  previousState: text("previous_state").notNull(),
  timestamp: text("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`),
  androidCompatibilityStatus: text("android_compatibility_status").notNull(),
  buildStatus: text("build_status").notNull(),
  validationErrors: text("validation_errors"),
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles);
export const insertExperimentSchema = createInsertSchema(experiments);
export const insertVersionControlSchema = createInsertSchema(versionControl);
export const insertHistoricalTimetableSchema = createInsertSchema(historicalTimetables);
export const insertHistoricalTeacherSchema = createInsertSchema(historicalTeachers);
export const insertTeacherAttendanceSchema = createInsertSchema(teacherAttendance);
export const experimentSubmissionSchema = z.object({
  change_type: z.enum(["add", "modify", "delete"]),
  target_file: z.string().min(1, "Target file path is required"),
  code_snippet: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  android_compatibility_check: z.boolean().default(true)
});

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type Experiment = typeof experiments.$inferSelect;
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type VersionControl = typeof versionControl.$inferSelect;
export type ExperimentSubmission = z.infer<typeof experimentSubmissionSchema>;
export type SmsHistory = typeof smsHistory.$inferSelect;
export type TeacherAttendance = typeof teacherAttendance.$inferSelect;