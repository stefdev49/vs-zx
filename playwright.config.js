// @ts-check
// playwright.config.js
// https://playwright.dev/docs/test-configuration
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Uncomment the line below to always run in headed mode (show browser window)
    // headless: false,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Configure for VS Code extension testing
        launchOptions: {
          args: [
            "--disable-extensions-except=/home/stef/projets/vs-zx/vscode-extension",
            "--load-extension=/home/stef/projets/vs-zx/vscode-extension",
          ],
        },
      },
    },
  ],
  // Output directory for test artifacts
  outputDir: "test-results/",
});
