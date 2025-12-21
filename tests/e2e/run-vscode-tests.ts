/**
 * VS Code Extension E2E Test Runner
 * 
 * This script launches a real VS Code instance with the extension loaded
 * and runs E2E tests that interact with the VS Code GUI.
 */

import * as path from 'path';
import * as fs from 'fs';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Go up from tests/e2e to project root, then into vscode-extension
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../vscode-extension');
    
    // The path to the extension test script
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    
    // The path to the test workspace (samples folder at project root)
    const testWorkspacePath = path.resolve(__dirname, '../../../samples');
    
    // Create screenshots directory at project root
    const screenshotsDir = path.resolve(__dirname, '../../../test-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    console.log('🚀 Starting VS Code E2E Tests...');
    console.log(`📁 Extension path: ${extensionDevelopmentPath}`);
    console.log(`📁 Tests path: ${extensionTestsPath}`);
    console.log(`📁 Workspace: ${testWorkspacePath}`);
    console.log(`📸 Screenshots: ${screenshotsDir}`);
    
    // Verify paths exist
    if (!fs.existsSync(extensionDevelopmentPath)) {
      throw new Error(`Extension path not found: ${extensionDevelopmentPath}`);
    }
    if (!fs.existsSync(testWorkspacePath)) {
      throw new Error(`Workspace path not found: ${testWorkspacePath}`);
    }

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspacePath,
        '--disable-extensions',  // Disable other extensions
        '--disable-gpu',         // Disable GPU for CI
      ],
    });

    console.log('✅ All E2E tests passed!');
  } catch (err) {
    console.error('❌ Failed to run E2E tests:', err);
    process.exit(1);
  }
}

main();
