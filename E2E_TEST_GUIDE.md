# E2E Test Guide for VS-ZX Project

## Running E2E Tests from Command Line

### Basic Commands

```bash
# Run all Playwright tests
npm run test:playwright

# Run tests with interactive UI interface
npm run test:playwright:ui

# View test report after running tests
npm run test:playwright:report

# Run VS Code extension E2E test specifically
npm run test:vscode-e2e
```

### Advanced Test Running

```bash
# Run a specific test file
npx playwright test tests/vscode-format-test

# Run tests matching a pattern (e.g., all format tests)
npx playwright test format

# Run tests with specific browser (chromium is default)
npx playwright test --project=chromium

# Run tests with visible browser (headed mode)
npx playwright test --headed

# List all available tests without running them
npx playwright test --list

# Run tests with debug information
npx playwright test --debug

# Run tests and show trace viewer on failure
npx playwright test --trace on
```

### Test Configuration Options

The tests are configured in `playwright.config.js` with:

- **Browser**: Chromium (can be extended to Firefox, WebKit)
- **Test Directory**: `./tests`
- **Test Pattern**: `**/*.spec.ts` (all TypeScript files ending with .spec.ts)
- **Parallel Execution**: `fullyParallel: true`
- **Retries**: 2 retries in CI, 0 locally
- **Artifacts**: Screenshots, videos, and traces on failure in `test-results/`

### Available Test Categories

#### 1. Playwright Integration Tests (`playwright-integration.spec.ts`)

- Basic Playwright setup verification
- VS Code extension page navigation

#### 2. Simple Validation Tests (`simple-validation.spec.ts`)

- Extension package existence validation
- VS Code API accessibility
- Extension development environment checks

#### 3. VS Code E2E Tests (`vscode-e2e.spec.ts`)

- VS Code extension loading and activation
- Extension package validation

#### 4. Format Demo Tests (`format-demo-test.spec.ts`)

- Basic file formatting simulation
- File comparison and difference analysis

#### 5. VS Code Format Tests (`vscode-format-test.spec.ts`)

- VS Code extension API formatting simulation
- Advanced file comparison

### Running Specific Test Types

```bash
# Run only integration tests
npx playwright test playwright-integration

# Run only validation tests
npx playwright test simple-validation

# Run only format tests
npx playwright test format

# Run only VS Code E2E tests
npx playwright test vscode-e2e
```

### Test Artifacts and Reports

After running tests:

```bash
# View HTML test report
npm run test:playwright:report

# Test artifacts are stored in:
test-results/
  ├── test-results/          # HTML reports
  ├── screenshots/           # Failure screenshots
  ├── videos/                # Test videos
  ├── traces/                # Test traces
```

### CI/CD Integration

The tests are configured to run in CI environments:

- **Retries**: 2 retries for flaky tests in CI
- **Parallel execution**: Tests run in parallel for faster execution
- **Forbid only**: `--forbid-only` flag prevents focused tests in CI

### Debugging Tests

```bash
# Run a single test with debug
npx playwright test tests/vscode-format-test.spec.ts --debug

# Run with headed browser to see what's happening
npx playwright test tests/vscode-format-test.spec.ts --headed

# Show trace viewer for failed tests
npx playwright show-report
```

### Test Development Workflow

1. **Write tests**: Create new `.spec.ts` files in the `tests/` directory
2. **Run tests**: Use `npm run test:playwright` or specific test commands
3. **Debug**: Use `--headed` and `--debug` flags
4. **Fix issues**: Update tests based on failures
5. **Commit**: Add tests to version control

### Example: Running a Single Test File

```bash
# Run the VS Code format test specifically
npx playwright test tests/vscode-format-test.spec.ts

# Run with visible browser
npx playwright test tests/vscode-format-test.spec.ts --headed

# Run with debug output
npx playwright test tests/vscode-format-test.spec.ts --debug
```

### Example: Running Tests with Specific Patterns

```bash
# Run all tests containing "format" in the filename
npx playwright test format

# Run all tests in files ending with "e2e"
npx playwright test e2e

# Run tests with "validation" in the filename
npx playwright test validation
```

## Test Results Summary

- **Total Tests**: 11 tests across 5 test files
- **Test Categories**: Integration, Validation, E2E, Formatting
- **Browser Support**: Chromium (configurable for other browsers)
- **Reporting**: HTML reports, screenshots, videos, traces
- **CI Ready**: Configured for continuous integration

The E2E testing infrastructure is fully set up and ready for extension with additional test cases!
