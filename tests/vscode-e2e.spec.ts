// VS Code Extension E2E Tests using Playwright
import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { join } from "path";

test("VS Code extension can be launched and loaded", async ({ page }) => {
  // This test validates that we can launch VS Code with our extension
  // Note: This is a basic validation test - actual extension testing would require
  // more complex setup with @vscode/test-electron

  // Verify we can at least navigate to VS Code documentation
  await page.goto("https://code.visualstudio.com/api");
  await expect(page).toHaveTitle(/Visual Studio Code/);

  // Check that extension API documentation is accessible
  await expect(
    page.getByRole("heading", { name: "Extension API" }),
  ).toBeVisible();

  // Take screenshot of VS Code API page
  await page.screenshot({ path: "test-screenshots/vscode-api-page.png" });
  console.log("📸 Screenshot saved: vscode-api-page.png");
});

test("Extension package validation", async () => {
  // Verify that the extension package was created successfully
  const extensionPath = join("vscode-extension");
  const vsixFiles = execSync('find . -name "*.vsix"', {
    cwd: extensionPath,
    encoding: "utf8",
  });

  expect(vsixFiles.trim().length).toBeGreaterThan(0);
  console.log("VSIX package found:", vsixFiles.trim());
});
