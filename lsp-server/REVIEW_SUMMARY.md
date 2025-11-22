# LSP Server Review Summary
**Date:** 22 November 2025  
**Reviewer:** GitHub Copilot  
**Status:** ✅ All tests passing (38/38)

---

## Executive Summary

The ZX BASIC LSP server is **functional but incomplete**. Core features work well (lexer, parser, basic completion, hover, signatures), but significant gaps exist in ZX Spectrum BASIC compliance and VS Code feature coverage.

**Test Status:** ✅ 38/38 passing (88.85% coverage)  
**Overall Assessment:** 🟡 Functional prototype, needs production hardening

---

## Key Findings

### ✅ Strengths
1. **Solid Foundation:** Working lexer/parser with correct operator precedence
2. **Good Test Coverage:** 88.85% code coverage, comprehensive expression parsing tests
3. **Basic Features Working:** Completion, hover, signature help, diagnostics all functional
4. **Well-Structured Code:** Clean separation of concerns (lexer, parser, server)

### ⚠️ Critical Gaps

#### 1. Incomplete Keyword Support (HIGH PRIORITY)
**Problem:** Server has ~40 keywords, but `syntax-definitions/keywords.ts` defines 80+

**Missing Keywords:**
- Basic: `ELSE`, `CONTINUE`, `LINE`, `VAL$`, `SGN`, `ACS`, `ASN`
- ZX 128K: `SPECTRUM`, `PLAY`, `LLIST`, `LPRINT`
- Interface 1: `CAT*`, `LOAD*`, `SAVE*`, `MERGE*`, `VERIFY*`, `FORMAT*`
- Multi-word: `GO TO`, `GO SUB`, `DEF FN` (treated as separate tokens)

**Impact:** Users don't get completion/docs for valid ZX BASIC keywords

**Quick Fix:** Import keywords from existing `syntax-definitions` module (2-3 hours)

---

#### 2. Expression-Only Parser (HIGH PRIORITY)
**Problem:** Parser only handles expressions, not statements

**What's Missing:**
```basic
LET a = 5           ❌ Not parsed
PRINT "Hello"       ❌ Not parsed
FOR i = 1 TO 10     ❌ Not parsed
IF x > 5 THEN GOTO 100  ❌ Not parsed
10 + 5              ✅ Parses (expression only)
```

**Impact:** No validation of statement structure, limited diagnostics

**Effort:** Medium (1-2 weeks) - needs significant parser expansion

---

#### 3. Missing ZX BASIC Syntax Features (MEDIUM PRIORITY)

**Line Numbers:**
```basic
10 PRINT "Hello"    ❌ Line number not tokenized
PRINT "Hello"       ✅ Works (but invalid ZX BASIC)
```

**Multi-Statement Lines:**
```basic
10 LET a=5: PRINT a    ❌ Colon separator not handled properly
```

**String Slicing:**
```basic
a$(5 TO 10)         ❌ Not parsed
```

**Special PRINT Syntax:**
```basic
PRINT AT 10,5;"X"   ❌ AT/TAB not recognized
```

**Impact:** Can't validate real ZX BASIC programs from samples/archives

---

#### 4. Limited Diagnostics (MEDIUM PRIORITY)

**Currently Detects:**
- ✅ Invalid characters
- ✅ Basic syntax errors
- ✅ Unclosed strings

**Doesn't Detect:**
- ❌ Duplicate line numbers
- ❌ Missing NEXT for FOR
- ❌ Missing RETURN for GOSUB
- ❌ GOTO to non-existent line
- ❌ Type mismatches (string vs numeric)
- ❌ Undefined variables
- ❌ Array not DIMmed

**Impact:** Users miss common errors until runtime

---

#### 5. Missing VS Code Features (LOW-MEDIUM PRIORITY)

**Not Implemented:**
- ❌ Document symbols (outline view)
- ❌ Go-to-definition (for line numbers)
- ❌ Find references (for variables/line numbers)
- ❌ Code actions (quick fixes)
- ❌ Formatting provider
- ❌ Rename refactoring
- ❌ Semantic tokens
- ❌ Folding ranges

**Impact:** Missing modern IDE features users expect

---

## Code Quality Assessment

### Lexer (`zxbasic.ts` lines 95-350)
**Rating:** 🟢 Good

**Strengths:**
- Clean token-based design
- Handles numbers (including decimals, exponents)
- Handles strings with quotes
- Tracks line/column positions
- Recognizes keywords vs identifiers

**Issues:**
- Doesn't handle line numbers
- `REM` comments not properly consumed to EOL
- Multi-word keywords (`GO TO`) tokenized as two tokens
- No embedded control code handling

**Recommendation:** Minor refactoring needed for ZX compliance

---

### Parser (`zxbasic.ts` lines 351-666)
**Rating:** 🟡 Good for expressions, needs expansion

**Strengths:**
- Correct operator precedence
- Handles parentheses
- Function call parsing
- Recursive descent pattern well-implemented

**Issues:**
- Only parses expressions
- No statement-level AST
- No context tracking (FOR/NEXT matching)
- No type tracking

**Recommendation:** Major expansion needed for full language support

---

### Server (`server.ts` lines 1-606)
**Rating:** 🟢 Good structure, needs more features

**Strengths:**
- Proper LSP initialization
- Clean handler organization
- Settings support
- Document caching

**Issues:**
- Completion doesn't use context (always shows all keywords)
- Hover provider very basic (regex-based word extraction)
- Signature help only for functions (not commands like PRINT, INPUT)
- No advanced LSP features (symbols, definition, references, etc.)

**Recommendation:** Incremental feature additions

---

## Sample Program Compatibility

Tested against `/samples/pangolin.bas` and `/samples/example_hangman.bas`:

**Valid ZX BASIC Constructs Found:**
```basic
5 REM Pangolins                    ❌ Line number not handled
10 LET nq=100: REM number...       ❌ Multi-statement not parsed
15 DIM q$(nq,50): DIM a(nq,2)      ❌ DIM not parsed, arrays not tracked
110 PRINT "Think of an animal."    ⚠️ PRINT not parsed (only expression inside)
160 FOR n=0 TO b-1                 ❌ FOR not parsed
200 IF r$="N" THEN GO TO 210       ❌ IF/THEN/GOTO not parsed
310 LET P$=q$(c): GO SUB 900       ❌ GO SUB (two words) not recognized
```

**Result:** ❌ Cannot fully validate real ZX BASIC programs

---

## Immediate Action Items

### Priority 1: Quick Wins (1-2 days)
1. **Import keywords from `syntax-definitions`**
   - File: `server.ts` lines 188-207
   - Change: Import `allKeywords` from `syntax-definitions/keywords.ts`
   - Impact: 40+ new keywords in completion/hover

2. **Add signature help for commands**
   - Add: PRINT, INPUT, PLOT, DRAW, CIRCLE, BEEP, BORDER, INK, PAPER
   - Impact: Better parameter guidance

3. **Fix REM comment handling**
   - File: `zxbasic.ts` lexer
   - Change: Consume entire line after REM
   - Impact: Correct tokenization of comments

### Priority 2: Foundation (1 week)
1. **Add line number tokenization**
   - Impact: Enable line number navigation/validation

2. **Parse basic statements**
   - Start with: LET, PRINT, IF/THEN, GOTO, GOSUB
   - Impact: Enable statement-level diagnostics

3. **Context-aware completion**
   - Filter by statement position (start vs expression)
   - Impact: More relevant suggestions

### Priority 3: Polish (2-4 weeks)
1. **Document symbols provider**
   - Show line numbers in outline view
   - Impact: Better navigation

2. **Advanced diagnostics**
   - Validate line numbers, FOR/NEXT matching, types
   - Impact: Catch errors early

3. **Code actions**
   - Quick fixes for common issues
   - Impact: Better developer experience

---

## Resource Requirements

### Immediate (Keywords Import)
- **Time:** 2-3 hours
- **Risk:** Low (imports existing data)
- **Dependencies:** None
- **Testing:** Update completion tests

### Short Term (Statement Parser)
- **Time:** 1-2 weeks
- **Risk:** Medium (significant parser changes)
- **Dependencies:** Need statement AST design
- **Testing:** Add 50+ statement parsing tests

### Long Term (Full VS Code Features)
- **Time:** 2-4 weeks
- **Risk:** Low-Medium (additive features)
- **Dependencies:** Statement parser must be complete
- **Testing:** Feature-specific test suites

---

## Recommendations

### Do First
1. ✅ Import all keywords from `syntax-definitions` (highest ROI)
2. ✅ Add line number tokenization (foundation for navigation)
3. ✅ Fix REM comment handling (correctness)

### Do Soon
1. 🔵 Expand parser to handle statements (enables validation)
2. 🔵 Add signature help for common commands (UX improvement)
3. 🔵 Implement document symbols (navigation)

### Do Later
1. ⚪ Full semantic analysis (type checking, scope)
2. ⚪ Code actions and refactoring
3. ⚪ Formatting provider

### Consider Skipping
- ❌ Folding ranges (limited value for flat BASIC)
- ❌ Call hierarchy (GOSUB usage is simple)
- ❌ Workspace-wide features (single-file is common)

---

## Conclusion

The LSP server is a **solid foundation** that needs **strategic expansion** to meet ZX BASIC compliance and modern IDE expectations.

**Recommended Approach:**
1. **Phase 1:** Import keywords + line numbers (quick wins)
2. **Phase 2:** Statement parser (foundation)
3. **Phase 3:** Advanced features (polish)

**Estimated Timeline:**
- Phase 1: 1 week
- Phase 2: 2-3 weeks
- Phase 3: 3-4 weeks
- **Total:** 6-8 weeks to production-ready

**Success Metrics:**
- ✅ All keywords from `syntax-definitions` supported
- ✅ Can validate programs from `/samples/`
- ✅ >90% test coverage
- ✅ Document symbols + go-to-definition working
- ✅ Diagnostics catch common errors

---

**Full details:** See `IMPROVEMENT_PLAN.md`
