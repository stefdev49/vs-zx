# ZX BASIC for VS Code

A complete development environment for ZX Spectrum BASIC programming. Write, format, validate, and transfer programs to real hardware or emulators.

![ZX Spectrum](https://img.shields.io/badge/ZX_Spectrum-48K%20%7C%202%2B-red)
![Status](https://img.shields.io/badge/status-beta-yellow)

## Features

### 🎨 Syntax Highlighting & Formatting
- Full syntax highlighting for ZX BASIC keywords, variables, and strings
- Automatic code formatting with keyword uppercasing
- Smart line number management and renumbering

### ✅ Real-time Diagnostics
- Line number validation (1-9999)
- Duplicate line detection
- Missing line number warnings
- FOR/NEXT and IF/THEN matching
- Type checking (string vs numeric)
- Color value validation
- Array dimension checks

### 💡 Code Intelligence
- **Auto-completion** for keywords, variables, and snippets
- **Hover information** for commands and syntax help
- **Go to Definition** for GOTO/GOSUB targets
- **Find References** for variables and line numbers
- **Signature Help** for function parameters
- **Document Symbols** for easy navigation
- **Call Hierarchy** for GOSUB subroutines
- **Rename** variables and line numbers across your program

### 🔧 Refactoring Tools
- **Extract Variable** - Select an expression to create a named variable
- **Extract Subroutine** - Move code blocks to GOSUB subroutines
- **Renumber Lines** - Automatically fix line numbering

### 📼 TZX Tape Format
- **Save as TZX** - Convert programs to tape format for emulators
- **Play to ZX Spectrum** - Stream audio directly to real hardware

### 💾 Microdrive Support
- **Save to MDR** - Create Microdrive cartridge files
- **Load from MDR** - Import programs from MDR format

### 🎵 Audio Transfer
- **Play to ZX Spectrum** - Convert and play programs through audio output
- **Record from ZX Spectrum** - Capture and convert programs from audio input

## Getting Started

1. Create or open a `.bas` file
2. Start writing ZX BASIC code with line numbers:

```basic
10 REM Hello World
20 PRINT "Hello, ZX Spectrum!"
30 PAUSE 0
```

3. Use `Ctrl+Shift+P` to access commands like:
   - **ZX BASIC: Save as TZX**
   - **ZX BASIC: Play to ZX Spectrum**
   - **ZX BASIC: Save to MDR**

## Audio Playback

Play BASIC programs directly to your ZX Spectrum:

### Requirements

Install [tzxtools](https://github.com/patrikpersson/tzxtools):

```bash
pip install tzxtools
```

### Usage

1. Open a `.bas` file
2. Run **ZX BASIC: Play to ZX Spectrum** (`Ctrl+Shift+P`)
3. Enter program name and optional autostart line
4. Connect ZX Spectrum tape input to your audio output
5. On the Spectrum, type `LOAD ""` and press ENTER

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `zxBasic.tzxplay.path` | Path to tzxplay | `"tzxplay"` |
| `zxBasic.tzxplay.mode48k` | ZX Spectrum 48K mode | `false` |
| `zxBasic.tzxplay.sine` | Soft sine pulses | `false` |

## Audio Recording

Capture programs from your ZX Spectrum:

### Requirements

- [tzxtools](https://github.com/patrikpersson/tzxtools): `pip install tzxtools`
- Audio recording tool:
  - **Linux**: `arecord` (ALSA)
  - **macOS**: `rec` (`brew install sox`)
  - **Windows**: `ffmpeg`

### Usage

1. Connect ZX Spectrum tape output to your audio input
2. On the Spectrum, type `SAVE "PROGRAM"` and press ENTER
3. Run **ZX BASIC: Record from ZX Spectrum**
4. The program will be captured and converted to `.bas`

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `zxBasic.recordFromZx.tzxwavPath` | Path to tzxwav | `"tzxwav"` |
| `zxBasic.recordFromZx.recordingDuration` | Duration in seconds (0 = manual) | `0` |
| `zxBasic.recordFromZx.outputDirectory` | Output folder | `"${workspaceFolder}/recordings"` |

## Refactoring

### Extract Variable

Select an expression and extract it to a variable:

**Before:**
```basic
10 PRINT 4*2+10
```

**After:**
```basic
10 LET RESULT = 4 * 2 + 10
20 PRINT RESULT
```

### Extract Subroutine

Move selected code to a GOSUB subroutine:

**Before:**
```basic
10 LET X = 5
20 LET Y = 10
30 LET RESULT = X * Y
40 PRINT RESULT
50 END
```

**After (select lines 30-40):**
```basic
10 LET X = 5
20 LET Y = 10
30 GOSUB 1000
50 END
1000 REM Subroutine
1010 LET RESULT = X * Y
1020 PRINT RESULT
1030 RETURN
```

## Keyboard Shortcuts

| Command | Description |
|---------|-------------|
| `Ctrl+Shift+P` | Command palette - search for ZX BASIC commands |
| `F12` | Go to Definition |
| `Shift+F12` | Find All References |
| `F2` | Rename symbol |
| `Ctrl+Space` | Trigger completion |
| `Ctrl+Shift+O` | Document symbols |

## Requirements

- VS Code 1.75.0 or higher
- For audio features: [tzxtools](https://github.com/patrikpersson/tzxtools)

## Known Limitations

- Only pure BASIC programs are supported (no machine code)
- Network transfer via ZX Interface 1 is planned but not yet available

## Bug Reports

Found a bug? Please [open an issue](https://github.com/stefdev49/vs-zx/issues) with:

1. **A minimal BASIC program** that reproduces the issue
2. **Steps to reproduce** the problem
3. **Expected vs actual behavior**

Example bug report:

```basic
10 LET A$ = "test"
20 PRINT A$
```

> When I run "Format Document", the string variable loses its `$` suffix.

## License

MIT License
