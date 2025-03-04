import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

interface TeacherSchedule {
  day: string;
  period: number;
  className: string;
}

interface DaySchedule {
  period: number;
  teacherName: string;
  className: string;
}

export async function processTimetables(): Promise<void> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataDir = path.join(__dirname, '../data');

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const timetablePath = path.join(dataDir, 'timetable_file.csv');
    if (!fs.existsSync(timetablePath)) {
      throw new Error('Timetable file not found');
    }

    const fileContent = fs.readFileSync(timetablePath, 'utf-8');
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true // Allow for inconsistent column counts
    });

    // Initialize data structures
    const teacherSchedules: { [key: string]: TeacherSchedule[] } = {};
    const daySchedules: { [key: string]: DaySchedule[] } = {};
    const validClasses = ['10a', '10b', '10c', '9a', '9b', '9c', '8a', '8b', '8c', '7a', '7b', '7c', '6a', '6b', '6c'];

    // Process each row
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (!row[0] || !row[1]) continue;

      const day = normalizeDay(row[0].toLowerCase().trim());
      const period = parseInt(row[1].trim());

      if (!day || isNaN(period)) continue;

      // Process each class column
      for (let j = 2; j < Math.min(row.length, validClasses.length + 2); j++) {
        const teacherName = row[j]?.trim();
        if (teacherName && teacherName.toLowerCase() !== 'empty') {
          const className = validClasses[j - 2];
          
          // Add to teacher schedules
          if (!teacherSchedules[teacherName]) {
            teacherSchedules[teacherName] = [];
          }
          teacherSchedules[teacherName].push({ day, period, className });

          // Add to day schedules
          if (!daySchedules[day]) {
            daySchedules[day] = [];
          }
          daySchedules[day].push({ period, teacherName, className });
        }
      }
    }

    // Sort and organize the data
    Object.values(teacherSchedules).forEach(schedule => {
      schedule.sort((a, b) => {
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        return dayDiff !== 0 ? dayDiff : a.period - b.period;
      });
    });

    Object.values(daySchedules).forEach(schedule => {
      schedule.sort((a, b) => a.period - b.period);
    });

    // Save teacher schedules
    const teacherSchedulesPath = path.join(dataDir, 'teacher_schedules.json');
    fs.writeFileSync(teacherSchedulesPath, JSON.stringify(teacherSchedules, null, 2));

    // Save day schedules
    const daySchedulesPath = path.join(dataDir, 'day_schedules.json');
    fs.writeFileSync(daySchedulesPath, JSON.stringify(daySchedules, null, 2));

    console.log('Timetable processing completed successfully');
  } catch (error) {
    console.error('Error processing timetables:', error);
    throw error;
  }
}

function normalizeDay(day: string): string | null {
  const days = {
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'thurday': 'thursday', // Handle common typo
    'friday': 'friday',
    'saturday': 'saturday'
  };
  return days[day.toLowerCase()] || null;
}
