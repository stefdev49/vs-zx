# ZX BASIC Extension Fixes - Version 1.0.93

## Fix 1: Missing Line Number Diagnostic

### Missing Line Number Diagnostic Fix

## Problem
When attempting to save a BASIC program to TZX format, the conversion would fail with an error:
```
Failed to save TZX: ERROR - Missing line number in ASCII line 23
```

This occurred because the BASIC file had lines without line numbers. ZX BASIC requires every non-empty line to start with a line number (1-9999).

## Example of the Issue
```basic
200 LET d=IN 239: FOR i=7 TO 4 STEP -1: IF d>=2^i
THEN LET d=d-2^i
220 NEXT i: LET d=(d>7): RETURN
```

In this example, the second line `THEN LET d=d-2^i` does not have a line number, which causes the TZX converter to fail.

## Solution
The LSP server now validates that every non-empty line starts with a line number. When a line without a line number is detected, the extension will show an error diagnostic:

**Error Message:** `Line must start with a line number (1-9999). ZX BASIC does not support multi-line statements.`

## How to Fix Your Code
The line should be properly formatted as a single-line statement:

```basic
200 LET d=IN 239: FOR i=7 TO 4 STEP -1: IF d>=2^i THEN LET d=d-2^i
220 NEXT i: LET d=(d>7): RETURN
```

Or split into multiple numbered lines:

```basic
200 LET d=IN 239: FOR i=7 TO 4 STEP -1: IF d>=2^i THEN LET d=d-2^i
210 NEXT i: LET d=(d>7): RETURN
```

## Technical Details

### Changes Made
1. **lsp-server/src/server.ts** - Added validation in `validateTextDocument()` function:
   - Checks each line to ensure it starts with a line number (regex: `^\d+`)
   - Skips empty lines
   - Reports diagnostic error for lines without line numbers

2. **Tests** - Created `lsp-server/src/missing-line-number.spec.ts`:
   - Tests detection of lines without line numbers
   - Tests that empty lines are allowed
   - Tests the specific multi-line statement issue from zxif1test.bas
   - Tests valid programs with all line numbers

3. **Documentation** - Updated:
   - `lsp-server/IMPROVEMENT_PLAN.md` - Added to diagnostic checklist
   - `README.md` - Added to list of diagnostic features

### Diagnostic Implementation
```typescript
// Check for lines without line numbers (must start with line number or be empty/comment)
const lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Skip empty lines
  if (!trimmed) {
    continue;
  }
  
  // Check if line starts with a digit (line number)
  if (!/^\d+/.test(trimmed)) {
    // This is an error - non-empty line without line number
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: i, character: 0 },
        end: { line: i, character: Math.min(trimmed.length, 80) }
      },
      message: `Line must start with a line number (1-9999). ZX BASIC does not support multi-line statements.`,
      source: 'zx-basic-lsp'
    });
  }
}
```

## Testing
Run the test suite:
```bash
cd lsp-server
npm test -- missing-line-number.spec.ts
```

All tests pass:
- ✓ should detect lines without line numbers
- ✓ should allow empty lines
- ✓ should detect multi-line statement split incorrectly
- ✓ should accept valid program with all line numbers

## Files Modified
- `lsp-server/src/server.ts` - Added diagnostic validation
- `lsp-server/src/missing-line-number.spec.ts` - New test file
- `lsp-server/IMPROVEMENT_PLAN.md` - Updated documentation
- `README.md` - Updated feature list
- `samples/test-missing-linenum.bas` - Created test sample file

## Fix 2: Renumbering Bug - Chain Replacement Issue

### Problem
When using "Format Document" to renumber lines, the GOTO/GOSUB target line numbers were incorrectly updated due to a chain replacement bug. The renumbering algorithm was iterating through all line number mappings and applying them sequentially, causing already-replaced line numbers to be replaced again.

### Example of the Bug
Original code:
```basic
20 IF IN 247<128 THEN GO TO 99
99 PRINT "FAIL ": STOP
160 PRINT "PASS ": STOP
```

With mappings: `99=>120`, `120=>140`, `140=>160`, `160=>180`

Buggy behavior:
1. `GO TO 99` becomes `GOTO 120` ✓
2. `GOTO 120` matches the `120=>140` mapping, becomes `GOTO 140` ❌
3. `GOTO 140` matches the `140=>160` mapping, becomes `GOTO 160` ❌  
4. `GOTO 160` matches the `160=>180` mapping, becomes `GOTO 180` ❌

Result: `GO TO 99` incorrectly becomes `GOTO 180` instead of `GOTO 120`

### Root Cause
The renumbering loop was processing line number replacements iteratively:
```typescript
// BUGGY CODE:
for (const [oldNum, newNum] of lineNumberMap.entries()) {
  const pattern = new RegExp(`\\b(GOTO|...)\\s+${oldNum}\\b`, 'gi');
  newLine = newLine.replace(pattern, ...);
  // This modifies newLine, then the next iteration matches the NEW numbers!
}
```

### Solution
Changed to replace all GOTO/GOSUB line number references in a single pass:
```typescript
// FIXED CODE:
newLine = newLine.replace(/\b(GOTO|GO\s+TO|GOSUB|GO\s+SUB)\s+(\d+)\b/gi, 
  (match, keyword, lineNumber) => {
    const mappedNumber = lineNumberMap.get(lineNumber);
    return mappedNumber ? `${keyword} ${mappedNumber}` : match;
  });
```

This processes ALL line number references in the original line at once, looking them up in the map. No line number gets replaced more than once.

### Test Case
Added comprehensive test in `lsp-server/src/__tests__/formatting-utils.spec.ts` to verify correct renumbering behavior with complex GOTO/GOSUB patterns.

## Version
Extension version: 1.0.93
