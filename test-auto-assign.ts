
import * as fs from 'fs';
import * as path from 'path';
import { SubstituteManager } from './server/substitute-manager.js';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants for file paths
const DATA_DIR = path.join(__dirname, 'data');
const ABSENT_TEACHERS_PATH = path.join(DATA_DIR, 'absent_teachers.json');
const ASSIGNED_TEACHERS_PATH = path.join(DATA_DIR, 'assigned_teacher.json');
const SUBSTITUTE_FILE_PATH = path.join(DATA_DIR, 'Substitude_file.csv');
const TIMETABLE_FILE_PATH = path.join(DATA_DIR, 'timetable_file.csv');
const TOTAL_TEACHER_PATH = path.join(DATA_DIR, 'total_teacher.json');
const TEACHER_SCHEDULES_PATH = path.join(DATA_DIR, 'teacher_schedules.json');

async function main() {
  try {
    // 1. Mark Sir Baqar Shah as absent (using both name variations to ensure matches)
    const teacherToMarkAbsent = "Sir Bakir Shah";
    const phoneNumber = "+923156103995";
    
    const absentTeachers = [{
      name: teacherToMarkAbsent,
      phoneNumber: phoneNumber,
      timestamp: new Date().toISOString()
    }];
    
    // Write to absent_teachers.json
    fs.writeFileSync(ABSENT_TEACHERS_PATH, JSON.stringify(absentTeachers, null, 2));
    console.log(`Marked ${teacherToMarkAbsent} as absent`);
    
    // 2. Create substitute manager and run auto-assign
    const manager = new SubstituteManager();
    
    // Check if CSV files exist and show their contents
    console.log("Checking substitute file:", SUBSTITUTE_FILE_PATH);
    if (fs.existsSync(SUBSTITUTE_FILE_PATH)) {
      const substituteContent = fs.readFileSync(SUBSTITUTE_FILE_PATH, 'utf-8');
      console.log("Substitute file content (first 3 lines):");
      console.log(substituteContent.split('\n').slice(0, 3).join('\n'));
    } else {
      console.error("Substitute file not found:", SUBSTITUTE_FILE_PATH);
    }
    
    console.log("\nChecking timetable file:", TIMETABLE_FILE_PATH);
    if (fs.existsSync(TIMETABLE_FILE_PATH)) {
      const timetableContent = fs.readFileSync(TIMETABLE_FILE_PATH, 'utf-8');
      console.log("Timetable file content (first 3 lines):");
      console.log(timetableContent.split('\n').slice(0, 3).join('\n'));
    } else {
      console.error("Timetable file not found:", TIMETABLE_FILE_PATH);
    }
    
    // First, fix any issues with the timetable file to ensure it parses correctly
    fixTimetableFile(TIMETABLE_FILE_PATH);
    
    // Load data from timetable and substitute files
    try {
      await manager.loadData(TIMETABLE_FILE_PATH, SUBSTITUTE_FILE_PATH);
      console.log("Data loaded successfully");
    } catch (error) {
      console.error("Error loading data:", error);
      
      // Try to fix the substitute file if parsing error
      if (fs.existsSync(SUBSTITUTE_FILE_PATH) && error.message.includes("Invalid Record Length")) {
        console.log("Attempting to fix substitute file format...");
        const substituteContent = fs.readFileSync(SUBSTITUTE_FILE_PATH, 'utf-8');
        const lines = substituteContent.split('\n').map(line => {
          // Ensure each line has at least two columns
          const parts = line.split(',');
          if (parts.length < 2 && parts[0].trim()) {
            return parts[0].trim() + ',';
          }
          return line;
        });
        
        const fixedContent = lines.join('\n');
        const backupPath = SUBSTITUTE_FILE_PATH + '.bak';
        fs.writeFileSync(backupPath, substituteContent);
        fs.writeFileSync(SUBSTITUTE_FILE_PATH, fixedContent);
        console.log("Created backup at", backupPath);
        console.log("Fixed substitute file. Retrying data load...");
        
        // Try loading again
        await manager.loadData(TIMETABLE_FILE_PATH, SUBSTITUTE_FILE_PATH);
        console.log("Data loaded successfully after fix");
      }
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Auto-assign substitutes
    console.log(`Running auto-assign for date: ${today}`);
    const result = await manager.autoAssignSubstitutes(today);
    
    // Display the result
    console.log("\n=== Auto-Assignment Results ===");
    console.log(`Total assignments: ${result.assignments.length}`);
    console.log("\nDetailed assignments:");
    
    result.assignments.forEach((assignment, index) => {
      console.log(`\nAssignment #${index + 1}:`);
      console.log(`  Original Teacher: ${assignment.originalTeacher}`);
      console.log(`  Period: ${assignment.period}`);
      console.log(`  Class: ${assignment.className}`);
      console.log(`  Substitute: ${assignment.substitute}`);
      console.log(`  Substitute Phone: ${assignment.substitutePhone}`);
    });
    
    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    // 3. Read the assigned_teacher.json file to verify
    console.log("\nVerifying assignments from file:");
    if (fs.existsSync(ASSIGNED_TEACHERS_PATH)) {
      const savedAssignments = JSON.parse(fs.readFileSync(ASSIGNED_TEACHERS_PATH, 'utf-8'));
      
      // Display the results in a more readable format
      console.log("\n=== ASSIGNMENT RESULTS ===");
      console.log(`Total assignments saved: ${savedAssignments.assignments.length}`);
      
      if (savedAssignments.assignments.length > 0) {
        console.log("\nDetailed assignments:");
        savedAssignments.assignments.forEach((assignment, index) => {
          console.log(`\nAssignment #${index + 1}:`);
          console.log(`  Original Teacher: ${assignment.originalTeacher}`);
          console.log(`  Period: ${assignment.period}`);
          console.log(`  Class: ${assignment.className}`);
          console.log(`  Substitute: ${assignment.substitute}`);
          console.log(`  Substitute Phone: ${assignment.substitutePhone || 'N/A'}`);
        });
      } else {
        console.log("\nNo assignments were saved.");
      }
      
      if (savedAssignments.warnings && savedAssignments.warnings.length > 0) {
        console.log("\nWarnings:");
        savedAssignments.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      }
    } else {
      console.log(`Assignment file not found at: ${ASSIGNED_TEACHERS_PATH}`);
    }
    
    // Show path to the assignment file for future reference
    console.log(`\nAssignment results are stored in: ${ASSIGNED_TEACHERS_PATH}`);
    console.log("You can view this file anytime to see the current assignments.");
    
  } catch (error) {
    console.error("Error during auto-assignment test:", error);
  }
}

// Helper function to fix common timetable issues
function fixTimetableFile(filepath: string) {
  if (!fs.existsSync(filepath)) return;
  
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    const fixedLines = lines.map(line => {
      // Fix line with too many columns by trimming excess commas at the end
      if (line.split(',').length > 17) {
        return line.substring(0, line.lastIndexOf(','));
      }
      return line;
    });
    
    const fixedContent = fixedLines.join('\n');
    const backupPath = filepath + '.bak';
    
    // Only write if something changed
    if (content !== fixedContent) {
      fs.writeFileSync(backupPath, content);
      fs.writeFileSync(filepath, fixedContent);
      console.log("Fixed timetable file format and created backup at", backupPath);
    }
  } catch (error) {
    console.error("Error fixing timetable file:", error);
  }
}

// Run the test
main().catch(console.error);
