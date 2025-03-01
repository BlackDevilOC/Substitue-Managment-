
import * as fs from 'fs';
import * as path from 'path';
import { processTeacherFiles, getUniqueTeachers } from './teacherExtractor';

// Read files from data directory
const dataDir = path.join(process.cwd(), 'data');
const timetablePath = path.join(dataDir, 'timetable_file.csv');
const substitutePath = path.join(dataDir, 'Substitude_file.csv');

try {
  const timetableContent = fs.readFileSync(timetablePath, 'utf-8');
  const substituteContent = fs.readFileSync(substitutePath, 'utf-8');
  
  // Process the files
  const csvResult = processTeacherFiles(timetableContent, substituteContent);
  
  // Get the unique teachers
  const uniqueTeachers = getUniqueTeachers();
  console.log(`Extracted ${uniqueTeachers.length} unique teachers`);
  
  // Save the results
  fs.writeFileSync(path.join(dataDir, 'extracted_teachers.csv'), csvResult);
  console.log('Results saved to data/extracted_teachers.csv');
  
  // Show the first few teachers
  console.log('Sample of extracted teachers:');
  uniqueTeachers.slice(0, 5).forEach(teacher => {
    console.log(`- ${teacher.canonicalName} (${teacher.phone || 'No phone'})`);
  });
} catch (error) {
  console.error('Error:', error);
}
