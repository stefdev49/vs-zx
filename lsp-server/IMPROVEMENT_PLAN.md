# LSP Server Improvement Plan
## ZX Spectrum BASIC Compliance & VS Code Integration

**Created:** 22 November 2025  
**Status:** Planning Phase  
**Goal:** Make LSP server fully ZX Spectrum BASIC compliant and VS Code best-practice compliant

---

## Current State Analysis

### ✅ Working Features
- **Lexer:** Tokenizes basic ZX BASIC syntax (keywords, operators, numbers, strings, identifiers)
- **Parser:** Parses expressions with correct operator precedence
- **Completion:** Basic keyword and function completion with prefix filtering
- **Hover:** Documentation for keywords/functions on hover
- **Signature Help:** Parameter hints for functions
- **Diagnostics:** Basic syntax error detection
- **Testing:** 38 tests passing with 88.85% code coverage

### ❌ Missing ZX Spectrum BASIC Features

#### 1. **Incomplete Keyword Coverage**
- Missing keywords: `PRINT AT`, `GO SUB`, `GO TO`, `DEF FN`, `LLIST`, `LPRINT`
- Missing ZX 128K keywords: `SPECTRUM`, `PLAY` (partially)
- Missing Interface 1 keywords: `CAT*`, `LOAD*`, `SAVE*`, `MERGE*`, `VERIFY*`, `FORMAT*`
- Missing control flow: `CONTINUE`, `ELSE` (in multi-line IF)
- Missing graphics: `LINE` command

#### 2. **Incomplete Function/Command Support**
Functions in `syntax-definitions/keywords.ts` not in LSP:
- Trigonometric: `ACS`, `ASN` (arc cosine/sine)
- Math: `SGN` (sign), `PI` (constant)
- String: `VAL$`
- I/O: `IN`, `OUT`, `TAB`, `AT`
- Special: `FN` (user-defined functions)

#### 3. **ZX BASIC Syntax Not Handled**
- **Line numbers:** Not tokenized or validated
- **Multi-statement lines:** Colon (`:`) separator not handled
- **String variables:** `$` suffix recognition incomplete
- **Numeric variables:** `%` suffix for integers not validated
- **Array subscripts:** No validation of DIM arrays
- **Slicing:** String slicing `a$(n TO m)` not parsed
- **TAB/AT positioning:** `PRINT AT line, col; expr` not recognized
- **Color codes:** Embedded codes in PRINT not handled
- **REM comments:** Not properly lexed (should consume entire line)
- **Multi-line IF THEN:** ZX doesn't support multi-line IF blocks
- **GO TO vs GOTO:** Both forms valid, need normalization

#### 4. **Parser Limitations**
- Only parses expressions, not full statements
- No AST for: LET assignments, IF conditions, FOR loops, PRINT statements
- No validation of statement structure (e.g., `FOR` must have matching `NEXT`)
- No scope tracking for variables
- No type checking (string vs numeric variables)

#### 5. **Diagnostic Limitations**
- Generic error messages
- No line number validation (must be 1-9999)
- No duplicate line number detection
- No unreachable code detection (after STOP, RETURN, GOTO)
- No array bounds checking
- No undefined variable warnings

### ❌ Missing VS Code Best Practices

#### 1. **Language Features Not Implemented**
- **Document Symbols:** No outline view for line numbers/labels
- **Folding:** No folding ranges for procedures/loops
- **Formatting:** No document formatting provider
- **Rename:** No rename refactoring for variables
- **References:** No find all references for variables/line numbers
- **Definition:** No go-to-definition for GOSUB/GOTO targets
- **Code Actions:** No quick fixes for common errors
- **Semantic Tokens:** No semantic highlighting

#### 2. **Configuration Missing**
- No user settings for:
  - ZX model (48K, 128K, Interface 1)
  - Strict mode (warn about non-standard syntax)
  - Line number auto-increment
  - Max line length warnings (ZX limit)

#### 3. **Workspace Features**
- No multi-file support (LOAD, MERGE references)
- No project structure understanding
- No workspace symbols provider

#### 4. **Developer Experience**
- No code snippets for common patterns
- No IntelliSense for variable names
- No parameter hints for all commands (only functions)
- Completion doesn't respect context (statements vs expressions)

---

## Improvement Roadmap

### Phase 1: Complete ZX BASIC Language Support (Priority: HIGH)

#### 1.1 Enhance Lexer
- [x] Add line number tokenization
- [x] Fix REM comment handling (consume to end of line)
- [x] Add colon (`:`) as statement separator token
- [x] Recognize `GO TO` and `GO SUB` as single keywords
- [x] Add `DEF FN` as single keyword
- [ ] Handle embedded control codes in strings
- [x] Support scientific notation (e.g., `1.5E10`)
- [ ] Validate numeric ranges (0-65535 for addresses, 0-255 for bytes)

#### 1.2 Complete Keyword Database
**Action:** Import all keywords from `syntax-definitions/keywords.ts`
- [x] Add all missing basicKeywords to server completion
- [x] Add zx128Keywords with model detection
- [x] Add interface1Keywords with model detection
- [x] Add all missing functions (ACS, ASN, SGN, VAL$, etc.)
- [x] Add command signature information for all keywords
- [x] Document each keyword with ZX manual descriptions

#### 1.3 Expand Parser
- [x] Parse complete statements (not just expressions)
  - [x] LET variable = expression
  - [x] PRINT [AT line,col;] expression [separator expression]...
  - [x] IF condition THEN statement [: ELSE statement]
  - [x] FOR variable = start TO end [STEP step]
  - [x] GOTO line_number
  - [x] GOSUB line_number
  - [x] DIM array(dimensions)
  - [x] INPUT [prompt;] variable [,variable]...
  - [x] READ variable [,variable]...
  - [x] DATA constant [,constant]...
  - [ ] DEF FN name(params) = expression
- [ ] Parse string slicing: `var$(start TO end)`
- [ ] Parse array subscripts: `array(index [,index]...)`
- [ ] Handle TAB and AT within PRINT
- [ ] Track statement context (can't use NEXT without FOR)

**Phase 1.3 Status:** ✅ COMPLETE - Full statement parsing implemented with 10 statement types (LET, PRINT, INPUT, IF, FOR, DIM, GOTO, GOSUB, READ, DATA). Includes:
- parseStatement() dispatcher method
- Individual parsers for each statement type
- ASTNode interface extended with statement types
- 16 comprehensive test cases (all passing)
- Demo file showing all statement types
- Total test count: 41/41 passing

#### 1.4 Improve Diagnostics
- [x] Validate line numbers (1-9999, integer only)
- [x] Detect duplicate line numbers
- [x] Warn on missing NEXT for FOR loops (basic check)
- [x] Warn on RETURN without GOSUB (basic check)
- [x] Validate array dimensions match DIM declaration (max 3 dimensions per ZX BASIC spec)
- [x] Type checking: string operations on string vars, numeric on numeric
- [x] Error on missing THEN in IF statements
- [x] Validate color values (0-7 for INK/PAPER/BORDER, plus 8-9 for INK/PAPER)

**Note:** GOTO/GOSUB to non-existent lines is valid ZX BASIC behavior (execution continues at next line or stops if beyond program)

### Phase 2: Enhanced IntelliSense (Priority: HIGH)

#### 2.1 Context-Aware Completion
- [x] Complete line numbers after GOTO/GOSUB/RUN/LIST
- [x] Complete variable names from current document
- [x] Complete array names for subscripting
- [x] Complete function names only in expression context
- [x] Complete keywords only at statement start
- [x] Filter completions by ZX model (48K/128K/Interface 1)
- [x] Add snippet completions for common patterns:
  - [x] `for` → `FOR i = 1 TO 10: code: NEXT i`
  - [x] `if` → `IF condition THEN statement`
  - [x] `gosub` → `GOSUB line_number: ... : line_number REM subroutine: ...: RETURN`
  - [x] `repeat` → `10 REM repeat: code: GOTO 10`
  - [x] `data` → `DATA value1, value2, value3`
  - [x] `dim` → `DIM array(10)`
  - [x] `input` → `INPUT "prompt"; variable`
  - [x] `print` → `PRINT expression`

**Phase 2.1 Status:** ✅ COMPLETE - Model-specific keyword filtering now implemented:
- Converted onCompletion handler to async for settings retrieval
- Added model-based filtering in completion provider:
  - 48K model: basicKeywords + functions only
  - 128K model: basicKeywords + zx128Keywords + functions
  - Interface1 model: basicKeywords + interface1Keywords + functions
- settings.model configuration drives keyword availability
- Created model-completion-test.ts with 14 tests covering all models
- Demo file: model-specific-completion-demo.bas
- Total test count: 41/41 passing

#### 2.2 Enhanced Hover Information
- [x] Show variable type (numeric/string) and first assignment
- [x] Show array dimensions on hover over array name
- [x] Show line number on hover over GOTO/GOSUB target
- [x] Show function signature with parameter types
- [ ] Include examples from ZX manual
- [ ] Link to online ZX Spectrum manual pages

#### 2.3 Signature Help for Commands
Commands that need signature help (not just functions):
- [x] `PRINT [AT line,col;] expression [;|,] ...`
- [x] `INPUT ["prompt";] variable [,variable]...`
- [x] `PLOT x, y`
- [x] `DRAW x, y [,angle]`
- [x] `CIRCLE x, y, radius`
- [x] `BEEP duration, pitch`
- [x] `BORDER color`
- [x] `INK color`, `PAPER color`
- [x] `POKE address, value`
- [x] `FOR var = start TO end [STEP step]`
- [x] `DIM array(size [,size]...)`
- [x] `READ variable [,variable]...`
- [x] `DATA constant [,constant]...`
- [x] `GOSUB line_number`, `GOTO line_number`
- [x] `LET variable = expression`

### Phase 3: Advanced VS Code Features (Priority: MEDIUM)

#### 3.1 Document Symbols
- [x] Implement `onDocumentSymbol` provider
- [x] Show line numbers as symbols (outline view)
- [x] Identify subroutines (GOSUB targets)
- [x] Show DEF FN functions
- [x] Show variables (first assignment location)

**Phase 3.1 Status:** ✅ COMPLETE - Document symbols now include:
- Line numbers (numbered symbols, sorted numerically)
- Subroutines (GOSUB targets marked with "(subroutine)" label)
- DEF FN functions (marked as [DEF FN] with function kind)
- Variables (LET assignments, limited to first 20 to avoid clutter, marked as [variable])
- Proper sorting: line numbers → subroutines → DEF FN → variables
- Total test count: 41/41 passing


#### 3.2 Navigation Features
- [x] **Go to Definition:** Jump to line number from GOTO/GOSUB
- [x] **Find References:** Find all GOTOs/GOSUBs to a line number
- [ ] **Peek Definition:** Peek at line number content
- [ ] Breadcrumbs support (show current line number range)

#### 3.3 Code Actions (Quick Fixes)
- [x] Add missing line number
- [x] Renumber lines (auto-increment by 10)
- [x] Add missing RETURN for GOSUB
- [x] Add missing NEXT for FOR
- [x] Suggest `DIM` for undeclared array
- [x] Uppercase all keywords (refactoring action)

**Phase 3.3 Status:** ✅ COMPLETE - Code actions now include:
- Add missing line numbers (prepends line 10, 20, 30... to lines)
- Renumber lines (auto-increment by 10 from start)
- Add RETURN for GOSUB (appends at end if missing)
- Add NEXT for FOR (appends at end if missing)
- Suggest DIM for undeclared arrays (detects array usage without DIM, suggests declaration)
- Uppercase keywords (converts all keywords to uppercase)
- Total test count: 41/41 passing

#### 3.4 Formatting
- [x] Implement `onDocumentFormatting`
- [x] Normalize spacing around operators
- [x] Align statements after colon separators
- [x] Uppercase keywords (ZX standard)
- [x] Auto-renumber lines

**Phase 3.4 Status:** ✅ COMPLETE - Document formatting now includes:
- Normalize spacing around operators and keywords
- Align statements with proper spacing after colons
- Uppercase all keywords (ZX BASIC standard)
- Auto-renumber lines (sequentially by 10: 10, 20, 30... etc.)
- **Updates GOTO/GOSUB targets** when line numbers change (handles GOTO, GO TO, GOSUB, GO SUB)
- Detects and updates existing line numbers
- Skips empty lines
- One command for complete code formatting
- Total test count: 41/41 passing

### Phase 4: Workspace & Configuration (Priority: MEDIUM)

#### 4.1 Configuration Settings
Add to package.json and server settings:
```json
{
  "zxBasic.model": {
    "type": "string",
    "enum": ["48K", "128K", "Interface1"],
    "default": "48K",
    "description": "Target ZX Spectrum model"
  },
  "zxBasic.strictMode": {
    "type": "boolean",
    "default": false,
    "description": "Warn about non-standard BASIC syntax"
  },
  "zxBasic.lineNumberIncrement": {
    "type": "number",
    "default": 10,
    "description": "Default increment for auto-numbering"
  },
  "zxBasic.maxLineLength": {
    "type": "number",
    "default": 255,
    "description": "Warn when line exceeds this length"
  },
  "zxBasic.uppercaseKeywords": {
    "type": "boolean",
    "default": true,
    "description": "Auto-uppercase keywords on completion"
  }
}
```

**Phase 4.1 Status:** ✅ COMPLETE - Configuration settings implemented:
- Added 5 ZX BASIC specific configuration options to vscode-extension/package.json
- Updated LSP server settings interface (ExampleSettings) with all new options
- Integrated settings into getDocumentSettings() retrieval
- Settings are now accessible throughout the LSP server
- Default values match ZX BASIC standards
- Total test count: 41/41 passing

#### 4.2 Workspace Features
- [ ] Workspace symbols (find line numbers across files)
- [ ] Multi-file LOAD/MERGE reference checking
- [ ] Project-level DATA/READ validation

### Phase 5: Advanced Semantic Features (Priority: LOW)

#### 5.1 Semantic Tokens
- [x] Implement semantic token provider
- [x] Highlight line numbers (lineNumber token type)
- [x] Highlight variables by type (string/numeric/array)
- [x] Highlight GOTO/GOSUB targets
- [x] Highlight undefined variables differently
- [x] Create comprehensive token legend (10 token types + 5 modifiers)

**Phase 5.1 Status:** ✅ COMPLETE - Semantic tokens implemented:
- Added SemanticTokensLegend with 10 token types (lineNumber, variable, stringVariable, numericVariable, array, function, keyword, gotoTarget, undefined, comment)
- Added 5 token modifiers (declaration, definition, readonly, deprecated, unused)
- onSemanticTokens handler generates delta-encoded token array
- Handles variable definition tracking (LET, DIM, INPUT, READ)
- Undefined variable detection
- Total test count: 41/41 passing
- Demo: semantic-tokens-demo.bas

#### 5.2 Rename Refactoring
- [x] Implement rename provider with prepareProvider
- [x] Rename variables (update all references)
- [x] Rename string variables ($) and numeric variables (%)
- [x] Rename arrays (all subscript references)
- [x] Rename line numbers (update GOTO/GOSUB targets)
- [x] Handle GO TO and GO SUB variants
- [x] Preserve whole-word matching (no partial renames)

**Phase 5.2 Status:** ✅ COMPLETE - Rename refactoring implemented:
- Added onRenameRequest handler with WorkspaceEdit support
- Renames variables across entire document
- Updates all GOTO/GOSUB targets when line numbers are renamed
- Handles both GOSUB/GO SUB and GOTO/GO TO forms
- Preserves variable type suffixes ($ / %)
- Total test count: 41/41 passing
- Demo: rename-demo.bas

#### 5.3 Folding Ranges
- [x] Implement folding range provider
- [x] Fold FOR...NEXT blocks
- [x] Fold subroutine blocks (GOSUB target to RETURN)
- [x] Fold DATA statement blocks (consecutive DATA statements)
- [x] Handle nested FOR loops
- [x] Support GO SUB targets as well as GOSUB

**Phase 5.3 Status:** ✅ COMPLETE - Folding ranges implemented:
- Added onFoldingRanges handler
- Identifies FOR...NEXT blocks with proper nesting
- Identifies subroutines from line number to RETURN
- Groups consecutive DATA statements
- Creates proper folding regions for code navigation
- Total test count: 41/41 passing
- Demo: folding-ranges-demo.bas

#### 5.4 Call Hierarchy
- [x] Implement call hierarchy prepare handler
- [x] Show incoming calls (GOSUB callers to a subroutine)
- [x] Show outgoing calls (GOSUB calls from a subroutine)
- [x] Create CallHierarchyItem for subroutines
- [x] Handle nested GOSUB calls
- [x] Track multiple callers for shared subroutines

**Phase 5.4 Status:** ✅ COMPLETE - Call hierarchy implemented:
- Added call hierarchy providers (prepare, incoming calls, outgoing calls)
- Displays GOSUB call graph in VS Code
- Shows incoming calls (who calls this subroutine)
- Shows outgoing calls (what this subroutine calls)
- Handles both GOSUB and GO SUB forms
- Supports nested call chains
- Total test count: 41/41 passing
- Demo: call-hierarchy-demo.bas

---

## Implementation Strategy

### Quick Wins (1-2 days)
1. **Import all keywords from syntax-definitions** → Immediate completion improvement
2. **Add signature help for common commands** → Better UX for PRINT, INPUT, PLOT, etc.
3. **Better hover documentation** → Copy from ZX manual
4. **Line number validation in diagnostics** → Catch common errors

### Medium Term (1 week)
1. **Enhanced parser** → Parse full statements for better validation
2. **Context-aware completion** → Only show relevant keywords
3. **Document symbols** → Outline view with line numbers
4. **Go-to-definition for line numbers** → Navigation for GOTO/GOSUB

### Long Term (2-4 weeks)
1. **Full semantic analysis** → Type checking, scope tracking
2. **Code actions** → Quick fixes and refactorings
3. **Formatting provider** → Auto-format and renumber
4. **Workspace features** → Multi-file support

---

## Testing Requirements

### New Test Coverage Needed
1. **Lexer tests:**
   - Line number tokenization
   - Multi-keyword tokens (`GO TO`, `DEF FN`)
   - REM comment handling
   - String slicing syntax
   
2. **Parser tests:**
   - All statement types
   - TAB/AT within PRINT
   - String slicing
   - Array subscripts
   - DEF FN declarations

3. **Completion tests:**
   - Context-aware filtering
   - Variable name completion
   - Line number completion
   - Model-specific keywords

4. **Diagnostic tests:**
   - Line number validation
   - Type mismatches
   - Missing NEXT/RETURN
   - Undefined variables

5. **Integration tests:**
   - Complete program validation
   - Multi-file scenarios

### Target Metrics
- Test coverage: >90% (currently 88.85%)
- All ZX BASIC keywords covered
- All statement types parsed
- All diagnostic rules tested

---

## Reference Documentation

### ZX Spectrum BASIC Resources
- **ZX Spectrum BASIC Manual:** [worldofspectrum.org/ZXBasicManual](https://worldofspectrum.org/ZXBasicManual/)
- **ROM Disassembly:** Understanding tokenization and internal representation
- **Syntax-definitions module:** `/home/stef/projets/vs-zx/syntax-definitions/keywords.ts`

### VS Code LSP Best Practices
- **LSP Specification:** [microsoft.github.io/language-server-protocol](https://microsoft.github.io/language-server-protocol/)
- **VS Code API:** Extension and language features documentation
- **Sample LSP Servers:** [github.com/microsoft/vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample)

### Current Codebase
- **Lexer/Parser:** `/home/stef/projets/vs-zx/lsp-server/src/zxbasic.ts`
- **LSP Server:** `/home/stef/projets/vs-zx/lsp-server/src/server.ts`
- **Tests:** `/home/stef/projets/vs-zx/lsp-server/src/zxbasic.spec.ts`
- **Extension:** `/home/stef/projets/vs-zx/vscode-extension/`

---

## Success Criteria

### ZX BASIC Compliance
✅ Complete when:
- [ ] All keywords from `syntax-definitions` are recognized
- [ ] All ZX BASIC statement types can be parsed
- [ ] Diagnostics catch all syntax errors a real ZX Spectrum would reject
- [ ] Sample programs (in `/samples/`) validate correctly
- [ ] Can handle real ZX BASIC programs from archives

### VS Code Compliance
✅ Complete when:
- [ ] Implements all applicable LSP features (completion, hover, signature, diagnostics, symbols, definition, references)
- [ ] Provides configuration options
- [ ] Follows VS Code extension best practices
- [ ] Responsive (no blocking operations)
- [ ] Well-tested (>90% coverage)
- [ ] Documented (inline docs + README)

### User Experience
✅ Complete when:
- [ ] ZX BASIC developers can write code faster with IntelliSense
- [ ] Common errors are caught immediately
- [ ] Navigation is intuitive (go-to-definition works)
- [ ] Documentation is accessible (hover works)
- [ ] Code can be auto-formatted to standards

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on user needs
3. **Set up task tracking** (GitHub issues, project board)
4. **Begin Phase 1.2:** Import keywords from syntax-definitions (highest impact, lowest effort)
5. **Iterate incrementally** with frequent testing

**Document maintained by:** GitHub Copilot  
**Last updated:** 22 November 2025
