Based on my analysis of the ROM disassembly and the existing LSP server code, here's a comprehensive plan to implement ZX Spectrum BASIC tokenization and expression parsing language support.

## Current State Assessment

The existing LSP server has basic keyword completion (from syntax-definitions/keywords.ts) and rudimentary line validation (checking for line numbers or REM statements). It lacks proper tokenization and parsing capabilities.

From the ROM disassembly, ZX Spectrum BASIC uses a tokenized system where:
- Commands are represented as single-byte tokens (e.g., $CE for 'LET', $F1 for 'LET' token in 128K mode)
- The parser uses syntax parameter tables to validate statement structure
- Expression parsing follows a strict precedence system
- Strings are quoted, numbers are floating-point, identifiers are single letters (A-Z)

## Implementation Plan

### Phase 1: Lexical Analysis (Tokenizer)

**1. Define Token Types**
- Keywords/Tokens (based on ROM's command and function tables)
- Line numbers (0-9999)
- String literals (quoted)
- Numeric literals (integer, float, binary, hex)
- Identifiers (single letters A-Z, possibly with $ for strings)
- Operators (+, -, *, /, ^, =, <>, <=, >=, <, >, AND, OR)
- Punctuation ((), :, , , ; etc.)
- Comments (REM)

**2. Implement the Lexer**
Create a `ZXBasicLexer` class that:
- Tokenizes input by position, returning tokens with type, value, and position info
- Handles line number parsing (implicit line numbers in editor)
- Manages quote-delimited strings
- Parses numeric constants (floating point as per ROM)
- Recognizes all keywords from the syntax table
- Uses a state machine to handle REM statements, quoted strings, and implicit line separation

### Phase 2: Syntax Parsing

**3. Expression Parser**
Implement expression parsing following ROM's precedence rules:
- Arithmetic operators: ^ (exponentiation), *, /, +, -
- Logical operators: AND, OR, NOT
- Comparison operators: =, <, >, <=, >=, <>
- Function calls (ABS, SIN, etc.)
- Parenthesized expressions
- Variable references (A-Z, A$(n))

**4. Statement Parser**
Parse BASIC statements according to the syntax parameter table:
- Command class handling (LET, PRINT, FOR, etc.)
- Parameter validation (numeric, string, variable expressions)
- Colon-separated statements
- Block structures (for-loops, nested constructs)

### Phase 3: LSP Integration

**5. Diagnostics Engine**
- Syntax error detection during parsing
- Line number validation (0-9999, no duplicates)
- Variable declaration analysis
- Function/statement usage validation
- Error reporting with location information

**6. Enhanced Language Features**
- Syntax highlighting (keywords, strings, numbers, comments)
- Semantic highlighting (variables, functions)
- Hover information for keywords/functions
- Contextual code completion
- Go-to definition for line numbers

### Phase 4: Audio/Command Extensions (128K Specific)

**7. PLAY Command Parser**
Parse the PLAY command syntax:
- Channels (T, N, O, M, V, U, W, X, Y, Z commands)
- Musical notation parsing
- String concatenation and timing

**8. 128K-Specific Features**
- SPECTRUM command parsing
- RAM disk commands (CAT!, ERASE!, etc.)
- Serial communication commands (FORMAT, etc.)

## Implementation Architecture

```
ZXBasicLanguageServer
├── ZXBasicLexer (Phase 1)
│   ├── tokenizeLine()
│   └── getNextToken()
├── ZXBasicParser (Phase 2)
│   ├── parseExpression()
│   ├── parseStatement()
│   └── parseProgram()
├── ZXBasicValidator (Phase 3)
│   ├── validateSyntax()
│   ├── checkLineNumbers()
│   └── generateDiagnostics()
└── LSP Handlers
    ├── onHover()
    ├── onCompletion()
    └── onDiagnostics()
```

## Key Technical Considerations

- **Line Number Handling**: ZX BASIC programs have line numbers, but LSP editors work with line-based editing. Need to support both explicit line numbers and implicit (editor line numbers).
- **Token Continuity**: The ROM's tokenizer handlesREM statements and quoted strings specially - keywords are not tokenized within them.
- **Expression Complexity**: The ROM's expression parser has 16 precedence levels - need to replicate this accurately.
- **128K Extensions**: The PLAY command has complex musical notation parsing requirements.

Would you like me to proceed with implementing this plan? I can start with Phase 1 (the lexer) and work through each phase sequentially.
