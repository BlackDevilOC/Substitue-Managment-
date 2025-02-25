import { db } from "./db";
import { teachers, absences, schedules } from "../shared/schema";
import { eq } from "drizzle-orm";

export const storage = {
  async getTeachers() {
    return await db.select().from(teachers);
  },

  async getTeacher(id: number) {
    const result = await db.select().from(teachers).where(eq(teachers.id, id));
    return result[0];
  },

  async createTeacher(data: typeof teachers.$inferInsert) {
    return (await db.insert(teachers).values(data).returning())[0];
  },

  async getSchedulesByDay(day: string) {
    return await db.select().from(schedules).where(eq(schedules.day, day));
  },

  async createSchedule(data: typeof schedules.$inferInsert) {
    return (await db.insert(schedules).values(data).returning())[0];
  },

  async getAbsences() {
    return await db.select().from(absences);
  },

  async createAbsence(data: typeof absences.$inferInsert) {
    return (await db.insert(absences).values(data).returning())[0];
  },

  async assignSubstitute(absenceId: number, substituteId: number) {
    return await db.update(absences)
      .set({ substituteId })
      .where(eq(absences.id, absenceId))
      .returning();
  }
};