# AGENTS.md

## Build/Lint/Test Commands

- Build: npm run build
- Lint: npm run lint
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

## Cursor Rules

- Follow existing patterns in the codebase
- Use consistent formatting
- Include appropriate comments

## Copilot Rules

- Follow the project's coding standards
- Maintain consistency with existing code
- Provide clear and concise comments

## E2E Testing Rules

- Use Playwright for end-to-end testing
- Follow existing test patterns in tests/ directory
- Use TypeScript for test files (.spec.ts)
- Include proper setup and teardown in tests
- Use descriptive test names and assertions
- **15 tests** covering all major functionality
- See [BROWSER_VISIBILITY_GUIDE.md](BROWSER_VISIBILITY_GUIDE.md) for browser visibility options
