# Browser Visibility Guide for Playwright Tests

## Why You Don't See the Browser Window

By default, Playwright runs tests in **headless mode** (without showing the browser window). This is the standard behavior for automated testing because:

1. **Faster Execution**: Headless mode runs significantly faster
2. **CI/CD Friendly**: Works well in continuous integration environments
3. **Resource Efficient**: Uses fewer system resources
4. **Consistent Results**: Eliminates visual rendering variability

## How to See the Browser Window

### Option 1: Run Specific Test with Browser Visible

```bash
# Run a specific test file with visible browser
npx playwright test tests/vscode-format-test.spec.ts --headed

# Run all tests with visible browser
npx playwright test --headed

# Run tests matching a pattern with visible browser
npx playwright test format --headed
```

### Option 2: Run with Debug Mode

```bash
# Run with debug mode (shows browser and pauses on failures)
npx playwright test --debug

# Run specific test with debug
npx playwright test tests/vscode-format-test.spec.ts --debug
```

### Option 3: Use Interactive UI Mode

```bash
# Launch the interactive UI (best for development)
npm run test:playwright:ui
# or
npx playwright test --ui
```

## Configuration Options

### Temporary Headed Mode

Add `--headed` flag to any test command:

```bash
npx playwright test --headed
```

### Permanent Configuration

To always run in headed mode, modify `playwright.config.js`:

```javascript
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  headless: false,  // This makes browser always visible
}
```

### Browser-Specific Configuration

You can configure different browsers with different visibility:

```javascript
projects: [
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      headless: false, // Make Chromium visible
    },
  },
  {
    name: "firefox",
    use: {
      ...devices["Desktop Firefox"],
      headless: true, // Keep Firefox headless
    },
  },
];
```

## When to Use Headed vs Headless Mode

### Use Headed Mode When:

- ✅ Developing new tests
- ✅ Debugging test failures
- ✅ Demonstrating tests to others
- ✅ Learning how tests work
- ✅ Testing visual interactions

### Use Headless Mode When:

- ✅ Running tests in CI/CD
- ✅ Running full test suites
- ✅ Performance testing
- ✅ Automated regression testing
- ✅ Scheduled test runs

## Advanced Visibility Options

### Slow Motion Mode

Slow down test execution to see what's happening:

```bash
npx playwright test --headed --slowmo=500  # 500ms delay between actions
```

### Pause on Failure

Automatically pause when tests fail:

```bash
npx playwright test --headed --debug
```

### Record Videos

Record videos of test execution (works in both modes):

```bash
npx playwright test --video=on
```

## Troubleshooting

### Browser Window Flashes Briefly

This is normal - Playwright opens and closes browsers quickly. Use `--headed` to keep them open.

### Browser Window Doesn't Appear

- Check if you're running in a headless environment (like SSH)
- Ensure you have proper display settings
- Try running with `--headed` explicitly

### Tests Run Too Fast to See

Use slow motion mode:

```bash
npx playwright test --headed --slowmo=1000
```

## Best Practices

1. **Default to Headless**: Use headless mode for most testing
2. **Headed for Development**: Use headed mode when writing/debugging tests
3. **UI Mode for Exploration**: Use `--ui` for interactive test exploration
4. **Video Recording**: Enable video recording for important test runs
5. **Debug Mode**: Use debug mode for complex test failures

The browser visibility is completely configurable, so you can choose the mode that works best for your current needs!
