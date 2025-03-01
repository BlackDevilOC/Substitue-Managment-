import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createAttendanceHandler } from './attendance-handler';
import { createSubstituteManager } from './substitute-manager';
import { createSmsHandler } from './sms-handler';
import { storage } from './storage';
import { createCsvHandler } from './csv-handler';

// Initialize routes
export function setupRoutes(app: express.Application, prisma: PrismaClient) {
  const attendanceHandler = createAttendanceHandler(storage);
  const substituteManager = createSubstituteManager(storage);
  const smsHandler = createSmsHandler(storage);
  const csvHandler = createCsvHandler(storage);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Teacher endpoints
  app.get('/api/teachers', (req, res) => {
    res.json(storage.teachers);
  });

  app.get('/api/teachers/:id', (req, res) => {
    const teacher = storage.teachers.find(t => t.id === parseInt(req.params.id));
    if (teacher) {
      res.json(teacher);
    } else {
      res.status(404).json({ error: 'Teacher not found' });
    }
  });

  // Attendance endpoints
  app.get('/api/attendance', (req, res) => {
    const date = req.query.date as string;
    const records = attendanceHandler.getAttendanceByDate(date);
    res.json(records);
  });

  app.post('/api/attendance', (req, res) => {
    try {
      const record = attendanceHandler.markAttendance(req.body);
      res.json(record);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.put('/api/attendance/:id', (req, res) => {
    try {
      const record = attendanceHandler.updateAttendance(parseInt(req.params.id), req.body);
      res.json(record);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Substitution endpoints
  app.get('/api/substitutions', (req, res) => {
    const date = req.query.date as string;
    const substitutions = substituteManager.getSubstitutionsByDate(date);
    res.json(substitutions);
  });

  app.post('/api/substitutions', (req, res) => {
    try {
      const substitution = substituteManager.createSubstitution(req.body);
      res.json(substitution);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/substitutions/:id', (req, res) => {
    try {
      substituteManager.deleteSubstitution(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // SMS endpoints
  app.post('/api/sms/send', (req, res) => {
    try {
      const result = smsHandler.sendSms(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get('/api/sms/history', (req, res) => {
    const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined;
    const history = smsHandler.getSmsHistory(teacherId);
    res.json(history);
  });

  // Timetable endpoints
  app.get('/api/timetable', (req, res) => {
    const day = req.query.day as string;
    const timetable = storage.timetable.filter(t => !day || t.day === day);
    res.json(timetable);
  });

  app.get('/api/timetable/teacher/:id', (req, res) => {
    const teacherId = parseInt(req.params.id);
    const day = req.query.day as string;

    const timetable = storage.timetable.filter(t => 
      t.teacherId === teacherId && (!day || t.day === day)
    );

    res.json(timetable);
  });

  app.get('/api/timetable/class/:className', (req, res) => {
    const className = req.params.className;
    const day = req.query.day as string;

    const timetable = storage.timetable.filter(t => 
      t.className === className && (!day || t.day === day)
    );

    res.json(timetable);
  });

  // CSV upload endpoints
  app.post('/api/upload/timetable', csvHandler.handleTimetableUpload);
  app.post('/api/upload/substitute', csvHandler.handleSubstituteUpload);

  // Configuration endpoints
  app.get('/api/config/periods', (req, res) => {
    res.json(storage.periodConfig);
  });

  app.post('/api/config/periods', (req, res) => {
    try {
      storage.periodConfig = req.body;
      res.json(storage.periodConfig);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  return app;
}