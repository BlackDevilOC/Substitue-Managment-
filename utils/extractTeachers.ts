
import * as fs from 'fs';
import * as path from 'path';
import { processTeacherFiles, getUniqueTeachers, verifyTeacherCount } from './teacherExtractor';

// Read files from data directory
const dataDir = path.join(process.cwd(), 'data');
const timetablePath = path.join(dataDir, 'timetable_file.csv');
const substitutePath = path.join(dataDir, 'Substitude_file.csv');

console.log('Starting teacher extraction process...');
console.log(`Using timetable file: ${timetablePath}`);
console.log(`Using substitute file: ${substitutePath}`);

try {
  // Check if files exist
  if (!fs.existsSync(timetablePath)) {
    throw new Error(`Timetable file not found: ${timetablePath}`);
  }
  
  if (!fs.existsSync(substitutePath)) {
    throw new Error(`Substitute file not found: ${substitutePath}`);
  }

  const timetableContent = fs.readFileSync(timetablePath, 'utf-8');
  const substituteContent = fs.readFileSync(substitutePath, 'utf-8');
  
  console.log('Files loaded successfully, processing...');
  
  // Process the files
  const csvResult = processTeacherFiles(timetableContent, substituteContent);
  
  // Get the unique teachers
  const uniqueTeachers = getUniqueTeachers();
  console.log(`Extracted ${uniqueTeachers.length} unique teachers`);
  
  // Save the results
  fs.writeFileSync(path.join(dataDir, 'extracted_teachers.csv'), csvResult);
  console.log('Results saved to data/extracted_teachers.csv');
  
  // Verify the expected count
  const isCorrectCount = verifyTeacherCount();
  console.log(`Teacher count verification: ${isCorrectCount ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  // Show the first few teachers
  console.log('Sample of extracted teachers:');
  uniqueTeachers.slice(0, 5).forEach(teacher => {
    console.log(`- ${teacher.canonicalName} (${teacher.phone || 'No phone'})`);
  });

  // Show all teacher names if count doesn't match
  if (!isCorrectCount) {
    console.log('All extracted teachers:');
    uniqueTeachers.forEach(teacher => {
      console.log(`- ${teacher.canonicalName}`);
    });
  }
  
  console.log('Teacher extraction process completed.');
} catch (error) {
  console.error('Error during teacher extraction:', error);
}
