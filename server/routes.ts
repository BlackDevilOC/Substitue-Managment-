import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeacherSchema, insertScheduleSchema, insertAbsenceSchema } from "@shared/schema";
import { processTimetableCSV, processSubstituteCSV } from "./csv-handler";
import { processTeacherFiles } from "../utils/teacherExtractor";
import multer from "multer";
import { format } from "date-fns";
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { processTimetables } from "../utils/timetableProcessor";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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
    const teacher = await storage.createTeacher({
      name: parsed.data.name,
      isSubstitute: false,
      phoneNumber: parsed.data.phoneNumber || null
    });
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

  app.get("/api/teacher-schedule", async (req, res) => {
    try {
      const teacherName = req.query.name?.toString().toLowerCase();
      if (!teacherName) {
        return res.status(400).json({ error: 'Teacher name is required' });
      }

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const schedulePath = path.join(__dirname, '../data/teacher_schedules.json');

      if (!fs.existsSync(schedulePath)) {
        return res.status(404).json({ error: 'Teacher schedules file not found' });
      }

      const schedules = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));
      
      // Find the teacher schedule (try exact match first)
      let teacherSchedule = schedules[teacherName];
      
      // If not found, try to find by partial match
      if (!teacherSchedule) {
        // Find keys that are close to the provided name
        const possibleMatches = Object.keys(schedules).filter(key => 
          key.includes(teacherName) || teacherName.includes(key)
        );
        
        if (possibleMatches.length > 0) {
          teacherSchedule = schedules[possibleMatches[0]];
        }
      }

      if (!teacherSchedule) {
        return res.status(404).json({ error: 'Teacher schedule not found' });
      }

      res.json(teacherSchedule);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      res.status(500).json({ 
        error: 'Failed to fetch teacher schedule',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/schedule", async (req, res) => {
    const parsed = insertScheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const schedule = await storage.createSchedule(parsed.data);
    res.status(201).json(schedule);
  });

  app.post("/api/refresh-teachers", async (req, res) => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dataFolder = path.join(__dirname, '../data');

      const timetablePath = path.join(dataFolder, 'timetable_file.csv');
      const substitutePath = path.join(dataFolder, 'Substitude_file.csv');

      if (!fs.existsSync(timetablePath)) {
        return res.status(400).json({ error: 'Timetable file not found' });
      }
      if (!fs.existsSync(substitutePath)) {
        return res.status(400).json({ error: 'Substitute file not found' });
      }

      const timetableContent = fs.readFileSync(timetablePath, 'utf-8');
      const substituteContent = fs.readFileSync(substitutePath, 'utf-8');

      const teachers = await processAndSaveTeachers(timetableContent, substituteContent);

      res.json({ 
        success: true, 
        message: 'Teacher data refreshed successfully',
        teacherCount: teachers?.length || 0
      });
    } catch (error) {
      console.error('Error refreshing teacher data:', error);
      res.status(500).json({ 
        error: 'Failed to refresh teacher data',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/absences", async (req, res) => {
    const absences = await storage.getAbsences();
    res.json(absences);
  });

  app.post("/api/absences", async (req, res) => {
    const parsed = insertAbsenceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const absence = await storage.createAbsence({
      ...parsed.data,
      substituteId: null
    });
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
    await storage.assignSubstitute(parseInt(req.params.id), substituteId || null);
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
    try {
      // Mock data for testing UI
      const mockData = {
        assignments: [
          {
            originalTeacher: "Sir Bakir Shah",
            period: 1,
            className: "10A",
            substitute: "Sir Waqar Ali",
            substitutePhone: "+923113588606"
          },
          {
            originalTeacher: "Sir Bakir Shah",
            period: 2,
            className: "10A",
            substitute: "Sir Waqar Ali",
            substitutePhone: "+923113588606"
          },
          {
            originalTeacher: "Sir Bakir Shah",
            period: 7,
            className: "10A",
            substitute: "Sir Waqar Ali",
            substitutePhone: "+923113588606"
          },
          {
            originalTeacher: "Sir Mushtaque Ahmed",
            period: 1,
            className: "10B",
            substitute: "Sir Faisal Ali",
            substitutePhone: "+923473093995"
          },
          {
            originalTeacher: "Sir Mushtaque Ahmed",
            period: 2,
            className: "10B",
            substitute: "Sir Faisal Ali",
            substitutePhone: "+923473093995"
          },
          {
            originalTeacher: "Sir Mushtaque Ahmed",
            period: 8,
            className: "10B",
            substitute: "Sir Faisal Ali",
            substitutePhone: "+923473093995"
          }
        ],
        warnings: [
          "Sir Waqar Ali exceeded maximum workload (6/6)",
          "Sir Faisal Ali exceeded maximum workload (6/6)"
        ]
      };

      console.log('Sending mock data:', mockData);
      res.json(mockData);
    } catch (error) {
      console.error('Get substitute assignments error:', error);
      console.error('Error details:', error instanceof Error ? error.stack : String(error));
      res.status(500).json({ 
        message: "Failed to get substitute assignments",
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

  // Teacher schedule endpoint
  app.get("/api/teacher-schedule/:teacherName", (req, res) => {
    try {
      const teacherName = req.params.teacherName?.toLowerCase();
      if (!teacherName) {
        return res.status(400).json({ error: 'Teacher name is required' });
      }

      // Read the teacher_schedules.json file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/teacher_schedules.json');
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Teacher schedules file not found' });
      }

      const scheduleData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Find the teacher's schedule (with case insensitive matching)
      const teacherSchedule = scheduleData[teacherName] || [];
      
      res.json(teacherSchedule);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      res.status(500).json({ error: 'Failed to fetch teacher schedule' });
    }
  });

  // File upload endpoints
  app.post("/api/upload/timetable", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/timetable_file.csv');

      fs.writeFileSync(filePath, fileContent);
      await processTimetableCSV(fileContent);
      await processAndSaveTeachers(fileContent, undefined);

      res.json({ 
        success: true, 
        message: 'Timetable file uploaded and processed successfully' 
      });
    } catch (error) {
      console.error('Timetable upload error:', error);
      res.status(500).json({ 
        error: 'Failed to process timetable file',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/upload/substitute", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/Substitude_file.csv');

      fs.writeFileSync(filePath, fileContent);
      await processSubstituteCSV(fileContent);
      await processAndSaveTeachers(undefined, fileContent);

      res.json({ 
        success: true, 
        message: 'Substitute file uploaded and processed successfully' 
      });
    } catch (error) {
      console.error('Substitute upload error:', error);
      res.status(500).json({ 
        error: 'Failed to process substitute file',
        message: error instanceof Error ? error.message : String(error)
      });
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

      // Sort by timestamp to get latest entries first
      const sortedTeachers = absentTeachers.sort((a: any, b: any) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      res.json(sortedTeachers);
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

      if (Array.isArray(absentTeachers)) {
        fs.writeFileSync(filePath, JSON.stringify(absentTeachers, null, 2));
        console.log(`Updated absent teachers list with ${absentTeachers.length} teachers`);
        return res.json({ success: true, absentTeachers });
      }

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

  app.post("/api/mark-attendance", async (req, res) => {
    try {
      const { status, teacherName, phoneNumber } = req.body;
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '../data/absent_teachers.json');

      // Create file if it doesn't exist
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }

      // Read current absent teachers
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let absentTeachers = JSON.parse(fileContent);

      if (status === 'absent') {
        // Add teacher if not already in list
        if (!absentTeachers.find((t: any) => t.name === teacherName)) {
          absentTeachers.push({
            name: teacherName,
            phoneNumber: phoneNumber,
            timestamp: new Date().toISOString()
          });
        }
      } else if (status === 'present') {
        // Remove teacher if in list
        absentTeachers = absentTeachers.filter((t: any) => t.name !== teacherName);
      }

      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(absentTeachers, null, 2));

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking attendance:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to mark attendance',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });



  app.post("/api/process-timetables", async (req, res) => {
    try {
      console.log("API: Processing timetables only for schedule data extraction...");
      await processTimetables();
      res.json({ 
        success: true, 
        message: 'Timetables processed and organized successfully'
      });
    } catch (error) {
      console.error('Error processing timetables:', error);
      res.status(500).json({ 
        error: 'Failed to process timetables',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}