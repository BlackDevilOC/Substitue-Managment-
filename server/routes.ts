import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createViteDevServer } from './vite';
import { authenticateUser, requireAuth } from './auth';
import { storage } from './storage';
import { loadTeachers } from '../utils/teacherLoader';
import { loadCsvData } from '../utils/csvLoader';
import { extractTeachers } from '../utils/teacherExtractor';

export async function createServer() {
  const app = express();

  // Set up CORS and JSON parsing
  app.use(cors());
  app.use(express.json());

  // Authenticate user for protected routes
  app.use(authenticateUser);

  // Set up Vite dev server in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteDevServer();
    app.use(vite.middlewares);
  }

  // API routes
  app.get('/api/teachers', requireAuth, async (req, res) => {
    try {
      const teachers = await storage.getTeachers();
      res.json(teachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      res.status(500).json({ error: 'Failed to fetch teachers' });
    }
  });

  app.get('/api/schedule/:day?', requireAuth, async (req, res) => {
    try {
      const day = req.params.day;
      const schedule = day
        ? await storage.getScheduleByDay(day)
        : await storage.getSchedule();
      res.json(schedule);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  });

  app.get('/api/absences', requireAuth, async (req, res) => {
    try {
      const absences = await storage.getAbsences();
      res.json(absences);
    } catch (error) {
      console.error('Error fetching absences:', error);
      res.status(500).json({ error: 'Failed to fetch absences' });
    }
  });

  app.get('/api/substitute-assignments', requireAuth, async (req, res) => {
    try {
      const assignments = await storage.getSubstituteAssignments();
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching substitute assignments:', error);
      res.status(500).json({ error: 'Failed to fetch substitute assignments' });
    }
  });

  app.post('/api/upload/timetable', async (req, res) => {
    try {
      const timetablePath = join(dirname(fileURLToPath(import.meta.url)), '../data/timetable_file.csv');
      await loadCsvData(timetablePath, 'timetable');

      // Extract teachers from both files and save to JSON
      await extractTeachers();

      res.json({ 
        success: true, 
        message: 'Timetable data uploaded successfully' 
      });
    } catch (error) {
      console.error('Error uploading timetable data:', error);
      res.status(500).json({ error: 'Failed to upload timetable data' });
    }
  });

  app.post('/api/upload/substitute', async (req, res) => {
    try {
      const substitutePath = join(dirname(fileURLToPath(import.meta.url)), '../data/Substitude_file.csv');
      await loadCsvData(substitutePath, 'substitute');

      // Extract teachers from both files and save to JSON
      await extractTeachers();

      res.json({ 
        success: true, 
        message: 'Substitute data uploaded successfully' 
      });
    } catch (error) {
      console.error('Error uploading substitute data:', error);
      res.status(500).json({ error: 'Failed to upload substitute data' });
    }
  });

  app.post('/api/import/teachers', requireAuth, async (req, res) => {
    try {
      const teachers = req.body;
      await storage.importTeachers(teachers);
      res.json({ success: true, message: 'Teachers imported successfully' });
    } catch (error) {
      console.error('Error importing teachers:', error);
      res.status(500).json({ error: 'Failed to import teachers' });
    }
  });

  // Add routes for updating absent teachers JSON file
  app.get('/api/get-absent-teachers', async (req, res) => {
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

  // Update the absent teachers JSON file
  app.post('/api/update-absent-teachers-file', async (req, res) => {
    try {
      // Get the absent teachers from the request body
      const { absentTeachers } = req.body;

      // Get the file path
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const filePath = join(__dirname, '../data/absent_teachers.json');

      // Create the file if it doesn't exist
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }

      // Write the absent teachers to the file
      fs.writeFileSync(filePath, JSON.stringify(absentTeachers, null, 2));
      console.log(`Updated absent teachers file with ${absentTeachers.length} entries`);

      res.json({ 
        success: true, 
        message: 'Absent teachers updated successfully',
        count: absentTeachers.length
      });
    } catch (error) {
      console.error('Error updating absent teachers file:', error);
      res.status(500).json({ error: 'Failed to update absent teachers file' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}