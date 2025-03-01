import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeacherSchema, insertScheduleSchema, insertAbsenceSchema } from "@shared/schema";
import { processTimetableCSV, processSubstituteCSV, extractTeacherNames, clearAttendanceStorage } from "./csv-handler";
import multer from "multer";
import { format } from "date-fns";
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

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
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = JSON.parse(token);
    if (user.username === 'Rehan') {
      req.user = user;
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Function to automatically load teacher data
async function loadInitialData() {
  console.log('[loadInitialData] Loading data from CSV files...');
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataFolder = path.join(__dirname, '../data');

    // Ensure data directory exists
    if (!fs.existsSync(dataFolder)) {
      fs.mkdirSync(dataFolder, { recursive: true });
    }

    const timetablePath = path.join(dataFolder, 'timetable_file.csv');
    const substitutePath = path.join(dataFolder, 'Substitude_file.csv');

    // Load and process timetable data if exists
    if (fs.existsSync(timetablePath)) {
      const timetableContent = fs.readFileSync(timetablePath, 'utf-8');
      const schedules = await processTimetableCSV(timetableContent);
      for (const schedule of schedules) {
        await storage.createSchedule(schedule);
      }
      console.log('Timetable data loaded successfully');
    }

    // Load and process substitute data if exists
    if (fs.existsSync(substitutePath)) {
      const substituteContent = fs.readFileSync(substitutePath, 'utf-8');
      const teachers = await processSubstituteCSV(substituteContent);
      console.log('Substitute data loaded successfully');
    }

    // Extract and save teacher information
    if (fs.existsSync(timetablePath) || fs.existsSync(substitutePath)) {
      const teachers = await extractTeacherNames(timetablePath, substitutePath);
      if (teachers && teachers.length > 0) {
        // Clear existing teachers before loading new ones
        await storage.clearTeachers();
        for (const teacher of teachers) {
          await storage.createTeacher({
            name: teacher.name,
            phoneNumber: teacher.phone || null,
            isSubstitute: false
          });
        }
      }
    }

    console.log('Initial data loading completed');
  } catch (error) {
    console.error('[loadInitialData] Error loading data:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Load initial data on startup
  await loadInitialData();
  console.log('[loadInitialData] Data loading complete.');

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

      // Save the file to the data folder
      const fs = await import('fs/promises');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dataFolder = path.join(__dirname, '../data');
      const filePath = path.join(dataFolder, 'timetable_file.csv');

      try {
        // Ensure the data directory exists
        await fs.mkdir(dataFolder, { recursive: true });
        // Write the file
        await fs.writeFile(filePath, fileContent);
        console.log(`Timetable file saved to ${filePath}`);
      } catch (fsError) {
        console.error('Error saving timetable file:', fsError);
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

      // Save the file to the data folder
      const fs = await import('fs/promises');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dataFolder = path.join(__dirname, '../data');
      const filePath = path.join(dataFolder, 'Substitude_file.csv');

      try {
        // Ensure the data directory exists
        await fs.mkdir(dataFolder, { recursive: true });
        // Write the file
        await fs.writeFile(filePath, fileContent);
        console.log(`Substitute file saved to ${filePath}`);
      } catch (fsError) {
        console.error('Error saving substitute file:', fsError);
      }

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
      // First load fresh data from CSV files to ensure we have the latest information
      const { SubstituteManager } = await import('./substitute-manager.js');
      const manager = new SubstituteManager();
      await manager.loadData();
      
      // Now run the auto-assignment algorithm
      const assignments = await storage.autoAssignSubstitutes(date);
      
      // Get details of assignments for the response
      const substituteAssignments = await storage.getSubstituteAssignments(date);
      
      res.json({
        message: "Substitutes assigned successfully",
        assignmentsCount: assignments.size,
        assignments: substituteAssignments
      });
    } catch (error) {
      console.error('Auto-assign substitutes error:', error);
      res.status(500).json({ 
        message: "Failed to assign substitutes", 
        error: error instanceof Error ? error.message : String(error) 
      });
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
      
      // Also clear assignments in the substitute manager
      const { SubstituteManager } = await import('./substitute-manager.js');
      const manager = new SubstituteManager();
      manager.clearAssignments();

      res.json({ message: "Assignments reset successfully" });
    } catch (error) {
      console.error('Reset assignments error:', error);
      res.status(500).json({ message: "Failed to reset assignments" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}