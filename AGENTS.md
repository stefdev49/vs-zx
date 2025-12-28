# AGENTS.md

## Build/Lint/Test Commands

- Build: npm run build
- Lint: no linting is needed
- Test: npm run test
- Run a single test: npm run test -- -t "test name"
- E2E Tests: npm run test:playwright
- E2E Tests with UI: npm run test:playwright:ui
- E2E Test Report: npm run test:playwright:report
- VS Code Extension E2E: npm run test:vscode-e2e

## Code Style Guidelines

- Use TypeScript
- Follow existing import patterns
- Use consistent naming conventions (PascalCase for components, camelCase for variables)
- Include JSDoc comments for all functions
- Handle errors gracefully with try/catch blocks
- **Linting is not needed** - never fix linting errors

## Cursor Rules

- Follow existing patterns in the codebase
- Use consistent formatting
- Include appropriate comments

## Copilot Rules

- Follow the project's coding standards
- Maintain consistency with existing code
- Provide clear and concise comments

## E2E Testing Rules

### VS Code Extension E2E Tests (`npm run test:vscode-e2e`)

- Uses `@vscode/test-electron` to launch real VS Code instances
- Tests run inside VS Code using Mocha
- Test files: `tests/e2e/suite/*.test.ts`
- **22 tests** covering extension activation, syntax highlighting, formatting, diagnostics, completion, hover, go-to-definition, refactoring (extract variable, extract subroutine, renumber lines), TZX commands, audio playback/recording, navigation (find references, call hierarchy, document symbols), code intelligence (rename functionality, code actions, signature help, code lens), MDR commands
- Use VS Code API for interactions (no browser simulation)

### Infrastructure Tests (`npm run test:playwright`)

- Uses Playwright for fast validation tests
- Test file: `tests/infrastructure.spec.ts`
- **6 tests** covering VSIX existence, package.json, compiled outputs, converter library, MDR round-trip
- No browser needed - validates build artifacts

### General Rules

- Use TypeScript for test files
- Include proper setup and teardown in tests
- Use descriptive test names and assertions
- State captures saved to `test-screenshots/` directory
- no feature or fix can be considered done if some tests are failing
- all failing tests must be fixed
