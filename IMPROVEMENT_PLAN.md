# ZX BASIC LSP Server - Improvement Plan

## Completed Features

### Phase 1.1: Enhanced Lexer ✅ COMPLETE
- Line number recognition (1-9999)
- REM comments (consume rest of line)
- Colon statement separator
- GO TO / GO SUB normalization (two-word keyword handling)
- DEF FN support
- String and number literal support

### Phase 1.2: Keyword Database ✅ COMPLETE
- Imported 80+ keywords from syntax-definitions
- Basic keywords (REM, LET, PRINT, INPUT, FOR, NEXT, GOTO, GOSUB, IF, THEN, etc.)
- ZX 128K extensions (SPECTRUM, PLAY, etc.)
- Interface 1 extensions
- Functions (SIN, COS, INT, RND, etc.)

### Phase 1.4: Comprehensive Diagnostics ✅ COMPLETE
1. **Line Number Validation** - Validates 1-9999 range, integer values only
2. **Duplicate Line Numbers** - Detects duplicate line numbers in program
3. **FOR/NEXT Balance** - Checks FOR loops have matching NEXT (loose checking)
4. **GOSUB/RETURN Balance** - Checks GOSUB calls have matching RETURN (loose checking)
5. **IF/THEN Requirement** - Validates IF statements have THEN clause
6. **Color Validation** - INK/PAPER/BORDER color values (0-7 for BORDER, 0-9 for INK/PAPER, with special values 8=no-change, 9=contrast)
7. **Array Dimension Validation** - Enforces max 3D arrays, validates DIM declarations
8. **Type Checking** - Tracks variable types from LET/INPUT/FOR, warns on type mismatches

### Phase 2.1: Context-Aware Completion ✅ COMPLETE
- Line number completion (context-aware after GOTO/GOSUB/RUN/LIST)
- Variable completion (extracts identifiers from document)
- Array completion (shows array variables with dimensions)
- Keyword/function completion (80+ ZX BASIC keywords)
- Snippet completion (8 reusable code patterns: FOR, IF, GOSUB, REPEAT, DATA, DIM, INPUT, PRINT)

### Phase 2.2: Enhanced Hover ✅ COMPLETE
- Line number hover (shows line content)
- Variable hover (shows inferred type: numeric/string)
- Array hover (shows array name and dimensions)
- Function hover (shows signature for known functions)

### Phase 2.3: Command Signature Help ✅ COMPLETE
- 15+ commands documented: PRINT, INPUT, FOR, DIM, IF, PLOT, BEEP, GOSUB, GOTO, etc.
- Parameter documentation and examples
- Context-aware parameter hints

### Phase 3.1: Document Symbols ✅ COMPLETE
- Lists all line numbers and labels in document
- Supports navigation to symbol

### Phase 3.2: Definition Navigation ✅ COMPLETE
- Go to definition for line numbers (GOTO/GOSUB targets)
- Find all references to a line number

### Phase 3.3: Code Actions ✅ COMPLETE
- Add missing RETURN for GOSUB blocks
- Add missing NEXT for FOR loops
- Auto-add line numbers to statements
- Renumber program by 10s

### Phase 3.4: Document Formatting ✅ COMPLETE
- Uppercase keywords
- Normalize statement separators
- Format array subscripts

### Phase 1.3: Statement Parser ✅ COMPLETE
- ParseStatement() method for full statement parsing
- Individual parsers:
  - **parseLet()** - LET variable = expression
  - **parsePrint()** - PRINT [expressions] [; expressions]...
  - **parseInput()** - INPUT [prompt;] variables
  - **parseIf()** - IF condition THEN statement
  - **parseFor()** - FOR variable = start TO end [STEP step]
  - **parseDim()** - DIM array(dimensions)[, array...]
  - **parseGoto()** - GOTO line_number
  - **parseGosub()** - GOSUB line_number
  - **parseRead()** - READ variables
  - **parseData()** - DATA values
- Extended ASTNode interface with statement types
- Added setTokens() method for testing

## Test Coverage
- **Total Tests**: 41 passing consistently
- **Test Files**: 15+ covering all major features
- **Demo Files**: 8+ sample BASIC programs
- **Coverage Status**: All features have automated tests and demo files

## Pending Features

### Phase 2.1 Remaining: Context-Aware Function Filtering
- Filter function completions based on context (only numeric functions for numeric context)
- Model-specific filtering (48K/128K/Interface1)

### Phase 4: Configuration
- User settings for ZX Spectrum model (48K, 128K, Interface 1)
- Configurable keywords based on selected model
- Custom formatting options

### Phase 5: Semantic Tokens
- Add semantic token provider for advanced syntax highlighting
- Token types: keyword, variable, function, string, number, comment, etc.

## Known Domain Constraints
- GOTO to non-existent line is a valid ZX BASIC feature (not an error)
- GOSUB/RETURN balance is loose (return to any line number)
- FOR/NEXT balance is loose (can nest but not required to match perfectly)
- Array dimensions: maximum 3 dimensions in ZX BASIC
- Color values: 0-7 valid for most commands, INK/PAPER allow 8 (no change) and 9 (contrast)

## Build & Test Status
- **TypeScript Compilation**: ✅ Clean
- **All Tests**: ✅ 41/41 Passing
- **Jest Coverage**: Working with detailed reports
- **Demo Files**: ✅ All samples execute and validate correctly
