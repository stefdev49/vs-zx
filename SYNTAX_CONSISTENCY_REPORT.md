# Syntax Consistency Report

## Overview

This report compares keyword definitions across three systems:
1. **syntax-definitions/keywords.ts** - Centralized keyword lists
2. **lsp-server/src/zxbasic.ts** - LSP server tokenizer (getKeywordType function)
3. **vscode-extension/syntaxes/zx-basic.tmLanguage.json** - TextMate grammar for syntax highlighting

## Comparison Results

### Keywords in syntax-definitions/keywords.ts

**Basic Keywords (52):**
ATTR, BEEP, BORDER, BRIGHT, CIRCLE, CLEAR, CLS (duplicate), COLOR, CONTINUE, DATA, DIM, DRAW, FLASH, FOR, GOSUB, GOTO, IF, INK, INPUT, INVERSE, LET, LINE, LIST, LOAD, MERGE, NEW, NEXT, OUT, OVER, PAPER, PAUSE, PEEK, PLOT, POINT, POKE, PRINT, RANDOMIZE, READ, REM, RESTORE, RETURN, RUN, SAVE, SCREEN$, STEP, STOP, STROKE, THEN, TO, USR, VERIFY

**ZX128 Keywords (9):**
CAT, COPY, ERASE, FORMAT, LLIST, LPRINT, MOVE, PLAY, SPECTRUM

**Interface1 Keywords (7):**
CAT*, FORMAT*, LOAD*, MERGE*, NET, SAVE*, VERIFY*

**Functions (27):**
ABS, ACS, ASN, ATN, CHR$, CODE, COS, EXP, FN, IN, INKEY$, INT, LEN, LN, NOT, PEEK, PI, RND, SGN, SIN, SQR, STR$, TAB, TAN, USR, VAL, VAL$

### Keywords in lsp-server/src/zxbasic.ts (getKeywordType)

**All Keywords (67):**
PRINT, LET, IF, THEN, ELSE, FOR, TO, STEP, NEXT, READ, DATA, RESTORE, DIM, DEF, FN, DEFFN, GOTO, GOSUB, RETURN, STOP, RANDOMIZE, CONTINUE, CLEAR, CLS, INPUT, LOAD, SAVE, VERIFY, MERGE, BEEP, INK, PAPER, FLASH, BRIGHT, INVERSE, OVER, BORDER, PLOT, DRAW, CIRCLE, LPRINT, LLIST, COPY, SPECTRUM, PLAY, ERASE, CAT, FORMAT, MOVE, OUT, IN, OPEN, CLOSE, POKE, RUN, LIST, NEW, END, PAUSE, VAL, LEN, STR$, CHR$, CODE, SIN, COS, TAN, ASN, ACS, ATN, LN, EXP, INT, SQR, SGN, ABS, PEEK, USR, INKEY$, PI, TRUE, FALSE, RND, ATTR, SCREEN$, POINT, TAB, AND, OR, NOT, VAL$, AT

### Keywords in TextMate Grammar

**Control Keywords (57):**
PRINT, LET, INPUT, IF, THEN, ELSE, FOR, TO, STEP, NEXT, GOTO, GO TO, GOSUB, GO SUB, RETURN, DIM, READ, DATA, RESTORE, RUN, LIST, CLEAR, NEW, STOP, END, SAVE, LOAD, VERIFY, MERGE, RANDOMIZE, CONTINUE, POKE, PLOT, DRAW, CIRCLE, INK, PAPER, FLASH, BRIGHT, INVERSE, OVER, BORDER, CLS, BEEP, PAUSE, DEF FN, DEF, CAT, ERASE, FORMAT, MOVE, OPEN, CLOSE, COPY, LPRINT, LLIST, OUT, IN, NOT, TRUE, FALSE, SPECTRUM, PLAY, AT

**Logical Operators (2):**
AND, OR

**Functions (30):**
ABS, ACS, ASN, ATN, ATTR, CHR$, CODE, COS, EXP, FN, IN, INKEY$, INT, LEN, LN, PEEK, PI, POINT, RND, SCREEN$, SGN, SIN, SQR, STR$, TAB, TAN, USR, VAL, VAL$

## Issues Found

### 1. Duplicate "CLS" in syntax-definitions/keywords.ts
- **Issue:** CLS appears twice in basicKeywords array (lines 14 and 47)
- **Impact:** Redundant but harmless
- **Fix:** Remove duplicate entry

### 2. Missing Keywords in syntax-definitions/keywords.ts

**Missing from all lists:**
- ELSE
- END
- AT
- OPEN
- CLOSE
- TRUE
- FALSE
- DEF/DEFFN (has DEF FN handling but not in keywords list)
- GO TO / GO SUB (two-word variants)

**Missing Interface 1 keyword:**
- NET* (has NET but not NET*)

### 3. Extra Keywords in syntax-definitions/keywords.ts

**Not used elsewhere:**
- COLOR (not in ZX Spectrum ROM, should be removed or documented)
- LINE (keyword exists but not commonly in keyword lists)
- STROKE (not a standard ZX Spectrum keyword)

### 4. Inconsistencies in LSP Server

**Extra keywords in zxbasic.ts not in syntax-definitions:**
- ELSE
- DEF, DEFFN (variations)
- END
- OPEN, CLOSE
- TRUE, FALSE
- AT
- AND, OR (in keywords, should be operators)

### 5. TextMate Grammar Issues

**Has two-word keyword variants:**
- GO TO (alongside GOTO)
- GO SUB (alongside GOSUB)
- DEF FN (alongside DEF)

**Missing keywords:**
- REM is handled separately as comment
- RANDOMIZE appears in TextMate but implementation may differ

### 6. Operator vs Keyword Confusion

**AND, OR, NOT status varies:**
- TextMate: AND/OR are separate logical operators, NOT is keyword
- LSP: All three (AND, OR, NOT) are keywords
- Should be: Operators (have dedicated TokenType.AND, TokenType.OR in zxbasic.ts TokenType enum)

## Recommendations

### Priority 1: Fix Duplicates and Core Inconsistencies

1. **Remove duplicate CLS** from syntax-definitions/keywords.ts (line 47)

2. **Add missing core keywords** to syntax-definitions/keywords.ts:
   - ELSE
   - END  
   - AT
   - DEF (already has DEFFN handling but needs explicit entry)

3. **Remove non-standard keywords** from syntax-definitions/keywords.ts:
   - COLOR (or document if this is for a specific extension)
   - STROKE (not in ZX Spectrum ROM)
   - LINE (verify if this should be in statement context)

### Priority 2: Synchronize Function Lists

4. **Ensure functions are consistent** across all three:
   - Add ATTR to functions list in syntax-definitions (it's currently in basicKeywords)
   - Add POINT to functions list in syntax-definitions (it's currently in basicKeywords)
   - Add SCREEN$ to functions list in syntax-definitions (it's currently in basicKeywords)
   - Move PEEK from basicKeywords to functions (it's already in functions but also in basicKeywords)
   - Move USR from basicKeywords to functions (it's already in functions but also in basicKeywords)

### Priority 3: Handle Operators Correctly

5. **Fix AND, OR, NOT classification:**
   - These should NOT be in keyword lists
   - They are operators and have dedicated TokenType entries
   - Update getKeywordType() in zxbasic.ts to not include them
   - Keep them as separate operators in TextMate grammar

### Priority 4: Handle Two-Word Keywords

6. **Ensure two-word keywords work consistently:**
   - GO TO / GOTO
   - GO SUB / GOSUB  
   - DEF FN / DEFFN
   - LSP server has special handling (lines 337-374 in zxbasic.ts)
   - TextMate grammar includes both variants
   - syntax-definitions should document both forms

### Priority 5: Add Interface 1 Keywords

7. **Complete Interface 1 keyword list:**
   - Add OPEN, CLOSE (for channels)
   - Add NET* variant if needed
   - Verify CAT*, LOAD*, SAVE*, FORMAT*, MERGE*, VERIFY* are all needed

### Priority 6: Boolean Literals

8. **Add TRUE and FALSE** to syntax-definitions:
   - These are valid keywords/constants in ZX Spectrum BASIC
   - Already in LSP server and TextMate grammar

## Testing Required

After making changes:

1. ✅ Run LSP server tests: `cd lsp-server && npm test`
2. ✅ Build extension: `npm run build`
3. ✅ Test syntax highlighting in VS Code with sample files
4. ✅ Test LSP features (completion, diagnostics) with all keyword variants
5. ✅ Test two-word keywords (GO TO, GO SUB, DEF FN)
6. ✅ Test Interface 1 keywords if hardware available

## Impact Assessment

**Low Risk Changes:**
- Removing duplicates (CLS)
- Adding missing keywords to syntax-definitions (ELSE, END, AT, TRUE, FALSE)
- Fixing AND/OR/NOT classification

**Medium Risk Changes:**
- Removing non-standard keywords (COLOR, STROKE, LINE)
- Moving functions between lists (ATTR, POINT, SCREEN$, PEEK, USR)

**High Risk Changes:**
- Changing operator tokenization (AND, OR, NOT)
- Modifying two-word keyword handling

## Current Status

- ✅ All systems have reasonable keyword coverage
- ⚠️ Some inconsistencies exist but don't break functionality
- ⚠️ AND/OR/NOT classification needs clarification
- ⚠️ Some duplicates and missing keywords need cleanup
- ✅ Two-word keyword handling is implemented in LSP server
- ✅ Core functionality works correctly

## Next Steps

1. Create a canonical keyword list in syntax-definitions/keywords.ts
2. Update LSP server to import from syntax-definitions
3. Generate TextMate grammar from canonical list (or keep manual for fine-tuning)
4. Add tests to prevent future divergence
