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
import express from 'express';
import { z } from 'zod';
import { markAttendance, sendAbsenceAlert } from './attendance-handler';
import { findSubstitutes, assignSubstitutes } from './substitute-manager';

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

const router = express.Router();

router.get('/api/teachers', async (_req, res) => {
  try {
    const teachersPath = path.join(__dirname, '../data/total_teacher.json');
    const teachersData = fs.readFileSync(teachersPath, 'utf8');
    const teachers = JSON.parse(teachersData);

    const formattedTeachers = teachers.map((teacher: any, index: number) => ({
      id: index + 1,
      name: teacher.name,
      phoneNumber: teacher.phone || ''
    }));

    console.log(`Read ${teachers.length} teachers from total_teacher.json`);

    res.json(formattedTeachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

router.post('/api/mark-attendance', async (req, res) => {
  try {
    const schema = z.object({
      teacherName: z.string(),
      status: z.enum(['present', 'absent']),
      phoneNumber: z.string().optional()
    });

    const { teacherName, status, phoneNumber } = schema.parse(req.body);

    await markAttendance(teacherName, status, phoneNumber);

    if (status === 'absent') {
      await sendAbsenceAlert(teacherName, phoneNumber);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

router.get('/api/teacher-schedule/:teacherName', (req, res) => {
  try {
    const { teacherName } = req.params;
    const scheduleDataPath = path.join(__dirname, '../data/teacher_schedules.json');
    const schedulesData = fs.readFileSync(scheduleDataPath, 'utf8');
    const schedules = JSON.parse(schedulesData);

    const teacherSchedule = schedules[teacherName.toLowerCase()] || [];

    res.json(teacherSchedule);
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    res.status(500).json({ error: 'Failed to fetch teacher schedule' });
  }
});

router.get('/api/get-absent-teachers', (req, res) => {
  try {
    const absentTeachersPath = path.join(__dirname, '../data/absent_teachers.json');

    if (!fs.existsSync(absentTeachersPath)) {
      return res.json([]);
    }

    const data = fs.readFileSync(absentTeachersPath, 'utf8');
    const absentTeachers = JSON.parse(data);

    const today = new Date().toISOString().split('T')[0];

    const todaysAbsentTeachers = absentTeachers
      .filter((teacher: any) => teacher.date === today)
      .map((teacher: any) => ({
        name: teacher.teacherName,
        phoneNumber: teacher.phoneNumber || '',
        date: teacher.date
      }));

    res.json(todaysAbsentTeachers);
  } catch (error) {
    console.error('Error fetching absent teachers:', error);
    res.status(500).json({ error: 'Failed to fetch absent teachers' });
  }
});

router.post('/api/remove-absence', (req, res) => {
  try {
    const { teacherName } = req.body;

    if (!teacherName) {
      return res.status(400).json({ error: 'Teacher name is required' });
    }

    const absentTeachersPath = path.join(__dirname, '../data/absent_teachers.json');

    if (!fs.existsSync(absentTeachersPath)) {
      return res.status(404).json({ error: 'No absent teachers found' });
    }

    const data = fs.readFileSync(absentTeachersPath, 'utf8');
    let absentTeachers = JSON.parse(data);

    const today = new Date().toISOString().split('T')[0];

    absentTeachers = absentTeachers.filter(
      (teacher: any) => !(teacher.teacherName === teacherName && teacher.date === today)
    );

    fs.writeFileSync(absentTeachersPath, JSON.stringify(absentTeachers, null, 2));

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing absence:', error);
    res.status(500).json({ error: 'Failed to remove absence' });
  }
});

router.get('/api/schedule/:day', (req, res) => {
  try {
    const { day } = req.params;
    const daySchedulePath = path.join(__dirname, '../data/day_schedules.json');
    const daySchedulesData = fs.readFileSync(daySchedulePath, 'utf8');
    const daySchedules = JSON.parse(daySchedulesData);

    if (!daySchedules[day.toLowerCase()]) {
      return res.status(404).json({ error: `No schedule found for ${day}` });
    }

    res.json(daySchedules[day.toLowerCase()]);
  } catch (error) {
    console.error(`Error fetching schedule for ${req.params.day}:`, error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.post('/api/find-substitutes', async (req, res) => {
  try {
    const schema = z.object({
      teacherName: z.string(),
      date: z.string().optional()
    });

    const { teacherName, date } = schema.parse(req.body);
    const today = date || new Date().toISOString().split('T')[0];
    const day = new Date(today).toLocaleDateString('en-US', { weekday: 'lowercase' });

    const substitutes = await findSubstitutes(teacherName, day);

    res.json(substitutes);
  } catch (error) {
    console.error('Error finding substitutes:', error);
    res.status(500).json({ error: 'Failed to find substitutes' });
  }
});

router.post('/api/assign-substitutes', async (req, res) => {
  try {
    const schema = z.object({
      absentTeacher: z.string(),
      assignments: z.array(z.object({
        period: z.number(),
        className: z.string(),
        substituteTeacher: z.string()
      })),
      date: z.string().optional()
    });

    const { absentTeacher, assignments, date } = schema.parse(req.body);
    const today = date || new Date().toISOString().split('T')[0];

    await assignSubstitutes(absentTeacher, assignments, today);

    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning substitutes:', error);
    res.status(500).json({ error: 'Failed to assign substitutes' });
  }
});

router.get('/api/absences', (_req, res) => {
  try {
    const absentTeachersPath = path.join(__dirname, '../data/absent_teachers.json');

    if (!fs.existsSync(absentTeachersPath)) {
      return res.json([]);
    }

    const data = fs.readFileSync(absentTeachersPath, 'utf8');
    const absentTeachers = JSON.parse(data);

    res.json(absentTeachers);
  } catch (error) {
    console.error('Error fetching all absences:', error);
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});


export async function registerRoutes(app: Express): Promise<Server> {
  await processAndSaveTeachers();

  app.use('/api', router);


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

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      let absentTeachers = JSON.parse(fileContent);

      if (status === 'absent') {
        if (!absentTeachers.find((t: any) => t.name === teacherName)) {
          absentTeachers.push({
            name: teacherName,
            phoneNumber: phoneNumber,
            timestamp: new Date().toISOString()
          });
        }
      } else if (status === 'present') {
        absentTeachers = absentTeachers.filter((t: any) => t.name !== teacherName);
      }

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

  const httpServer = createServer(app);
  return httpServer;
}