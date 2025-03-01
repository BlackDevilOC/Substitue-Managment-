import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeacherSchema, insertScheduleSchema, insertAbsenceSchema } from "@shared/schema";
import { processTimetableCSV, processSubstituteCSV } from "./csv-handler";
import multer from "multer";
import { format } from "date-fns";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to check authorization token
const checkAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized" }); // Changed to return JSON
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = JSON.parse(token);
    if (user.username === 'Rehan') {
      req.user = user;
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" }); // Changed to return JSON
    }
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" }); // Changed to return JSON
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply auth middleware to all /api routes
  app.use('/api', checkAuth);

  // CSV Upload Routes
  app.post("/api/upload/timetable", upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

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
        error: error.message || "Failed to process timetable file"
      });
    }
  });

  app.post("/api/upload/substitutes", upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

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
        error: error.message || "Failed to process substitute teachers file"
      });
    }
  });

  // API Routes
  app.get("/api/teachers", async (req, res) => {
    const teachers = await storage.getTeachers();
    res.json(teachers);
  });

  app.post("/api/teachers", async (req, res) => {
    const parsed = insertTeacherSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const teacher = await storage.createTeacher(parsed.data);
    res.status(201).json(teacher);
  });

  app.get("/api/schedule/:day", async (req, res) => {
    const schedule = await storage.getSchedulesByDay(req.params.day);
    res.json(schedule);
  });

  app.post("/api/override-day", async (req, res) => {
    const { day } = req.body;
    await storage.setDayOverride(day);
    res.json({ message: "Day override set successfully" });
  });

  app.get("/api/current-day", async (req, res) => {
    const currentDay = await storage.getCurrentDay();
    res.json({ currentDay });
  });

  app.post("/api/schedule", async (req, res) => {
    const parsed = insertScheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const schedule = await storage.createSchedule(parsed.data);
    res.status(201).json(schedule);
  });

  app.get("/api/absences", async (req, res) => {
    const absences = await storage.getAbsences();
    res.json(absences);
  });

  app.post("/api/absences", async (req, res) => {
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
    const { substituteId } = req.body;
    await storage.assignSubstitute(parseInt(req.params.id), substituteId);
    res.sendStatus(200);
  });

  app.post("/api/auto-assign-substitutes", async (req, res) => {
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

  app.get("/api/sms-history", async (req, res) => {
    const history = await storage.getSmsHistory();
    const enrichedHistory = await Promise.all(
      history.map(async (sms) => {
        const teacher = await storage.getTeacher(sms.teacherId);
        return {
          ...sms,
          teacherName: teacher?.name || 'Unknown'
        };
      })
    );
    res.json(enrichedHistory);
  });

  app.get("/api/substitute-assignments", async (req, res) => {
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