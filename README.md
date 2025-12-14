# VS Code ZX BASIC Extension

This vs code extension is a complete environment to support development of programs for ZX Spectrum 2+ or ZX Spectrum 48K with ZX Interface 1. The coding takes place in vs code on a linux pc, then program is transfered on real hardware using RS232.

## Features
Legend: `[x]` = Done, `[ ]` = To Do, `[ ] (WIP)` = In Progress.

- [x] Complete ZX Spectrum BASIC support in VS Code with a LSP server
- [x] **Converter** from text file to ZX Spectrum BASIC
- [x] (WIP) **RS232** transfer utility
- [x] **Save as TZX** - Convert BASIC programs to TZX tape format for use with emulators and tape preservation tools
- [x] **Play to ZX Spectrum** - Convert and play BASIC programs directly through audio using tzxplay, no file writing needed
- [x] **Advanced Refactoring** - Extract variables, extract subroutines, and other code transformations
- [x] **Code Formatting** - Automatic line numbering, keyword uppercasing, and code cleanup
- [ ] **Save to mdv** - Convert BASIC programs to MDV format
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
  - Extract Variable: Extract expressions to variables with proper line numbering
  - Extract Subroutine: Move code blocks to subroutines at end of program
  - Add/renumber line numbers, insert missing RETURN/NEXT, suggest DIM, uppercase keywords.
- [x] Code Lens — Inline line-number reference counters powered by Code Lens.
- [x] Diagnostics — Extensive validation produced in `validateTextDocument`:
  - Line number validation (1-9999, must be integers)
  - Duplicate line number detection
  - **Missing line number detection** - Catches lines without line numbers that cause TZX conversion errors
  - FOR/NEXT matching with variable tracking
  - IF/THEN validation
  - Type checking (string vs numeric operations)
  - Color value validation
  - Array dimension validation
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
