import { pgTable, text, serial, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Change password schema
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Teacher = typeof teachers.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Absence = typeof absences.$inferSelect;
export type ChangePassword = z.infer<typeof changePasswordSchema>;