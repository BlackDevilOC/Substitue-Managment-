import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeacherSchema, insertScheduleSchema, insertAbsenceSchema } from "@shared/schema";
import { processTimetableCSV, processSubstituteCSV } from "./csv-handler";
import { processTeacherFiles } from "../client/src/utils/teacherExtractor";
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
  // Skip auth check for certain paths
  const publicPaths = [
    '/api/update-absent-teachers-file',
    '/api/get-absent-teachers',
    '/api/update-absent-teachers'
  ];
  
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
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

// Function to process and save teachers
async function processAndSaveTeachers(timetableContent?: string, substituteContent?: string) {
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
    const totalTeacherPath = path.join(dataFolder, 'total_teacher.json');

    // Use provided content or read from files
    const ttContent = timetableContent || fs.existsSync(timetablePath) ? fs.readFileSync(timetablePath, 'utf-8') : '';
    const subContent = substituteContent || fs.existsSync(substitutePath) ? fs.readFileSync(substitutePath, 'utf-8') : '';

    if (!ttContent && !subContent) {
      console.error('No data available for teacher extraction');
      return;
    }

    // Process teachers using the improved extraction function
    const teacherData = await processTeacherFiles(ttContent, subContent);
    const teachers = teacherData.split('\n')
      .slice(1) // Skip header
      .filter(line => line.trim())
      .map(line => {
        const [name, phone, variations] = line.split(',').map(str => str.replace(/"/g, '').trim());
        return { name, phone, variations: variations.split('|') };
      });

    // Save to total_teacher.json
    fs.writeFileSync(totalTeacherPath, JSON.stringify(teachers, null, 2));
    console.log(`Saved ${teachers.length} teachers to total_teacher.json`);

    return teachers;
  } catch (error) {
    console.error('Error processing and saving teachers:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Process and save teachers on startup
  await processAndSaveTeachers();

  // Apply auth middleware to all /api routes
  app.use('/api', checkAuth);

  // File upload routes
  app.post("/api/upload/timetable", upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const fileContent = req.file.buffer.toString('utf-8');

      // Process timetable
      const schedules = await processTimetableCSV(fileContent);
      for (const schedule of schedules) {
        await storage.createSchedule(schedule);
      }

      // Save file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/timetable_file.csv');
      fs.writeFileSync(filePath, fileContent);

      // Process teachers again with new file
      await processAndSaveTeachers();

      res.json({ message: "Timetable uploaded and processed successfully" });
    } catch (error: any) {
      console.error('Error processing timetable:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/upload/substitutes", upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const fileContent = req.file.buffer.toString('utf-8');

      // Process substitutes
      const substitutes = await processSubstituteCSV(fileContent);

      // Save file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/Substitude_file.csv');
      fs.writeFileSync(filePath, fileContent);

      // Process teachers again with new file
      await processAndSaveTeachers();

      res.json({ message: "Substitute list uploaded and processed successfully" });
    } catch (error: any) {
      console.error('Error processing substitutes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  app.get("/api/teachers", async (req, res) => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const totalTeacherPath = path.join(__dirname, '../data/total_teacher.json');

      if (fs.existsSync(totalTeacherPath)) {
        const teachers = JSON.parse(fs.readFileSync(totalTeacherPath, 'utf-8'));
        // Filter out any potential duplicates by name
        const uniqueTeachers = Array.from(new Map(
          teachers.map((t: any) => [t.name.toLowerCase(), t])
        ).values());

        // Map to the expected format and ensure exactly 34 teachers
        const formattedTeachers = uniqueTeachers
          .slice(0, 34) // Ensure we only take the first 34 teachers
          .map((t: any, index: number) => ({
            id: index + 1,
            name: t.name,
            phoneNumber: t.phone || null,
            isSubstitute: false
          }));

        console.log(`Sending ${formattedTeachers.length} teachers to client`);
        res.json(formattedTeachers);
      } else {
        console.warn('total_teacher.json not found');
        res.json([]);
      }
    } catch (error) {
      console.error('Error reading teachers:', error);
      res.status(500).json({ error: 'Failed to load teachers' });
    }
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

  app.post('/api/update-absent-teachers', async (req, res) => {
    try {
      const { absentTeachers } = req.body;

      // Update the JSON file
      fs.writeFileSync(
        path.join(__dirname, '../client/src/data/absent_teacher_for_substitute.json'),
        JSON.stringify(absentTeachers, null, 2)
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating absent teachers:', error);
      res.status(500).json({ error: 'Failed to update absent teachers' });
    }
  });

  // Handle updating absent_teachers.json file in data folder
  // Get absent teachers from data/absent_teachers.json
  app.get('/api/get-absent-teachers', (req, res) => {
    try {
      const filePath = path.join(__dirname, '../data/absent_teachers.json');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        return res.json([]);
      }
      
      // Read file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const absentTeachers = JSON.parse(fileContent);
      
      res.json(absentTeachers);
    } catch (error) {
      console.error('Error reading absent teachers file:', error);
      res.status(500).json({ error: 'Failed to read absent teachers file' });
    }
  });

  app.post('/api/update-absent-teachers-file', (req, res) => {
    try {
      const { teacherName, isAbsent } = req.body;
      const filePath = path.join(__dirname, '../data/absent_teachers.json');

      // Create file with empty array if it doesn't exist
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }

      // Read current absent teachers
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let absentTeachers = JSON.parse(fileContent);

      if (isAbsent) {
        // Add teacher if not already in the list
        if (!absentTeachers.includes(teacherName)) {
          absentTeachers.push(teacherName);
          console.log(`Added ${teacherName} to absent teachers list`);
        }
      } else {
        // Remove teacher from the list
        const initialLength = absentTeachers.length;
        absentTeachers = absentTeachers.filter(name => name !== teacherName);
        
        if (initialLength !== absentTeachers.length) {
          console.log(`Removed ${teacherName} from absent teachers list`);
        }
      }

      // Write updated list back to file
      fs.writeFileSync(filePath, JSON.stringify(absentTeachers, null, 2));

      res.json({ success: true, absentTeachers });
    } catch (error) {
      console.error('Error updating absent teachers file:', error);
      res.status(500).json({ error: 'Failed to update absent teachers file' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}