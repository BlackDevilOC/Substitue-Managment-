
// Simple test script for the autoassign endpoint
const fetch = require('node-fetch');

async function testAutoassign() {
  try {
    console.log("Testing autoassign endpoint...");
    
    const response = await fetch('http://localhost:5000/api/autoassign');
    const data = await response.json();
    
    console.log("Response:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`✅ Successfully assigned ${data.assignmentsCount} substitutes`);
      
      // Print details of assignments
      if (data.assignments && data.assignments.length > 0) {
        console.log("\nAssignment Details:");
        data.assignments.forEach((assignment, index) => {
          console.log(`\n[${index + 1}] ${assignment.originalTeacher} → ${assignment.substitute}`);
          console.log(`   Class: ${assignment.className}, Period: ${assignment.period}`);
          console.log(`   Substitute Phone: ${assignment.substitutePhone}`);
        });
      }
      
      // Print any warnings
      if (data.warnings && data.warnings.length > 0) {
        console.log("\nWarnings:");
        data.warnings.forEach((warning, index) => {
          console.log(`   ⚠️ ${warning}`);
        });
      }
    } else {
      console.log(`❌ Error: ${data.message}`);
    }
  } catch (error) {
    console.error("Failed to test autoassign endpoint:", error);
  }
}

testAutoassign();n();
