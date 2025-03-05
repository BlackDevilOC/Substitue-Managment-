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
import { processLoginRequest, validateToken } from './auth';
import { AbsentTeacher, markTeacherAbsent, getAbsentTeachers } from './attendance-handler';
import { getStoredSubstitutes, storeSubstitute } from './substitute-manager';

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

// Auth endpoints
router.post('/api/login', processLoginRequest);
router.get('/api/validate-token', validateToken);

// Teacher endpoints
router.get('/api/teachers', (req, res) => {
  try {
    const teachersPath = path.resolve(__dirname, '../data/total_teacher.json');
    const teachersData = JSON.parse(fs.readFileSync(teachersPath, 'utf8'));
    res.json(teachersData);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Schedule endpoints
router.get('/api/schedule', (req, res) => {
  try {
    const schedulePath = path.resolve(__dirname, '../data/class_schedules.json');
    const scheduleData = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
    res.json(scheduleData);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Teacher schedule endpoints
router.get('/api/teacher-schedule/:teacherId', (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacherSchedulePath = path.resolve(__dirname, '../data/teacher_schedules.json');
    const teacherScheduleData = JSON.parse(fs.readFileSync(teacherSchedulePath, 'utf8'));

    const teacherSchedule = teacherScheduleData.find((schedule: any) => schedule.teacherId === parseInt(teacherId));

    if (!teacherSchedule) {
      return res.status(404).json({ error: 'Teacher schedule not found' });
    }

    res.json(teacherSchedule);
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    res.status(500).json({ error: 'Failed to fetch teacher schedule' });
  }
});

// Attendance management
router.post('/api/mark-absent', async (req, res) => {
  try {
    const { teacherName, date, phoneNumber } = req.body;

    if (!teacherName || !date) {
      return res.status(400).json({ error: 'Teacher name and date are required' });
    }

    const absentTeacher: AbsentTeacher = {
      name: teacherName,
      date,
      phoneNumber
    };

    await markTeacherAbsent(absentTeacher);
    res.json({ success: true, message: 'Teacher marked as absent' });
  } catch (error) {
    console.error('Error marking teacher absent:', error);
    res.status(500).json({ error: 'Failed to mark teacher as absent' });
  }
});

router.get('/api/get-absent-teachers', async (req, res) => {
  try {
    const absentTeachers = await getAbsentTeachers();
    res.json(absentTeachers);
  } catch (error) {
    console.error('Error fetching absent teachers:', error);
    res.status(500).json({ error: 'Failed to fetch absent teachers' });
  }
});

// Substitute management
router.post('/api/assign-substitute', async (req, res) => {
  try {
    const { classId, substituteId, date } = req.body;

    if (!classId || !substituteId || !date) {
      return res.status(400).json({ error: 'Class ID, substitute ID, and date are required' });
    }

    await storeSubstitute({
      classId,
      substituteId,
      date
    });

    res.json({ success: true, message: 'Substitute assigned successfully' });
  } catch (error) {
    console.error('Error assigning substitute:', error);
    res.status(500).json({ error: 'Failed to assign substitute' });
  }
});

router.get('/api/get-substitutes', async (req, res) => {
  try {
    const substitutes = await getStoredSubstitutes();
    res.json(substitutes);
  } catch (error) {
    console.error('Error fetching substitutes:', error);
    res.status(500).json({ error: 'Failed to fetch substitutes' });
  }
});

// Substitute assignments endpoint
router.get('/api/substitute-assignments', (req, res) => {
  try {
    const filePath = path.resolve(__dirname, '../data/assigned_teacher.json');

    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'Assignments data not found' });
    }
  } catch (error) {
    console.error('Error fetching substitute assignments:', error);
    res.status(500).json({ error: 'Failed to fetch substitute assignments' });
  }
});


export async function registerRoutes(app: Express): Promise<Server> {
  await processAndSaveTeachers();
  app.use(router); // Integrate the new router

  // Retain file upload endpoints
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