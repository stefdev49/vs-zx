// Debug script to see what's available in VS Code extension environment
console.log("🔍 Debugging VS Code extension environment...");

try {
  const vscode = require("vscode");
  console.log("✅ vscode module available");

  // Check what testing frameworks are available
  console.log("📋 Available global objects:");
  console.log("- suite:", typeof suite);
  console.log("- test:", typeof test);
  console.log("- describe:", typeof describe);
  console.log("- it:", typeof it);
  console.log("- expect:", typeof expect);
  console.log("- assert:", typeof assert);

  // Try to require common testing frameworks
  try {
    const mocha = require("mocha");
    console.log("✅ mocha available");
  } catch (e) {
    console.log("❌ mocha not available:", e.message);
  }

  try {
    const chai = require("chai");
    console.log("✅ chai available");
  } catch (e) {
    console.log("❌ chai not available:", e.message);
  }

  try {
    const jest = require("jest");
    console.log("✅ jest available");
  } catch (e) {
    console.log("❌ jest not available:", e.message);
  }

  // Check process.env
  console.log("📋 Environment:");
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- VSCODE_TEST_ELECTRON:", process.env.VSCODE_TEST_ELECTRON);
} catch (error) {
  console.error("❌ Error in debug script:", error);
}

console.log("📝 Debug complete");
