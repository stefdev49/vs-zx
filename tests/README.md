# Playwright Tests for VS-ZX Project

This directory contains Playwright end-to-end tests for the VS-ZX VS Code extension.

## Setup

Playwright has been installed and configured for this project. The configuration includes:

- Chromium browser testing
- HTML reporting
- Screenshots and videos on failure
- Test artifacts in `test-results/` directory

## Running Tests

### Run all tests

```bash
npm run test:playwright
```

### Run tests with UI

```bash
npm run test:playwright:ui
```

### View test report

```bash
npm run test:playwright:report
```

## Test Structure

- `playwright-integration.spec.ts` - Basic integration tests
- `vscode-extension.spec.ts` - VS Code extension specific tests
- `playwright.config.js` - Playwright configuration

## Writing Tests

Tests should follow the Playwright test format:

```typescript
import { test, expect } from "@playwright/test";

test("test description", async ({ page }) => {
  // Test implementation
  await page.goto("https://example.com");
  await expect(page).toHaveTitle(/Expected Title/);
});
```

## VS Code Extension Testing

For actual VS Code extension testing, you would typically:

1. Launch VS Code with the extension loaded
2. Open a ZX BASIC file (.bas)
3. Test language features, syntax highlighting, commands, etc.

Example configuration for VS Code extension testing is in `playwright.config.js`.

## Notes

- Jest tests (for unit testing) are in `integration.jest.spec.ts`
- Playwright tests use the naming pattern `playwright*.spec.ts`
- Test files should be in TypeScript (.ts) format
