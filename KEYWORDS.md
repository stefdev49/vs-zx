# ZX Spectrum BASIC Keywords - Official Reference

## Version 1.0.102 - Keyword Consistency Update

This document lists the official ZX Spectrum BASIC keywords as defined in the ROM specification.

## Two-Word Keywords

ZX Spectrum BASIC includes four official two-word keywords that must be written with a space:

1. **GO TO** (also accepted as GOTO)
2. **GO SUB** (also accepted as GOSUB)
3. **DEF FN** (function definition)
4. **INPUT LINE** (string input with special handling)

### INPUT LINE Usage

`INPUT LINE` is specifically for inputting strings and has special behavior:
- Only works with string variables (ending in $)
- Does not echo quotes around the input
- The string appears exactly as typed between the quotes

Example:
```basic
10 INPUT LINE name$
20 PRINT name$
```

## Control Flow Keywords

- IF, THEN (Note: ELSE does NOT exist in ZX Spectrum BASIC)
- FOR, TO, STEP, NEXT
- GO TO, GOTO
- GO SUB, GOSUB
- RETURN
- STOP (Note: END does NOT exist in ZX Spectrum BASIC)
- CONTINUE
- RUN

## Variable & Data Keywords

- LET
- DIM
- READ, DATA, RESTORE

## I/O Keywords

- PRINT
- INPUT
- INPUT LINE (two-word keyword)
- LOAD, SAVE, VERIFY, MERGE
- LIST
- NEW
- CLEAR

## Graphics Keywords

- PLOT
- DRAW
- CIRCLE
- CLS

## Display Attributes

- INK
- PAPER
- FLASH
- BRIGHT
- INVERSE
- OVER
- BORDER
- AT

## Sound

- BEEP

## Memory & Hardware

- POKE
- OUT
- RANDOMIZE

## ZX Spectrum 128K Keywords

- SPECTRUM
- PLAY
- LLIST
- LPRINT
- COPY
- CAT
- ERASE
- FORMAT
- MOVE

## Interface 1 Keywords

- OPEN (channel operations)
- CLOSE (channel operations)
- NET, NET*
- CAT*, LOAD*, SAVE*, MERGE*, VERIFY*, FORMAT*

## Functions

Functions are called with their names followed by arguments in parentheses (except for some like PI).

### Mathematical Functions
- ABS (absolute value)
- SGN (sign)
- INT (integer part)
- SQR (square root)
- EXP (exponential)
- LN (natural logarithm)
- SIN, COS, TAN (trigonometric)
- ASN, ACS, ATN (inverse trigonometric)

### String Functions
- CHR$ (character from code)
- STR$ (string from number)
- CODE (code from character)
- VAL (number from string)
- VAL$ (validates string as number)
- LEN (string length)

### Other Functions
- PEEK (read memory)
- IN (read port)
- USR (call machine code)
- RND (random number)
- INKEY$ (read keyboard)
- POINT (read pixel color)
- SCREEN$ (read character at position)
- ATTR (read attribute at position)
- TAB (tab position for PRINT)
- FN (call user-defined function)
- PI (π constant)

## Operators

These are operators, not keywords, and have dedicated token types:

- **AND** - logical AND
- **OR** - logical OR  
- **NOT** - logical NOT (also used as unary operator)

Arithmetic operators: `+`, `-`, `*`, `/`, `^` (power)
Comparison operators: `=`, `<>`, `<`, `>`, `<=`, `>=`

## Keywords NOT in ZX Spectrum BASIC

The following keywords exist in other BASIC dialects but are **NOT** part of ZX Spectrum BASIC:

- ❌ **ELSE** - Use line numbers with IF/THEN instead
- ❌ **END** - Use STOP
- ❌ **DEF** (standalone) - Only DEF FN exists (two words)
- ❌ **TRUE/FALSE** - ZX Spectrum uses 1 and 0 for boolean values
- ❌ **LINE** (standalone) - Only exists as part of INPUT LINE
- ❌ **COLOR** - Use INK, PAPER, BORDER, BRIGHT, FLASH
- ❌ **STROKE** - Not a ZX Spectrum keyword

## Migration Notes

If you have code using non-standard keywords:

### Instead of ELSE
```basic
' Wrong (not supported):
10 IF x > 5 THEN PRINT "Yes" ELSE PRINT "No"

' Correct:
10 IF x > 5 THEN GOTO 30
20 PRINT "No": GOTO 40
30 PRINT "Yes"
40 REM continue
```

### Instead of END
```basic
' Wrong (not supported):
10 END

' Correct:
10 STOP
```

### Instead of TRUE/FALSE
```basic
' Wrong (not supported):
10 LET flag = TRUE

' Correct:
10 LET flag = 1

' Or:
10 LET flag = (x > 5)  ' Returns 1 if true, 0 if false
```

## Testing

To test keyword highlighting:

1. Open a .bas file in VS Code
2. Verify two-word keywords (GO TO, GO SUB, DEF FN, INPUT LINE) are highlighted
3. Verify AND, OR, NOT work as operators
4. Verify ELSE, END, standalone DEF, TRUE, FALSE are NOT highlighted as keywords

## References

- ZX Spectrum BASIC ROM Disassembly
- Sinclair ZX Spectrum Manual
- Interface 1 Manual

## Version History

- **1.0.102** (2025-12-13): Fixed keyword consistency
  - Removed invalid keywords: ELSE, END, DEF (standalone), TRUE, FALSE
  - Added INPUT LINE two-word keyword support
  - Fixed AND, OR, NOT to be operators with dedicated TokenTypes
  - Cleaned up function classifications (ATTR, POINT, SCREEN$, PEEK, USR)
  - Added Interface 1 keywords: OPEN, CLOSE, NET*
  - Fixed duplicate CLS entry
  - All 336 tests passing

- **1.0.100** (2025-12-13): Code duplication fixes
  - Eliminated duplicate implementations in server.ts

- **1.0.98** (2025-12-13): Missing line number diagnostic
  - Added validation for lines without line numbers before TZX conversion
  - Fixed renumbering chain replacement bug
