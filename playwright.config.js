// @ts-check
// playwright.config.js
// https://playwright.dev/docs/test-configuration
//
// NOTE: These tests validate PROJECT INFRASTRUCTURE, not the VS Code extension.
// For real VS Code extension E2E tests, run:
//   npm run test:vscode-e2e
//
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: ["infrastructure.spec.ts"],  // Only run infrastructure tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Output directory for test artifacts
  outputDir: "test-results/",
});
