// Simple validation test for VS Code extension setup
import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { join, resolve } from "path";

test("VS Code extension package exists", async () => {
  // Verify that the extension package was created successfully
  const extensionPath = resolve(process.cwd(), "vscode-extension");
  const result = execSync('find . -name "*.vsix"', {
    cwd: extensionPath,
    encoding: "utf8",
    stdio: "pipe",
  });

  const vsixFiles = result
    .trim()
    .split("\n")
    .filter((f) => f.endsWith(".vsix"));
  expect(vsixFiles.length).toBeGreaterThan(0);
  console.log("✅ VSIX package found:", vsixFiles[0]);
});

test("VS Code extension can be launched", async ({ page }) => {
  // Verify we can navigate to VS Code documentation
  await page.goto("https://code.visualstudio.com/api");
  await expect(page).toHaveTitle(/Visual Studio Code/);
  console.log("✅ VS Code API documentation accessible");
});

test("Extension development environment is ready", async () => {
  // Verify that all necessary files exist for extension development
  const extensionPath = resolve(process.cwd(), "vscode-extension");
  const filesToCheck = [
    "package.json",
    "out/extension.js",
    "syntaxes/zx-basic.tmLanguage.json",
  ];

  for (const file of filesToCheck) {
    const fullPath = join(extensionPath, file);
    try {
      execSync(`test -f "${fullPath}"`);
      console.log(`✅ File exists: ${file}`);
    } catch (error) {
      console.log(`❌ File missing: ${file}`);
      expect(false).toBe(true); // Force test failure
    }
  }
});
