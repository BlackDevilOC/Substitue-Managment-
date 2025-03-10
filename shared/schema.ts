import { pgTable, text, serial, integer, boolean, date, timestamp, jsonb } from "drizzle-orm/pg-core";
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

// New experiment-related tables
export const experiments = pgTable("experiments", {
  id: serial("id").primaryKey(),
  changeType: text("change_type").notNull(),
  targetFile: text("target_file").notNull(),
  codeSnippet: text("code_snippet"),
  description: text("description").notNull(),
  androidCompatibilityCheck: boolean("android_compatibility_check").default(true).notNull(),
  status: text("status").notNull(), // 'pending', 'validated', 'failed', 'applied'
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  submittedBy: text("submitted_by").notNull(),
});

export const versionControl = pgTable("version_control", {
  id: serial("id").primaryKey(),
  experimentId: integer("experiment_id").notNull(),
  previousState: text("previous_state").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  androidCompatibilityStatus: text("android_compatibility_status").notNull(),
  buildStatus: text("build_status").notNull(),
  validationErrors: jsonb("validation_errors"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Add the changePasswordSchema that was missing
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(1, "Password must contain at least 1 character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const usernameChangeSchema = z.object({
  newUsername: z.string().min(1, "Username is required"),
});

export const insertTeacherSchema = createInsertSchema(teachers);
export const insertScheduleSchema = createInsertSchema(schedules);
export const insertAbsenceSchema = createInsertSchema(absences);
export const insertHistoricalTimetableSchema = createInsertSchema(historicalTimetables);
export const insertHistoricalTeacherSchema = createInsertSchema(historicalTeachers);
export const insertTeacherAttendanceSchema = createInsertSchema(teacherAttendance);
export const insertUploadedFileSchema = createInsertSchema(uploadedFiles);
export const insertExperimentSchema = createInsertSchema(experiments);
export const insertVersionControlSchema = createInsertSchema(versionControl);

// Experiment submission schema
export const experimentSubmissionSchema = z.object({
  change_type: z.enum(["add", "modify", "delete"]),
  target_file: z.string().min(1, "Target file path is required"),
  code_snippet: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  android_compatibility_check: z.boolean().default(true)
});


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
export type UsernameChange = z.infer<typeof usernameChangeSchema>;
export type Experiment = typeof experiments.$inferSelect;
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type VersionControl = typeof versionControl.$inferSelect;
export type ExperimentSubmission = z.infer<typeof experimentSubmissionSchema>;