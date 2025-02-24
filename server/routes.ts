import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTeacherSchema, insertScheduleSchema, insertAbsenceSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Teachers
  app.get("/api/teachers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const teachers = await storage.getTeachers();
    res.json(teachers);
  });

  app.post("/api/teachers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertTeacherSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const teacher = await storage.createTeacher(parsed.data);
    res.status(201).json(teacher);
  });

  // Schedule
  app.get("/api/schedule/:day", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const schedule = await storage.getSchedulesByDay(req.params.day);
    res.json(schedule);
  });

  app.post("/api/schedule", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertScheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const schedule = await storage.createSchedule(parsed.data);
    res.status(201).json(schedule);
  });

  // Absences
  app.get("/api/absences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const absences = await storage.getAbsences();
    res.json(absences);
  });

  app.post("/api/absences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertAbsenceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const absence = await storage.createAbsence(parsed.data);
    res.status(201).json(absence);
  });

  app.post("/api/absences/:id/substitute", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { substituteId } = req.body;
    await storage.assignSubstitute(parseInt(req.params.id), substituteId);
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}
