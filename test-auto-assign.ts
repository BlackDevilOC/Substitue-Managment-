
import * as fs from 'fs';
import * as path from 'path';
import { SubstituteManager } from './server/substitute-manager.js';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants for file paths
const ABSENT_TEACHERS_PATH = path.join(__dirname, 'data/absent_teachers.json');
const ASSIGNED_TEACHERS_PATH = path.join(__dirname, 'data/assigned_teacher.json');

async function main() {
  try {
    // 1. Mark Sir Baqar Shah as absent
    const teacherToMarkAbsent = "Sir Bakir Shah";
    const absentTeachers = [{
      name: teacherToMarkAbsent,
      phoneNumber: "+923156103995",
      timestamp: new Date().toISOString()
    }];
    
    // Write to absent_teachers.json
    fs.writeFileSync(ABSENT_TEACHERS_PATH, JSON.stringify(absentTeachers, null, 2));
    console.log(`Marked ${teacherToMarkAbsent} as absent`);
    
    // 2. Create substitute manager and run auto-assign
    const manager = new SubstituteManager();
    
    // Load data from timetable and substitute files
    await manager.loadData();
    console.log("Data loaded successfully");
    
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
    const savedAssignments = JSON.parse(fs.readFileSync(ASSIGNED_TEACHERS_PATH, 'utf-8'));
    console.log(JSON.stringify(savedAssignments, null, 2));
    
  } catch (error) {
    console.error("Error during auto-assignment test:", error);
  }
}

// Run the test
main().catch(console.error);
