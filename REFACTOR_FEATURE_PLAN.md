# ZX BASIC VS Code Extension - Refactoring Feature Implementation

## Overview

This document outlines the implementation of refactoring features for the ZX BASIC VS Code extension. The implementation provides core refactoring capabilities specifically designed for ZX BASIC's unique syntax and constraints.

## Implementation Status

### ✅ Completed Features

#### 1. Extract Variable Refactoring

**Command**: `zx-basic.extractVariable`
**Location**: `vscode-extension/src/commands/refactor/extractVariable.ts`

**Features**:

- Extracts selected expressions into variables
- Automatic type inference (string, numeric, integer)
- Unique variable name generation
- Proper LET statement insertion
- Context-aware (only available when text is selected)

**Usage**:

1. Select an expression in ZX BASIC code
2. Right-click → "Extract Variable"
3. Expression is replaced with variable, LET statement added

**Example**:

```basic
PRINT 10 + 20 * 30
```

→

```basic
LET RESULT = 10 + 20 * 30
PRINT RESULT
```

#### 2. Line Renumbering Refactoring

**Command**: `zx-basic.renumberLines`
**Location**: `vscode-extension/src/commands/refactor/renumberLines.ts`

**Features**:

- Multiple increment options (10, 20, 50, 100, custom)
- Automatic GOTO/GOSUB target updates
- Preserves program logic and structure
- Input validation for custom increments

**Usage**:

1. Open a ZX BASIC file
2. Right-click → "Renumber Lines"
3. Select increment strategy
4. All line numbers and references are updated

**Example**:

```basic
10 PRINT "A"
15 PRINT "B"
20 GOTO 10
```

→

```basic
10 PRINT "A"
20 PRINT "B"
30 GOTO 10
```

### 📁 Files Created

#### Core Implementation

- `vscode-extension/src/commands/refactor/refactorUtils.ts` - Shared utilities and helper functions
- `vscode-extension/src/commands/refactor/extractVariable.ts` - Extract Variable command implementation
- `vscode-extension/src/commands/refactor/renumberLines.ts` - Line Renumbering command implementation

#### Configuration

- `vscode-extension/.eslintrc.js` - ESLint configuration for code quality

#### Test Files

- `test_refactoring.bas` - Sample ZX BASIC file for testing refactoring features

### 📝 Files Modified

#### Extension Core

- `vscode-extension/src/extension.ts` - Registered new refactoring commands

#### Package Configuration

- `vscode-extension/package.json` - Added commands and context menu entries:
  ```json
  {
    "command": "zx-basic.extractVariable",
    "title": "Extract Variable",
    "category": "ZX BASIC Refactoring"
  },
  {
    "command": "zx-basic.renumberLines",
    "title": "Renumber Lines",
    "category": "ZX BASIC Refactoring"
  }
  ```

## Architecture

### Command Structure

```
vscode-extension/
├── src/
│   ├── commands/
│   │   └── refactor/
│   │       ├── refactorUtils.ts      # Shared utilities
│   │       ├── extractVariable.ts    # Extract Variable command
│   │       └── renumberLines.ts      # Line Renumbering command
│   └── extension.ts                # Command registration
└── package.json                    # Command definitions
```

### Key Components

#### refactorUtils.ts

- `getCurrentDocument()` - Get active ZX BASIC document
- `getSelectionRange()` - Get selected text range
- `getWordAtPosition()` - Extract word at cursor position
- `generateUniqueVariableName()` - Generate unique variable names
- `inferVariableType()` - Infer variable type from expression
- `isValidExpression()` - Validate expressions for extraction
- `findNextAvailableLineNumber()` - Find available line numbers

#### extractVariable.ts

- `extractVariable()` - Main command function
- `getLineNumberAtPosition()` - Extract line number at position
- `registerExtractVariableCommand()` - Command registration

#### renumberLines.ts

- `renumberLines()` - Main command function
- `performRenumbering()` - Core renumbering logic
- `registerRenumberLinesCommand()` - Command registration

## Technical Implementation Details

### Type Inference

The Extract Variable feature includes sophisticated type inference:

```typescript
export function inferVariableType(expression: string): {
  type: "string" | "numeric" | "integer";
  suffix: string;
} {
  // Analyzes expression for string operations, numeric operations, etc.
  // Returns appropriate type and ZX BASIC suffix ($, %, or empty)
}
```

### Line Number Management

The Line Renumbering feature handles complex line number updates:

```typescript
// Parse all line numbers and their positions
const lineNumbers: {
  original: string;
  lineIndex: number;
  charIndex: number;
}[] = [];

// Generate new line numbers with specified increment
let currentLineNumber = increment;
const lineNumberMap = new Map<string, string>();

// Update GOTO and GOSUB statements
const gotoPattern = /\b(GOTO|GO\s+TO|GOSUB|GO\s+SUB)\s+(\d+)/gi;
```

### Error Handling

Both features include comprehensive error handling:

```typescript
// Extract Variable error handling
if (!document) {
  window.showErrorMessage("No active ZX BASIC document found");
  return;
}

if (!isValidExpression(selectedText)) {
  window.showErrorMessage(
    "Selected text is not a valid expression for variable extraction",
  );
  return;
}

// Line Renumbering error handling
if (lineNumbers.length === 0) {
  window.showInformationMessage("No line numbers found to renumber");
  return;
}
```

## Context Menu Integration

### Command Availability

- **Extract Variable**: Available when text is selected in ZX BASIC files
- **Line Renumbering**: Available in all ZX BASIC files

### Menu Structure

```json
"editor/context": [
  {
    "command": "zx-basic.extractVariable",
    "when": "editorLangId == zx-basic && editorHasSelection",
    "group": "2_refactoring"
  },
  {
    "command": "zx-basic.renumberLines",
    "when": "editorLangId == zx-basic",
    "group": "2_refactoring"
  }
]
```

## Future Enhancements

### Planned Refactoring Features

1. **Extract Subroutine** - Convert code blocks into GOSUB subroutines
2. **Convert Variable Type** - Change between string/numeric/integer types
3. **Move Code Block** - Move lines to different positions
4. **Wrap in FOR/NEXT** - Wrap selected code in loops
5. **Unroll Loop** - Convert simple loops to sequential code

### ZX BASIC Specific Refactorings

1. **Convert GOTO to GOSUB** - Transform jumps into subroutine calls
2. **Add Error Handling** - Insert error checking around risky operations
3. **Optimize Memory Usage** - Suggest memory-efficient patterns
4. **Convert to Structured Code** - Replace line numbers with structured control flow

### Technical Improvements

1. **Keyboard Shortcuts** - Add configurable keybindings
2. **Undo/Redo Support** - Enhance undo functionality
3. **Batch Refactoring** - Multiple refactorings in one operation
4. **Preview Mode** - Show changes before applying
5. **Configuration Options** - Customizable refactoring behavior

## Testing and Quality Assurance

### Build Process

```bash
npm run build    # TypeScript compilation
npm run lint     # ESLint code quality checks
```

### Test File

Created `test_refactoring.bas` for manual testing:

```basic
10 REM Test file for refactoring features
20 LET result = 10 + 20 * 30
30 PRINT result
40 GOTO 20
50 REM This is a test for line renumbering
60 PRINT "Hello World"
70 GOSUB 100
80 END
100 PRINT "Subroutine"
110 RETURN
```

### Error Handling Tests

- No active document
- Wrong file type
- Invalid selections
- Edge cases (empty lines, comments, etc.)

## Usage Examples

### Extract Variable Workflow

1. **Before**:

   ```basic
   10 PRINT 100 + (200 * 300) / 10
   ```

2. **Select** `100 + (200 * 300) / 10`
3. **Right-click** → "Extract Variable"
4. **After**:
   ```basic
   10 LET CALCULATION = 100 + (200 * 300) / 10
   20 PRINT CALCULATION
   ```

### Line Renumbering Workflow

1. **Before**:

   ```basic
   5 PRINT "Start"
   10 PRINT "Middle"
   15 GOTO 5
   20 END
   ```

2. **Right-click** → "Renumber Lines"
3. **Select** "Increment by 10"
4. **After**:
   ```basic
   10 PRINT "Start"
   20 PRINT "Middle"
   30 GOTO 10
   40 END
   ```

## Conclusion

This implementation provides a solid foundation for ZX BASIC refactoring in VS Code. The core features are production-ready and follow modern VS Code extension development best practices. The architecture is designed for easy extension to support additional refactoring operations in the future.

The refactoring features are specifically tailored to ZX BASIC's unique characteristics:

- Line number-based structure
- Limited variable naming conventions
- GOTO/GOSUB control flow
- Type inference based on variable suffixes

This implementation successfully bridges the gap between modern IDE refactoring capabilities and the classic ZX BASIC programming environment.
