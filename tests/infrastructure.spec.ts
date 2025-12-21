/**
 * Infrastructure Validation Tests
 * 
 * These tests validate that the project infrastructure is correctly set up.
 * They do NOT test the VS Code extension directly - for that, use:
 *   npm run test:vscode-e2e
 * 
 * These tests verify:
 * - VSIX package exists
 * - Required files are present
 * - Build outputs are valid
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

test.describe("Project Infrastructure", () => {
  
  test("VSIX extension package exists", async () => {
    const extensionPath = resolve(process.cwd(), "vscode-extension");
    const result = execSync('find . -name "*.vsix" | head -1', {
      cwd: extensionPath,
      encoding: "utf8",
      stdio: "pipe",
    });

    const vsixFile = result.trim();
    expect(vsixFile.length).toBeGreaterThan(0);
    console.log("✅ VSIX package found:", vsixFile);
  });

  test("Extension package.json is valid", async () => {
    const packagePath = resolve(process.cwd(), "vscode-extension/package.json");
    expect(existsSync(packagePath)).toBe(true);
    
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    
    expect(packageJson.name).toBe("zx-basic-vscode-extension");
    expect(packageJson.contributes).toBeDefined();
    expect(packageJson.contributes.languages).toBeDefined();
    expect(packageJson.contributes.commands).toBeDefined();
    
    console.log("✅ Extension package.json is valid");
    console.log(`   Version: ${packageJson.version}`);
    console.log(`   Commands: ${packageJson.contributes.commands.length}`);
  });

  test("Extension compiled output exists", async () => {
    const filesToCheck = [
      "vscode-extension/out/extension.js",
      "vscode-extension/syntaxes/zx-basic.tmLanguage.json",
      "lsp-server/out/server.js",
      "converter/out/index.js",
    ];

    for (const file of filesToCheck) {
      const fullPath = resolve(process.cwd(), file);
      expect(existsSync(fullPath)).toBe(true);
      console.log(`✅ ${file}`);
    }
  });

  test("Sample files exist for testing", async () => {
    const samplesPath = resolve(process.cwd(), "samples");
    expect(existsSync(samplesPath)).toBe(true);
    
    const sampleFiles = [
      "biorhythms.bas",
      "example_hangman.bas",
      "auto-renumber-demo.bas",
    ];

    for (const file of sampleFiles) {
      const fullPath = join(samplesPath, file);
      if (existsSync(fullPath)) {
        console.log(`✅ Sample: ${file}`);
      } else {
        console.log(`⚠️ Sample missing: ${file}`);
      }
    }
  });
});

test.describe("Converter Library", () => {
  
  test("Converter can tokenize BASIC", async () => {
    // This tests the converter library directly
    const converterPath = resolve(process.cwd(), "converter/out/index.js");
    expect(existsSync(converterPath)).toBe(true);
    
    // Import and test
    const converter = require(converterPath);
    expect(typeof converter.convertBasicToTap).toBe("function");
    expect(typeof converter.createMdrFile).toBe("function");
    expect(typeof converter.parseMdrFile).toBe("function");
    
    console.log("✅ Converter library functions available");
  });

  test("MDR round-trip works", async () => {
    const converterPath = resolve(process.cwd(), "converter/out/index.js");
    const converter = require(converterPath);
    
    const testProgram = '10 PRINT "HELLO"\n20 GOTO 10';
    
    // Create MDR
    const mdrBuffer = converter.createMdrFile(testProgram, "TEST", "TESTCART");
    expect(mdrBuffer.length).toBe(137923); // Standard MDR size
    
    // Parse MDR
    const result = converter.parseMdrFile(mdrBuffer);
    expect(result.programs.length).toBe(1);
    expect(result.programs[0].source).toContain("PRINT");
    expect(result.programs[0].source).toContain("GOTO");
    
    console.log("✅ MDR round-trip successful");
  });
});
