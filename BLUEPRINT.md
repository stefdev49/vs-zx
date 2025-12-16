# ZX BASIC Variable Name Validation Blueprint

## Overview

This document describes the comprehensive variable name validation implementation in the ZX BASIC language server, including strict length requirements for different variable types according to official ZX BASIC specifications.

## Variable Name Rules in ZX BASIC

### Official Specifications

1. **General Variables**: Can contain only `[a-zA-Z0-9]` characters, any length
2. **String Variables**: Must be **exactly 1 character** followed by `$` (e.g., `A$`)
3. **Integer Variables**: Must be **exactly 1 character** followed by `%` (e.g., `B%`)
4. **FOR/NEXT Loop Variables**: Must be **exactly 1 character** (no suffix)
5. **Array Variables**: Must be **exactly 1 character** (e.g., `DIM A(10)`)
6. **Underscores**: **NOT ALLOWED** in any variable names

### Previously Allowed (Incorrect)

- `my_var` - Variable with underscore
- `test_123` - Variable with underscore and numbers
- `A_B$` - String variable with underscore
- `ABC$` - Multi-character string variable
- `TEST%` - Multi-character integer variable
- `FOR COUNTER = 1 TO 10` - Multi-character FOR loop variable
- `DIM ARRAY(10)` - Multi-character array variable

### Now Correctly Rejected

- `my_var` → Tokenized as: `IDENTIFIER("MY")`, `INVALID("_")`, `IDENTIFIER("VAR")`
- `test_123` → Tokenized as: `IDENTIFIER("TEST")`, `INVALID("_")`, `NUMBER("123")`
- `A_B$` → Tokenized as: `IDENTIFIER("A")`, `INVALID("_")`, `IDENTIFIER("B$")`
- `ABC$` → Tokenized as: `IDENTIFIER("ABC$")` + **Diagnostic**: "String variable name must be exactly 1 character long"
- `TEST%` → Tokenized as: `IDENTIFIER("TEST%")` + **Diagnostic**: "Integer variable name must be exactly 1 character long"
- `FOR COUNTER = 1 TO 10` → Tokenized as: `IDENTIFIER("COUNTER")` + **Diagnostic**: "FOR/NEXT loop variable must be exactly 1 character long"
- `DIM ARRAY(10)` → Tokenized as: `IDENTIFIER("ARRAY")` + **Diagnostic**: "Array variable name must be exactly 1 character long"

## Implementation Details

### Core Validation Locations

#### 1. Lexer-Level Validation (Underscore Rejection)

**File**: `lsp-server/src/zxbasic.ts`
**Function**: `isLetter(char: string): boolean`
**Line**: 210

```typescript
private isLetter(char: string): boolean {
  return /[a-zA-Z]/.test(char); // Removed underscore from character class
}
```

#### 2. Linter-Level Validation (Length Requirements)

**File**: `lsp-server/src/server.ts`
**Function**: `validateTextDocument()`
**Lines**: 368-440

This validation occurs in the diagnostic loop and checks:

- String variables (ending with `$`) must be exactly 1 character
- Integer variables (ending with `%`) must be exactly 1 character
- FOR/NEXT loop variables must be exactly 1 character
- Array variables (in DIM statements) must be exactly 1 character

### Tokenization Process

1. **Lexer Entry Point**: `tokenize(text: string): Token[]` (line 111)
2. **Identifier Tokenization**: `lexIdentifier(): Token` (line 303)
3. **Character Validation**: Uses `isLetter()` and `isDigit()` functions
4. **Suffix Handling**: Checks for `$` (string) and `%` (integer) suffixes

### Linter Validation Process

1. **Diagnostic Entry Point**: `validateTextDocument()` (line 354)
2. **Token Analysis**: Iterates through all tokens
3. **Context Detection**: Identifies variable usage context (string, integer, FOR/NEXT, DIM)
4. **Length Validation**: Applies appropriate length rules based on context
5. **Diagnostic Generation**: Creates error messages for invalid variable names

### Related Validation Points

#### 1. Word Boundary Detection

**File**: `lsp-server/src/formatting-utils.ts`
**Function**: `getWordBeforePosition()`
**Line**: 390

```typescript
while (start >= 0 && /[A-Za-z0-9]/.test(lineText[start])) {
  // Removed underscore
  start--;
}
```

#### 2. Variable Context Detection

**File**: `lsp-server/src/formatting-utils.ts`
**Function**: `getContextAtPosition()`
**Lines**: 496-502

```typescript
const variablePatterns = [
  /DIM\s+[A-Za-z0-9]+\s*$/i, // After DIM (removed underscore)
  /LET\s+[A-Za-z0-9]+\s*=\s*[^=]*$/i, // After LET variable =
  /INPUT\s+[A-Za-z0-9]+\s*$/i, // After INPUT
  /READ\s+[A-Za-z0-9]+\s*$/i, // After READ
  /\b[A-Za-z0-9]+\s*=\s*[^=]*$/i, // After any assignment
  /\(\s*[A-Za-z0-9]+\s*$/i, // Inside function calls
  /\b[A-Za-z0-9]+\s*\(/i, // Before function parameters
];
```

#### 3. Identifier Extraction for Completion

**File**: `lsp-server/src/server.ts`
**Function**: `provideCompletionItems()`
**Lines**: 1326, 1625

```typescript
// Line 1326: Word boundary detection for completion
while (startChar >= 0 && /[A-Za-z0-9$%]/.test(lineText[startChar])) {
  startChar--;
}

// Line 1625: Identifier extraction for rename/find references
while (startChar > 0 && /[A-Za-z0-9$%]/.test(fullLineText[startChar - 1])) {
  startChar--;
}
```

## Test Coverage

### Unit Tests

**File**: `lsp-server/src/zxbasic.spec.ts`

#### Underscore Validation

```typescript
test("should reject underscores in variable names", () => {
  const tokens = lexer.tokenize("my_var");
  expect(tokens).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: TokenType.IDENTIFIER, value: "MY" }),
      expect.objectContaining({ type: TokenType.INVALID, value: "_" }),
      expect.objectContaining({ type: TokenType.IDENTIFIER, value: "VAR" }),
    ]),
  );
});
```

#### Length Validation Tests

```typescript
test("should tokenize multi-character string variables for validation", () => {
  const tokens = lexer.tokenize("ABC$");
  expect(tokens).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: TokenType.IDENTIFIER, value: "ABC$" }),
    ]),
  );
});

test("should tokenize multi-character integer variables for validation", () => {
  const tokens = lexer.tokenize("TEST%");
  expect(tokens).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: TokenType.IDENTIFIER, value: "TEST%" }),
    ]),
  );
});

test("should tokenize multi-character FOR variables for validation", () => {
  const tokens = lexer.tokenize("FOR COUNTER = 1 TO 10");
  const counterToken = tokens.find((t) => t.value === "COUNTER");
  expect(counterToken).toBeDefined();
  expect(counterToken?.type).toBe(TokenType.IDENTIFIER);
});

test("should tokenize multi-character DIM variables for validation", () => {
  const tokens = lexer.tokenize("DIM ARRAY(10)");
  const arrayToken = tokens.find((t) => t.value === "ARRAY");
  expect(arrayToken).toBeDefined();
  expect(arrayToken?.type).toBe(TokenType.IDENTIFIER);
});
```

### Integration Tests

- **Formatting Tests**: Verify underscores don't break formatting
- **Completion Tests**: Ensure completion still works for valid identifiers
- **Diagnostic Tests**: Confirm underscores are flagged as invalid

## Validation Flow

```mermaid
graph TD
    A[Source Code] --> B[Lexer.tokenize()]
    B --> C[lexIdentifier()]
    C --> D[isLetter(char)]
    D -->|No underscore| E[Valid Identifier]
    D -->|Has underscore| F[Split Tokens]
    F --> G[IDENTIFIER part]
    F --> H[INVALID underscore]
    F --> I[IDENTIFIER part]
    E --> J[Parser]
    G --> J
    H --> J
    I --> J
    J --> K[Semantic Analysis]
    K --> L[Diagnostics: Invalid character]
```

## Error Reporting

When a variable contains an underscore:

### Underscore Errors

When a variable contains an underscore:

1. **Tokenization**: Splits into separate tokens with underscore marked as `INVALID`
2. **Diagnostics**: LSP reports "Invalid character" diagnostic
3. **Formatting**: Preserves the invalid structure (doesn't auto-fix)
4. **Completion**: Still works for the valid parts of the identifier

### Length Errors

When a variable violates length requirements:

1. **Tokenization**: Tokenized as normal `IDENTIFIER` (valid syntax)
2. **Diagnostics**: LSP reports specific error messages:
   - String variables: "String variable name must be exactly 1 character long (e.g., A$), but found 'ABC$'"
   - Integer variables: "Integer variable name must be exactly 1 character long (e.g., B%), but found 'TEST%'"
   - FOR/NEXT variables: "FOR/NEXT loop variable must be exactly 1 character long (e.g., I), but found 'COUNTER'"
   - Array variables: "Array variable name must be exactly 1 character long (e.g., A), but found 'ARRAY'"
3. **Formatting**: Preserves the structure (doesn't auto-fix)
4. **Completion**: Continues to work normally

## Backward Compatibility

### Preserved Functionality

- ✅ Valid variable names (`validVar`, `A$`, `B%`) work unchanged
- ✅ Keyword recognition unaffected
- ✅ Number and string literal parsing unchanged
- ✅ All existing language features preserved
- ✅ Regular variables (non-string, non-integer, not in special contexts) can be any length

### Breaking Changes

- ❌ Variable names with underscores now produce invalid tokens
- ❌ Multi-character string variables (`ABC$`) now produce diagnostic errors
- ❌ Multi-character integer variables (`TEST%`) now produce diagnostic errors
- ❌ Multi-character FOR/NEXT variables (`COUNTER`) now produce diagnostic errors
- ❌ Multi-character array variables (`ARRAY`) now produce diagnostic errors
- ❌ Code with invalid variables will show diagnostic errors
- ❌ Completion/rename may behave differently for invalid identifiers

## Future Enhancements

Potential improvements to consider:

1. **Custom Error Messages**: "Underscores not allowed in ZX BASIC variable names"
2. **Quick Fixes**: Auto-remove underscores from variable names
3. **Quick Fixes**: Auto-shorten variable names to 1 character where required
4. **Strict Mode**: Option to treat underscores as syntax errors vs warnings
5. **Migration Tool**: Batch rename variables to remove underscores
6. **Migration Tool**: Batch shorten variable names to comply with length requirements
7. **Configuration**: Allow users to disable specific validation rules
8. **Context-Aware Completion**: Suggest only valid variable names based on context

## References

- **ZX Spectrum BASIC Manual**: Official variable naming rules
- **ZX BASIC ROM Disassembly**: Original tokenization logic
- **Language Specification**: Complete ZX BASIC grammar rules
