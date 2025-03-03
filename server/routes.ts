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

const checkAuth = (req: any, res: any, next: any) => {
  const publicPaths = [
    '/api/update-absent-teachers-file',
    '/api/get-absent-teachers',
    '/api/update-absent-teachers',
    '/api/attendance',
    '/api/upload/timetable',
    '/api/upload/substitutes'
  ];
  
  // Always allow these paths regardless of authentication
  if (publicPaths.includes(req.path)) {
    return next();
  }

  // Check for Replit user if available
  if (req.replitUser) {
    return next();
  }
  
  // Check for session-based authentication safely
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    return next();
  }
  
  // Check for Bearer token auth as a fallback
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const user = JSON.parse(token);
      if (user.username === 'Rehan') {
        req.user = user;
        return next();
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  }
  
  return res.status(401).json({ error: "Unauthorized" });
};

async function processAndSaveTeachers(timetableContent?: string, substituteContent?: string) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataFolder = path.join(__dirname, '../data');

    if (!fs.existsSync(dataFolder)) {
      fs.mkdirSync(dataFolder, { recursive: true });
    }

    const timetablePath = path.join(dataFolder, 'timetable_file.csv');
    const substitutePath = path.join(dataFolder, 'Substitude_file.csv');
    const totalTeacherPath = path.join(dataFolder, 'total_teacher.json');

    const ttContent = timetableContent || fs.existsSync(timetablePath) ? fs.readFileSync(timetablePath, 'utf-8') : '';
    const subContent = substituteContent || fs.existsSync(substitutePath) ? fs.readFileSync(substitutePath, 'utf-8') : '';

    if (!ttContent && !subContent) {
      console.error('No data available for teacher extraction');
      return;
    }

    const teacherData = await processTeacherFiles(ttContent, subContent);
    const teachers = teacherData.split('\n')
      .slice(1) 
      .filter(line => line.trim())
      .map(line => {
        const [name, phone, variations] = line.split(',').map(str => str.replace(/"/g, '').trim());
        return { name, phone, variations: variations.split('|') };
      });

    fs.writeFileSync(totalTeacherPath, JSON.stringify(teachers, null, 2));
    console.log(`Saved ${teachers.length} teachers to total_teacher.json`);

    return teachers;
  } catch (error) {
    console.error('Error processing and saving teachers:', error);
    throw error;
  }
}

const readTeachersFromFile = () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const totalTeacherPath = path.join(__dirname, '../data/total_teacher.json');

    if (fs.existsSync(totalTeacherPath)) {
      const teachers = JSON.parse(fs.readFileSync(totalTeacherPath, 'utf-8'));
      const uniqueTeachers = Array.from(new Map(
        teachers.map((t: any) => [t.name.toLowerCase(), t])
      ).values());

      const formattedTeachers = uniqueTeachers.map((t: any, index: number) => ({
        id: index + 1,
        name: t.name,
        phoneNumber: t.phone || null,
        isSubstitute: false
      }));

      console.log(`Read ${formattedTeachers.length} teachers from total_teacher.json`);
      return formattedTeachers;
    }
    console.warn('total_teacher.json not found');
    return [];
  } catch (error) {
    console.error('Error reading teachers:', error);
    return [];
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  await processAndSaveTeachers();
  app.use('/api', checkAuth);

  app.get("/api/teachers", async (req, res) => {
    try {
      const teachers = readTeachersFromFile();
      res.json(teachers);
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
    try {
      // First try to get data from storage
      const schedule = await storage.getSchedulesByDay(req.params.day);
      
      if (schedule && schedule.length > 0) {
        return res.json(schedule);
      }
      
      // If no data in storage or empty, load directly from timetable file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const timetablePath = path.join(__dirname, '../data/timetable_file.csv');
      
      if (!fs.existsSync(timetablePath)) {
        return res.status(404).json({ error: "Timetable file not found" });
      }
      
      const fileContent = fs.readFileSync(timetablePath, 'utf-8');
      const records = parse(fileContent, {
        columns: false,
        skip_empty_lines: true,
        trim: true
      });
      
      const normalizedDay = req.params.day.toLowerCase();
      const daySchedule = [];
      const teachersList = await storage.getTeachers();
      
      // Skip header row
      const header = records[0];
      const classes = header.slice(2); // Get class names from header
      
      for (let i = 1; i < records.length; i++) {
        const row = records[i];
        const rowDay = row[0]?.toLowerCase()?.trim();
        
        // Only process rows matching the requested day
        if (rowDay === normalizedDay) {
          const period = parseInt(row[1]);
          
          if (!isNaN(period)) {
            // For each class column
            for (let j = 2; j < row.length; j++) {
              if (j - 2 < classes.length) {
                const teacherName = row[j]?.trim();
                const className = classes[j - 2];
                
                if (teacherName && teacherName.toLowerCase() !== 'empty') {
                  // Find or create a teacher entry
                  let teacher = teachersList.find(t => 
                    t.name.toLowerCase() === teacherName.toLowerCase());
                  
                  if (!teacher) {
                    // If teacher not found in our list, create a temporary entry
                    teacher = { 
                      id: j * 1000 + i, // Generate a temporary unique ID
                      name: teacherName,
                      isSubstitute: false,
                      phoneNumber: null
                    };
                  }
                  
                  daySchedule.push({
                    id: i * 100 + j, // Generate a unique ID for the schedule entry
                    day: normalizedDay,
                    period,
                    teacherId: teacher.id,
                    className
                  });
                }
              }
            }
          }
        }
      }
      
      res.json(daySchedule);
    } catch (error) {
      console.error('Error loading schedule from file:', error);
      res.status(500).json({ error: 'Failed to load schedule data' });
    }
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
      const { SubstituteManager } = await import('./substitute-manager.js');
      const manager = new SubstituteManager();
      await manager.loadData();

      const assignments = await storage.autoAssignSubstitutes(date);
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
  
  // Make data files directly accessible
  app.get("/data/:filename", (req, res) => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data', req.params.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      if (req.params.filename.endsWith('.csv')) {
        res.setHeader('Content-Type', 'text/csv');
      } else if (req.params.filename.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      }
      
      const fileContent = fs.readFileSync(filePath);
      res.send(fileContent);
    } catch (error) {
      console.error('Error accessing file:', error);
      res.status(500).json({ error: 'Error accessing file' });
    }
  });

  // File upload endpoints
  app.post("/api/upload/timetable", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const csvString = req.file.buffer.toString('utf8');
      
      // Process timetable CSV and update database
      const { schedules, count } = await processTimetableCSV(csvString);
      
      // Save file to disk for future reference
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/timetable_file.csv');
      fs.writeFileSync(filePath, csvString);
      
      // Process and save teachers
      await processAndSaveTeachers(csvString);
      
      res.json({ 
        message: "Timetable uploaded successfully", 
        schedulesCreated: count 
      });
    } catch (error) {
      console.error('Error uploading timetable:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post("/api/upload/substitutes", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const csvString = req.file.buffer.toString('utf8');
      
      // Process substitute CSV and update database
      const { teachers, count } = await processSubstituteCSV(csvString);
      
      // Save file to disk for future reference
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/Substitude_file.csv');
      fs.writeFileSync(filePath, csvString);
      
      // Process and save all teachers
      await processAndSaveTeachers(undefined, csvString);
      
      res.json({ 
        message: "Substitute teachers uploaded successfully", 
        teachersCreated: count 
      });
    } catch (error) {
      console.error('Error uploading substitutes:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/reset-assignments", async (req, res) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const absences = await storage.getAbsences();

      for (const absence of absences) {
        if (absence.date === today && absence.substituteId) {
          await storage.assignSubstitute(absence.id, null);
        }
      }

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

  app.get('/api/get-absent-teachers', (req, res) => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/absent_teachers.json');

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        return res.json([]);
      }

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
      const { teacherName, isAbsent, absentTeachers } = req.body;
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/absent_teachers.json');

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }

      // If absentTeachers array is provided, use it directly
      if (Array.isArray(absentTeachers)) {
        fs.writeFileSync(filePath, JSON.stringify(absentTeachers, null, 2));
        console.log(`Updated absent teachers list with ${absentTeachers.length} teachers`);
        return res.json({ success: true, absentTeachers });
      }

      // Otherwise handle the single teacherName update
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let currentAbsentTeachers = JSON.parse(fileContent);

      if (isAbsent) {
        if (!currentAbsentTeachers.includes(teacherName)) {
          currentAbsentTeachers.push(teacherName);
          console.log(`Added ${teacherName} to absent teachers list`);
        }
      } else {
        currentAbsentTeachers = currentAbsentTeachers.filter((name: string) => name !== teacherName);
        console.log(`Removed ${teacherName} from absent teachers list`);
      }

      fs.writeFileSync(filePath, JSON.stringify(currentAbsentTeachers, null, 2));
      res.json({ success: true, absentTeachers: currentAbsentTeachers });
    } catch (error) {
      console.error('Error updating absent teachers file:', error);
      res.status(500).json({ error: 'Failed to update absent teachers file' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}