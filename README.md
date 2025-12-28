# VS Code ZX BASIC Extension

This VS Code extension is a complete environment to support development of programs for ZX Spectrum 2+ or ZX Spectrum 48K with ZX Interface 1. The coding takes place in VS Code on a Linux PC, then programs are transferred to real hardware.

It is currently in **beta**. Only pure BASIC programs are supported.

## End-to-End Testing

The project includes comprehensive testing at multiple levels:

### VS Code Extension E2E Tests

Real end-to-end tests that launch VS Code with the extension loaded:

- **22 tests** running inside actual VS Code instance
- Uses `@vscode/test-electron` framework
- Tests extension activation, syntax highlighting, formatting, diagnostics, completion, hover, go-to-definition, refactoring (extract variable, extract subroutine, renumber lines), TZX commands, audio playback/recording, navigation (find references, call hierarchy, document symbols), code intelligence (rename functionality, code actions, signature help, code lens), MDR commands
- Captures state snapshots for each test step

```bash
# Run VS Code E2E tests (launches real VS Code)
npm run test:vscode-e2e
```

### Infrastructure Tests

Fast validation tests using Playwright:

- **6 tests** for project infrastructure validation
- Verifies VSIX package, compiled outputs, converter library
- Tests MDR round-trip functionality

```bash
# Run infrastructure tests
npm run test:playwright

# View test report
npm run test:playwright:report
```

### Test Results

```
✅ 22/22 VS Code E2E tests passing
✅ 6/6 Infrastructure tests passing
✅ Real VS Code GUI testing working
✅ State capturing for debugging
✅ Production-ready test suite
```

## Features

Legend: `[x]` = Done, `[ ]` = To Do, `[ ] (WIP)` = In Progress.

- [x] Complete ZX Spectrum BASIC support in VS Code with a LSP server
- [x] **Converter** from text file to ZX Spectrum BASIC
- [x] (WIP) **RS232** transfer utility
- [x] **Save as TZX** - Convert BASIC programs to TZX tape format for use with emulators and tape preservation tools
- [x] **Play to ZX Spectrum** - Convert and play BASIC programs directly through audio using tzxplay, no file writing needed
- [x] **Record from ZX Spectrum** - Convert BASIC programs directly from ZX Spectrum audio using tzxwav and audio recording, no file writing needed
- [x] **Advanced Refactoring** - Extract variables, extract subroutines, and other code transformations
- [x] **Code Formatting** - Automatic line numbering, keyword uppercasing, and code cleanup
- [x] **Save to mdr** - Convert BASIC programs to MDR format
- [x] **Load from mdr** - Load BASIC program from MDR format
- [ ] **Network transfer** - Transfer BASIC programs to ZX Spectrum using ZX Interface 1. (will need a modified https://oqtadrive.org/ version)

## LSP Feature Roadmap

### Core Navigation

- [x] Document Symbols — Outline provider implemented in `lsp-server/src/server.ts`.
- [ ] Workspace Symbols — Not yet implemented.
- [x] Hover — Hover responses wired via `connection.onHover`.
- [x] Go To Definition — GOTO/GOSUB targets resolved through `connection.onDefinition`.
- [x] Go To Declaration — Variable/line declarations resolved via `connection.onDeclaration`.
- [x] Type Definition — Jump to variable declarations and referenced line numbers.
- [x] Implementation — Interface-style lookups jump to variable declarations or GOTO/GOSUB targets via `connection.onImplementation`.
- [x] Find References — Implemented with `connection.onReferences`.
- [ ] Document Highlights — Not yet implemented.
- [ ] Document Links — Not yet implemented.

### Code Intelligence

- [x] Completion — Keyword/variable completion plus snippets handled in `onCompletion`.
- [x] Completion Resolve — Additional detail provided in `onCompletionResolve`.
- [x] Signature Help — Command signatures exposed through `onSignatureHelp`.
- [x] Code Actions — Quick fixes/refactors registered via `onCodeAction`:
  - [x] Extract Variable: Extract expressions to variables with proper line numbering
  - [x] Extract Subroutine: Move code blocks to subroutines at end of program
  - [x] Add/renumber line numbers, insert missing RETURN/NEXT, suggest DIM, uppercase keywords.
- [x] Code Lens — Inline line-number reference counters powered by Code Lens.
- [x] Diagnostics — Extensive validation produced in `validateTextDocument`:
  - [x] Line number validation (1-9999, must be integers)
  - [x] Duplicate line number detection
  - [x] **Missing line number detection** - Catches lines without line numbers that cause TZX conversion errors
  - [x] FOR/NEXT matching with variable tracking
  - [x] IF/THEN validation
  - [x] Type checking (string vs numeric operations)
  - [x] Color value validation
  - [x] Array dimension validation
- [x] Semantic Tokens — Rich highlighting via `onSemanticTokens`.

### Formatting & Refactoring

- [x] Formatting — Whole-document formatting available through `onDocumentFormatting`.
- [ ] Range Formatting — Not yet implemented.
- [ ] On Type Formatting — Not yet implemented.
- [x] Rename — Variable and line-number rename supported in `onRenameRequest` with proper refactoring.
- [x] Prepare Rename — Validation handler ensures rename targets exist before edits.
- [ ] Selection Range — Not yet implemented.

### Advanced Analysis

- [x] Folding Ranges — Provided through `onFoldingRanges`.
- [x] Call Hierarchy — Incoming/outgoing GOSUB calls supported.
- [ ] Inlay Hints — Not yet implemented.
- [ ] Document Color — Not yet implemented.
- [ ] Moniker/Indexing — Not yet implemented.

### Workspace & Infrastructure

- [ ] Execute Command — Not yet implemented.
- [ ] Workspace File Watching — Not yet implemented.
- [ ] Workspace Folders — Not yet implemented.
- [ ] File Operations — Not yet implemented.
- [ ] Progress Reporting — Not yet implemented.

### UI & Communication

- [x] Window & Logging APIs — Initialization and settings changes notify via `connection.window.showInformationMessage`.
- [ ] Experimental/Custom Requests — Not yet implemented.

## Audio Playback Feature

The **Play to ZX Spectrum** feature allows you to play BASIC programs directly through your computer's audio output without creating intermediate files.

### Requirements

Install `tzxplay` from [https://github.com/patrikpersson/tzxtools](https://github.com/patrikpersson/tzxtools):

```bash
pip install tzxtools
```

### Usage

1. Open a `.bas` file in VS Code
2. Run command: **ZX BASIC: Play to ZX Spectrum** (Ctrl+Shift+P)
3. Enter program name and optional autostart line
4. The program will be converted to TZX and played through your audio output
5. Connect your ZX Spectrum's tape input to your computer's audio output
6. On the Spectrum, type `LOAD ""` and press ENTER
7. Click the "Playing to ZX..." status bar item to stop playback at any time

### Configuration

- `zxBasic.tzxplay.path` - Path to tzxplay executable (default: "tzxplay")
- `zxBasic.tzxplay.mode48k` - Enable ZX Spectrum 48K mode (default: false)
- `zxBasic.tzxplay.sine` - Generate soft sine pulses instead of square pulses (default: false)

## Refactoring Features

The extension includes powerful refactoring capabilities to help modernize and organize ZX BASIC code.

### Extract Variable

Extract expressions to variables with proper line numbering and formatting:

**Before:**

```basic
10 PRINT 4*2+10
```

**After (select `4*2+10` and extract variable):**

```basic
10 LET RESULT = 4 * 2 + 10
20 PRINT RESULT
```

### Extract to Subroutine

Move code blocks to subroutines at the end of the program:

**Before:**

```basic
10 REM Main program
20 LET X = 5
30 LET Y = 10
40 PRINT "Calculating result..."
50 LET RESULT = X * Y + 15  ← Select these lines
60 PRINT "Result is:"; RESULT
70 END
```

**After (select lines 50-60 and extract to subroutine):**

```basic
10 REM Main program
20 LET X = 5
30 LET Y = 10
40 PRINT "Calculating result..."
50 GOSUB 1000  ← Original code replaced with GOSUB call
70 END

1000 REM Subroutine SUB1  ← Extracted code moved to end
1010 LET RESULT = X * Y + 15
1020 PRINT "Result is:"; RESULT
1030 RETURN
```

### Usage

1. **Select** the code you want to refactor
2. **Right-click** and choose from the Refactor... submenu
3. **Or** use the command palette (Ctrl+Shift+P) and search for refactoring commands
4. The extension handles all line numbering, spacing, and code organization automatically

### Progress Monitoring

The **ZX Spectrum Playback** output channel shows real-time progress including:

- TZX size and program details
- Block-by-block playback status
- Completion or error messages

Press `Ctrl+Shift+U` or click View > Output and select "ZX Spectrum Playback" to view progress.

### Testing

The extension includes comprehensive E2E tests that verify:

- Extension loading and activation
- File formatting functionality
- Code transformation features
- VS Code integration
- Visual documentation generation

Run tests with `npm run test:e2e` in `tests` to ensure everything works correctly.

**Test Results:**

```
✅ 28/28 tests passing (22 VS Code E2E + 6 Infrastructure)
✅ All tests working with screenshot capturing
✅ Production-ready E2E testing infrastructure
```

## Audio Recording Feature

The **Record from ZX Spectrum** feature allows you to capture BASIC programs directly from your ZX Spectrum's audio output and convert them back to editable source code.

### Requirements

Install `tzxtools` which includes both `tzxplay` and `tzxwav`:

```bash
pip install tzxtools
```

Additionally, you need audio recording tools based on your platform:

- **Linux**: `arecord` (usually included with ALSA utilities)
- **macOS**: `rec` (install via `brew install sox`)
- **Windows**: `ffmpeg` (download from https://ffmpeg.org/)

### Usage

1. Connect your ZX Spectrum's tape output to your computer's audio input
2. On the Spectrum, type `SAVE "PROGRAM"` and press ENTER to start tape output
3. In VS Code, open a ZX BASIC file and run: **ZX BASIC: Record from ZX Spectrum** (Ctrl+Shift+P)
4. The extension will start recording audio and show progress in the status bar
5. When recording is complete (or you stop it manually), the audio will be converted to TZX format
6. The TZX file will be parsed and converted back to BASIC source code
7. A new `.bas` file will be created with the extracted program

### Configuration

- `zxBasic.recordFromZx.tzxwavPath` - Path to tzxwav executable (default: "tzxwav")
- `zxBasic.recordFromZx.recordingDuration` - Recording duration in seconds (0 for manual stop, default: 0)
- `zxBasic.recordFromZx.outputDirectory` - Directory to save recorded programs (default: "${workspaceFolder}/recordings")

### Accessing the Feature

The "Record from ZX Spectrum" command is available in multiple locations:

1. **Command Palette**: Press `Ctrl+Shift+P` and search for "Record from ZX Spectrum"
2. **Editor Context Menu**: Right-click in a ZX BASIC file and select "Record from ZX Spectrum"
3. **Editor Title Menu**: Click the gear icon in the top-right corner of the editor

### Status Monitoring

The **ZX Spectrum Recording** output channel shows real-time progress including:

- Audio recording status and duration
- WAV to TZX conversion progress
- TZX parsing and BASIC extraction status
- Final file creation information

Press `Ctrl+Shift+U` or click View > Output and select "ZX Spectrum Recording" to view progress.

## Testing

The VS-ZX project includes comprehensive testing at two levels:

### VS Code Extension E2E Tests

Real end-to-end tests that launch an actual VS Code instance:

```bash
# Run VS Code E2E tests (launches real VS Code)
npm run test:vscode-e2e
```

**Test Coverage (22 tests):**

- ✅ Extension loading and activation
- ✅ Language recognition for .bas files  
- ✅ Syntax highlighting with semantic tokens
- ✅ Document formatting command
- ✅ Diagnostics for code errors
- ✅ Code completion
- ✅ Hover information
- ✅ Go To Definition for GOTO/GOSUB
- ✅ Sample file loading
- ✅ Extract variable refactoring
- ✅ Renumber lines refactoring
- ✅ TZX save command
- ✅ Audio playback functionality
- ✅ Extract subroutine refactoring
- ✅ Rename variables
- ✅ Find all references
- ✅ Call hierarchy for GOSUB
- ✅ Document symbols for navigation
- ✅ Code actions for quick fixes
- ✅ Signature help for functions
- ✅ Code lens for line references
- ✅ MDR command availability

### Infrastructure Tests

Fast validation tests using Playwright:

```bash
# Run infrastructure tests
npm run test:playwright

# View test report
npm run test:playwright:report
```

**Test Coverage (6 tests):**

- ✅ VSIX package existence
- ✅ Extension package.json validation
- ✅ Compiled outputs verification
- ✅ Sample files availability
- ✅ Converter library functions
- ✅ MDR round-trip functionality

### Test Artifacts

All test results are stored in the `test-results/` and `test-screenshots/` directories:

- State captures for each test step
- HTML reports for easy viewing
- Traces for debugging

### CI Integration

Tests are configured for continuous integration:

- Automatic retries for flaky tests
- Parallel execution for faster runs
- Proper test isolation

See [E2E_TEST_GUIDE.md](E2E_TEST_GUIDE.md) for complete testing documentation and [PLAYWRIGHT_SETUP.md](PLAYWRIGHT_SETUP.md) for setup details.
