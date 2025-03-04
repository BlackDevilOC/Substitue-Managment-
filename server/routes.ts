import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path, { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createViteDevServer } from './vite';

export async function createServer() {
  const app = express();

  // Set up CORS and JSON parsing
  app.use(cors());
  app.use(express.json());

  // Set up Vite dev server in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteDevServer();
    app.use(vite.middlewares);
  }

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