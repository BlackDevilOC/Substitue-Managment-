
import fs from 'fs';
import path from 'path';
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

    console.log("Processing timetable file only for schedule information...");
    const fileContent = fs.readFileSync(timetablePath, 'utf-8');
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true // Allow for inconsistent column counts
    });

    // Initialize data structures with improved organization
    const teacherSchedules: { [key: string]: TeacherSchedule[] } = {};
    const daySchedules: { [key: string]: DaySchedule[] } = {};
    
    // Add period-specific indexing for faster lookups
    const periodSchedules: { [key: string]: { [key: number]: DaySchedule[] } } = {};
    
    // Add class-specific indexing
    const classSchedules: { [key: string]: { [key: string]: DaySchedule[] } } = {};
    const validClasses = ['10A', '10B', '10C', '9A', '9B', '9C', '8A', '8B', '8C', '7A', '7B', '7C', '6A', '6B', '6C'];

    for (const row of records) {
      const day = normalizeDay(row[0]?.trim());
      if (!day) {
        console.warn(`Invalid day: ${row[0]}`);
        continue;
      }

      const period = parseInt(row[1]?.trim(), 10);
      if (isNaN(period)) {
        console.warn(`Invalid period: ${row[1]}`);
        continue;
      }

      // Process each class column
      for (let j = 2; j < row.length; j++) {
        const teacherName = normalizeTeacherName(row[j]?.trim());
        if (!teacherName || teacherName.toLowerCase() === 'empty') {
          continue;
        }

        const className = validClasses[j - 2] || `UnknownClass_${j - 2}`; // Handle additional columns
        if (!className) {
          console.warn(`Invalid class column index: ${j}`);
          continue;
        }

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
        
        // Add to period schedules for faster period-specific lookups
        if (!periodSchedules[day]) {
          periodSchedules[day] = {};
        }
        if (!periodSchedules[day][period]) {
          periodSchedules[day][period] = [];
        }
        periodSchedules[day][period].push({ period, teacherName, className });
        
        // Add to class schedules for class-specific lookups
        if (!classSchedules[className]) {
          classSchedules[className] = {};
        }
        if (!classSchedules[className][day]) {
          classSchedules[className][day] = [];
        }
        classSchedules[className][day].push({ period, teacherName, className });
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
    
    // Save period-indexed schedules
    const periodSchedulesPath = path.join(dataDir, 'period_schedules.json');
    fs.writeFileSync(periodSchedulesPath, JSON.stringify(periodSchedules, null, 2));
    
    // Save class-indexed schedules
    const classSchedulesPath = path.join(dataDir, 'class_schedules.json');
    fs.writeFileSync(classSchedulesPath, JSON.stringify(classSchedules, null, 2));

    console.log('Timetable processing completed successfully');

    // Retrieve Tuesday's timetable for Sir Mushtaque Ahmed
    const sirMushtaqueAhmedSchedule = teacherSchedules['sir mushtaque ahmed'];
    if (sirMushtaqueAhmedSchedule) {
      const tuesdaySchedule = sirMushtaqueAhmedSchedule.filter(entry => entry.day === 'tuesday');
      console.log("Tuesday's timetable for Sir Mushtaque Ahmed:", tuesdaySchedule);
    } else {
      console.log("No schedule found for Sir Mushtaque Ahmed.");
    }
  } catch (error) {
    console.error('Error processing timetables:', error);
    throw error;
  }
}

function normalizeDay(day: string): string | null {
  const days: { [key: string]: string } = {
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

function normalizeTeacherName(teacherName: string): string | null {
  if (!teacherName || teacherName.trim() === '') {
    return null;
  }
  // Standardize teacher names (e.g., convert to lowercase or a consistent format)
  return teacherName.trim().toLowerCase();
}

// Run the function
processTimetables();
