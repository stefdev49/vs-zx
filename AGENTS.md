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

## Tokenization and Detokenization Process

### ZX Spectrum BASIC Token Format

ZX Spectrum BASIC uses a tokenized format where keywords are represented by single bytes:

- Tokens 0xA3-0xFF: ZX Spectrum BASIC keywords (REM, SAVE, LOAD, etc.)
- Bytes 0x20-0x7E: Regular ASCII characters
- Byte 0x0D: End of line marker
- Other bytes: Non-printable characters

### Tokenization (BASIC to TAP/TZX)

When saving BASIC programs to tape formats:

1. Keywords are converted to their corresponding token bytes using `TOKEN_MAP`
2. Regular text remains as ASCII
3. Line structure is preserved with line numbers and lengths
4. Checksums are calculated for data integrity

### Detokenization (TAP/TZX to BASIC)

When loading BASIC programs from tape formats:

1. Parse TAP/TZX blocks to extract program data
2. Use `TOKEN_MAP` to convert token bytes back to keywords
3. Preserve ASCII characters as-is
4. Handle end-of-line markers properly
5. Reconstruct the original BASIC source code structure

### Record from ZX Feature

The `recordFromZx` command follows this process:

1. Records audio from ZX Spectrum tape output
2. Converts WAV to TZX using external tools
3. Extracts TAP data from TZX
4. Uses `convertTapToBasicSource()` with proper token handling, number decoding, and spacing
5. Saves as readable BASIC source code

**Key Fixes Implemented (2026-01-05):**

- ✅ **Line Number Decoding**: Fixed ZX Spectrum line number format (divide by 256)
- ✅ **Token Conversion**: Integrated TOKEN_MAP for proper keyword conversion
- ✅ **Number Decoding**: Implemented ZX Spectrum 5-byte float format decoding
- ✅ **Intelligent Spacing**: Added context-aware spacing after tokens and before numbers
- ✅ **Multi-word Commands**: Proper handling of "PRINT AT", "GO TO", etc.
- ✅ **Clean Line Endings**: Removed extra blank lines in output

### Key Components

- `TOKEN_MAP` in `converter/src/core/token-map.ts`: Maps token bytes to keywords
- `convertTapToBasicSource()` in `recordFromZx.ts`: Converts tokenized TAP data to BASIC source with:
  - Line number decoding (divide by 256)
  - Token-to-keyword conversion using TOKEN_MAP
  - ZX Spectrum number decoding (5-byte float format)
  - Intelligent spacing logic
  - Proper TAP block parsing
- `convertBasicSource()` in `converter.ts`: Converts BASIC source to tokenized format
