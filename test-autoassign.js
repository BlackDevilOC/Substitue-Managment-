
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
    } else {
      console.log(`❌ Error: ${data.message}`);
    }
  } catch (error) {
    console.error("Failed to test autoassign endpoint:", error);
  }
}

testAutoassign();
