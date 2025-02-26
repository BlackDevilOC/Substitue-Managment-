import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTeacherSchema, insertScheduleSchema, insertAbsenceSchema, changePasswordSchema } from "@shared/schema";
import { processTimetableCSV, processSubstituteCSV } from "./csv-handler";
import multer from "multer";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";
import { format } from "date-fns";

const scryptAsync = promisify(scrypt);
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // User routes
  app.post("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Verify current password
      const [hashedCurrent, salt] = user.password.split(".");
      const hashedCurrentBuf = Buffer.from(hashedCurrent, "hex");
      const suppliedBuf = (await scryptAsync(parsed.data.currentPassword, salt, 64)) as Buffer;

      if (!timingSafeEqual(hashedCurrentBuf, suppliedBuf)) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const newSalt = randomBytes(16).toString("hex");
      const newHashedBuf = (await scryptAsync(parsed.data.newPassword, newSalt, 64)) as Buffer;
      const newPassword = `${newHashedBuf.toString("hex")}.${newSalt}`;

      // Update password
      await storage.updateUserPassword(user.id, newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error('Password change error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // CSV Upload Routes
  app.post("/api/upload/timetable", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const fileContent = req.file.buffer.toString('utf-8');
      const schedules = await processTimetableCSV(fileContent);

      // Save all schedules
      for (const schedule of schedules) {
        await storage.createSchedule(schedule);
      }

      res.status(200).json({ 
        message: "Timetable uploaded successfully",
        schedulesCreated: schedules.length
      });
    } catch (error: any) {
      console.error('Timetable upload error:', error);
      res.status(400).json({ 
        message: "Failed to process timetable file",
        error: error.message 
      });
    }
  });

  app.post("/api/upload/substitutes", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const fileContent = req.file.buffer.toString('utf-8');
      const teachers = await processSubstituteCSV(fileContent);
      res.status(200).json({ 
        message: "Substitute teachers uploaded successfully",
        teachersCreated: teachers.length
      });
    } catch (error: any) {
      console.error('Substitute upload error:', error);
      res.status(400).json({ 
        message: "Failed to process substitute teachers file",
        error: error.message
      });
    }
  });

  // API Routes
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
    const teacher = await storage.getTeacher(parsed.data.teacherId);
    
    if (teacher) {
      const { recordAttendance } = await import('./attendance-tracker.js');
      recordAttendance(
        parsed.data.date,
        teacher.name,
        'Absent'
      );
    }
    
    res.status(201).json(absence);
  });

  app.post("/api/absences/:id/substitute", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { substituteId } = req.body;
    await storage.assignSubstitute(parseInt(req.params.id), substituteId);
    res.sendStatus(200);
  });

  app.post("/api/auto-assign-substitutes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const date = format(new Date(), "yyyy-MM-dd");
    try {
      const assignments = await storage.autoAssignSubstitutes(date);
      res.json({
        message: "Substitutes assigned successfully",
        assignmentsCount: assignments.size
      });
    } catch (error) {
      console.error('Auto-assign substitutes error:', error);
      res.status(500).json({ message: "Failed to assign substitutes" });
    }
  });

  app.get("/api/substitute-assignments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const date = format(new Date(), "yyyy-MM-dd");
    try {
      const assignments = await storage.getSubstituteAssignments(date);
      res.json(assignments);
    } catch (error) {
      console.error('Get substitute assignments error:', error);
      res.status(500).json({ message: "Failed to get substitute assignments" });
    }
  });

  app.post("/api/reset-assignments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Clear all substitute assignments for today's absences
      const today = format(new Date(), "yyyy-MM-dd");
      const absences = await storage.getAbsences();

      for (const absence of absences) {
        if (absence.date === today && absence.substituteId) {
          await storage.assignSubstitute(absence.id, null);
        }
      }

      res.json({ message: "Assignments reset successfully" });
    } catch (error) {
      console.error('Reset assignments error:', error);
      res.status(500).json({ message: "Failed to reset assignments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}