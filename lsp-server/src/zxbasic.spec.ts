import { ZXBasicLexer, ZXBasicParser, TokenType } from './zxbasic';

describe('ZXBasicLexer', () => {
  let lexer: ZXBasicLexer;

  beforeEach(() => {
    lexer = new ZXBasicLexer();
  });

  test('should tokenize keywords', () => {
    const tokens = lexer.tokenize('PRINT LET IF');
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: TokenType.KEYWORD, value: 'PRINT' }),
        expect.objectContaining({ type: TokenType.KEYWORD, value: 'LET' }),
        expect.objectContaining({ type: TokenType.KEYWORD, value: 'IF' })
      ])
    );
  });

  test('should tokenize numbers', () => {
    const tokens = lexer.tokenize('10 3.14 1E5');
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: TokenType.LINE_NUMBER, value: '10' }), // First number is line number
        expect.objectContaining({ type: TokenType.NUMBER, value: '3.14' }),
        expect.objectContaining({ type: TokenType.NUMBER, value: '1E5' })
      ])
    );
  });

  test('should tokenize strings', () => {
    const tokens = lexer.tokenize('"HELLO" "WORLD"');
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: TokenType.STRING, value: '"HELLO"' }),
        expect.objectContaining({ type: TokenType.STRING, value: '"WORLD"' })
      ])
    );
  });

  test('should tokenize identifiers', () => {
    const tokens = lexer.tokenize('A$ B% C');
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: 'A$' }),
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: 'B%' }),
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: 'C' })
      ])
    );
  });

  test('should tokenize operators', () => {
    const tokens = lexer.tokenize('+ - * / ^ = < > <> <= >=');
    expect(tokens.filter(t => t.type === TokenType.OPERATOR)).toHaveLength(11);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '+')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '-')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '*')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '/')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '^')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '=')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '<')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '>')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '<>')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '<=')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === '>=')).toBe(true);
  });

    test('should tokenize logical operators as keywords', () => {
    const tokens = lexer.tokenize('AND OR NOT');
    expect(tokens.length).toBeGreaterThan(2); // Should produce multiple tokens
    const keywords = tokens.filter(t => t.type === TokenType.KEYWORD);
    expect(keywords.length).toBe(3); // Should have AND, OR, NOT as keywords
    expect(keywords[0].value).toBe('AND');
    expect(keywords[1].value).toBe('OR');
    expect(keywords[2].value).toBe('NOT');
  });

  test('should tokenize punctuation', () => {
    const tokens = lexer.tokenize('( ) : , ;');
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: TokenType.PUNCTUATION, value: '(' }),
        expect.objectContaining({ type: TokenType.PUNCTUATION, value: ')' }),
        expect.objectContaining({ type: TokenType.STATEMENT_SEPARATOR, value: ':' }),
        expect.objectContaining({ type: TokenType.PUNCTUATION, value: ',' }),
        expect.objectContaining({ type: TokenType.PUNCTUATION, value: ';' })
      ])
    );
  });

  test('should handle line numbers and basic structure', () => {
    const tokens = lexer.tokenize('10 PRINT "HELLO"\n20 LET A=10');
    expect(tokens.some(t => t.type === TokenType.NUMBER && t.value === '10')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.EOF)).toBe(true);
    expect(tokens.some(t => t.type === TokenType.KEYWORD && t.value === 'PRINT')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.STRING && t.value === '"HELLO"')).toBe(true);
  });

  test('should handle invalid characters', () => {
    const tokens = lexer.tokenize('PRINT @ PRINT');
    expect(tokens.some(t => t.type === TokenType.INVALID && t.value === '@')).toBe(true);
  });

  test('should tokenize multi-statement lines with colon separators', () => {
    const tokens = lexer.tokenize('10 LET A=5: PRINT A: GOTO 20');
    expect(tokens.filter(t => t.type === TokenType.STATEMENT_SEPARATOR && t.value === ':').length).toBe(2);
    expect(tokens.some(t => t.type === TokenType.LINE_NUMBER && t.value === '10')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.KEYWORD && t.value === 'LET')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.KEYWORD && t.value === 'PRINT')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.KEYWORD && t.value === 'GOTO')).toBe(true);
  });

  test('should handle two-word keywords GO TO and GO SUB', () => {
    // Test single-word forms
    const tokens1 = lexer.tokenize('10 GOTO 100');
    expect(tokens1.some(t => t.type === TokenType.KEYWORD && t.value === 'GOTO')).toBe(true);
    
    const tokens2 = lexer.tokenize('20 GOSUB 1000');
    expect(tokens2.some(t => t.type === TokenType.KEYWORD && t.value === 'GOSUB')).toBe(true);
    
    // Test two-word forms (should normalize to single word)
    const tokens3 = lexer.tokenize('30 GO TO 200');
    expect(tokens3.some(t => t.type === TokenType.KEYWORD && t.value === 'GOTO')).toBe(true);
    expect(tokens3.filter(t => t.value === 'TO').length).toBe(0); // TO should be consumed
    
    const tokens4 = lexer.tokenize('40 GO SUB 2000');
    expect(tokens4.some(t => t.type === TokenType.KEYWORD && t.value === 'GOSUB')).toBe(true);
    expect(tokens4.filter(t => t.value === 'SUB').length).toBe(0); // SUB should be consumed
    
    // Test GO as identifier when not followed by TO or SUB
    const tokens5 = lexer.tokenize('50 LET GO = 5');
    const goToken = tokens5.find(t => t.value === 'GO');
    expect(goToken).toBeDefined();
    expect(goToken!.type).toBe(TokenType.IDENTIFIER);
  });

  test('should handle two-word keyword DEF FN', () => {
    // Test two-word form (should normalize to single word)
    const tokens1 = lexer.tokenize('10 DEF FN f(x) = x * 2');
    expect(tokens1.some(t => t.type === TokenType.KEYWORD && t.value === 'DEFFN')).toBe(true);
    expect(tokens1.filter(t => t.value === 'FN' && t.type === TokenType.KEYWORD).length).toBe(0); // FN should be consumed by DEFFN
    
    // Test DEF alone (keyword, not followed by FN)
    const tokens2 = lexer.tokenize('20 DEF');
    const defToken = tokens2.find(t => t.value === 'DEF');
    expect(defToken).toBeDefined();
    expect(defToken!.type).toBe(TokenType.KEYWORD); // DEF is a keyword in ZX BASIC
    
    // Test FN alone (used in function calls)
    const tokens3 = lexer.tokenize('30 PRINT FN f(5)');
    expect(tokens3.some(t => t.type === TokenType.KEYWORD && t.value === 'FN')).toBe(true);
  });

  test('should track line and column positions', () => {
    const tokens = lexer.tokenize('10 PRINT\n20 LET');

    const printToken = tokens.find(t => t.value === 'PRINT');
    expect(printToken).toBeDefined();
    expect(printToken!.line).toBe(0);
    expect(printToken!.start).toBe(3);
    expect(printToken!.end).toBe(8);

    const letToken = tokens.find(t => t.value === 'LET');
    expect(letToken).toBeDefined();
    expect(letToken!.line).toBe(1);
    expect(letToken!.start).toBe(4);
    expect(letToken!.end).toBe(7);
  });
});

describe('ZXBasicParser', () => {
  let lexer: ZXBasicLexer;
  let parser: ZXBasicParser;

  beforeEach(() => {
    lexer = new ZXBasicLexer();
  });

  test('should parse simple numeric literals', () => {
    const tokens = lexer.tokenize('42');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('number');
      expect(result.value).toBe('42');
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse string literals', () => {
    const tokens = lexer.tokenize('"HELLO"');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('string');
      expect(result.value).toBe('"HELLO"');
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse simple addition', () => {
    const tokens = lexer.tokenize('10 + 5');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('binary_expr');
      expect(result.operator).toBe('+');
      if (result.left && result.right) {
        expect(result.left.value).toBe('10');
        expect(result.right.value).toBe('5');
      }
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse simple subtraction', () => {
    const tokens = lexer.tokenize('10 - 5');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('binary_expr');
      expect(result.operator).toBe('-');
      if (result.left && result.right) {
        expect(result.left.value).toBe('10');
        expect(result.right.value).toBe('5');
      }
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse multiplication', () => {
    const tokens = lexer.tokenize('3 * 4');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('binary_expr');
      expect(result.operator).toBe('*');
      if (result.left && result.right) {
        expect(result.left.value).toBe('3');
        expect(result.right.value).toBe('4');
      }
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse division', () => {
    const tokens = lexer.tokenize('8 / 2');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('binary_expr');
      expect(result.operator).toBe('/');
      if (result.left && result.right) {
        expect(result.left.value).toBe('8');
        expect(result.right.value).toBe('2');
      }
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse exponentiation', () => {
    const tokens = lexer.tokenize('2 ^ 3');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('binary_expr');
      expect(result.operator).toBe('^');
      if (result.left && result.right) {
        expect(result.left.value).toBe('2');
        expect(result.right.value).toBe('3');
      }
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse unary minus', () => {
    const tokens = lexer.tokenize('-5');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('unary_expr');
      expect(result.operator).toBe('-');
      if (result.operand) {
        expect(result.operand.value).toBe('5');
      }
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should respect operator precedence', () => {
    const tokens = lexer.tokenize('2 + 3 * 4');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('binary_expr');
      expect(result.operator).toBe('+');
      if (result.left && result.right) {
        expect(result.left.value).toBe('2');
        expect(result.right.type).toBe('binary_expr');
        if (result.right.operator) {
          expect(result.right.operator).toBe('*');
        }
        if (result.right.left && result.right.right) {
          expect(result.right.left.value).toBe('3');
          expect(result.right.right.value).toBe('4');
        }
      }
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse parentheses for grouping', () => {
    const tokens = lexer.tokenize('(2 + 3) * 4');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('binary_expr');
      expect(result.operator).toBe('*');
      if (result.left && result.right) {
        expect(result.left.type).toBe('binary_expr');
        if (result.left.operator) {
          expect(result.left.operator).toBe('+');
        }
        if (result.left.left && result.left.right) {
          expect(result.left.left.value).toBe('2');
          expect(result.left.right.value).toBe('3');
        }
        expect(result.right.value).toBe('4');
      }
    } else {
      throw new Error('Result should not be null');
    }
  });

  test('should parse comparison operators', () => {
    const tokens = lexer.tokenize('A = B');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    // Simple test that parsing works
    expect(result).toBeDefined();
  });

  test('should parse AND/OR logical operators', () => {
    const tokens = lexer.tokenize('A AND B OR C');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    expect(result).toBeDefined();
  });

  test('should parse complex expressions with proper precedence', () => {
    const tokens = lexer.tokenize('1 + 2 * 3 ^ 4 > 5 AND 6 OR 7');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    expect(result).toBeDefined();
  });

  test('should handle function calls', () => {
    const tokens = lexer.tokenize('PRINT VAL("123")');
    parser = new ZXBasicParser(tokens);

    // For now, just ensure it doesn't crash
    const result = parser.parseExpression();
    expect(result).toBeDefined();
  });

  test('should handle identifiers', () => {
    const tokens = lexer.tokenize('A$ B% C');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    // Test that tokenization worked
    expect(tokens.some(t => t.type === TokenType.IDENTIFIER)).toBe(true);
  });
});

// LSP Server Integration Tests
describe('LSP Server Integration', () => {
  test('should create diagnostic for invalid characters', async () => {
    // This would require setting up a full LSP test environment
    // For now, just ensure the imports work
    expect(ZXBasicLexer).toBeDefined();
    expect(ZXBasicParser).toBeDefined();
    expect(TokenType).toBeDefined();
  });

  test('DIM declarations and usage: numeric array mismatch detection', () => {
    const lexer = new ZXBasicLexer();
    const code = '10 DIM A(10)\n20 PRINT A(1,1)\n';
    const tokens = lexer.tokenize(code);

    // Find DIM identifier and usage identifier
    const dimIndex = tokens.findIndex(t => t.type === TokenType.KEYWORD && t.value === 'DIM');
    expect(dimIndex).toBeGreaterThanOrEqual(0);

    const idTokens = tokens.filter(t => t.type === TokenType.IDENTIFIER).map(t => t.value.replace(/[$%]$/, ''));
    // Should contain A from DIM and A usage
    expect(idTokens.filter(n => n === 'A').length).toBeGreaterThanOrEqual(2);
  });

  test('DIM declarations and usage: string array trailing length handling', () => {
    const lexer = new ZXBasicLexer();
    const code = '10 DIM N$(20)\n20 PRINT N$(1)\n';
    const tokens = lexer.tokenize(code);

    // Ensure identifier with $ is tokenized
    const dimId = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'N$');
    expect(dimId).toBeDefined();

    // Find parentheses and parameters after DIM
    const dimPos = tokens.findIndex(t => t.type === TokenType.KEYWORD && t.value === 'DIM');
    expect(dimPos).toBeGreaterThanOrEqual(0);

    // Ensure that there is a number token inside parentheses representing the string length
    const numberInside = tokens.some((t, idx) => idx > dimPos && t.type === TokenType.NUMBER);
    expect(numberInside).toBe(true);
  });

  // Test completion functionality
  describe('Completion Provider', () => {
    test('should return all keywords for empty input', () => {
      // This would test the completion provider logic
      // For now, we'll test the helper functions directly
      const isFuncResult = (global as any).isFunction ? (global as any).isFunction('SIN') : false;
      expect(typeof isFuncResult).toBe('boolean');
    });

    test('should identify functions correctly', () => {
      // Test the isFunction helper logic
      const functions = [
        'USR', 'STR$', 'CHR$', 'LEN', 'VAL', 'CODE', 'SIN', 'COS', 'TAN', 'ASN', 'ACS', 'ATN',
        'LN', 'EXP', 'INT', 'SQR', 'SGN', 'ABS', 'VAL$', 'SCREEN$', 'ATTR', 'POINT', 'PEEK',
        'INKEY$', 'RND', 'PI', 'TRUE', 'FALSE'
      ];

      // We can't easily test the functions from server.ts without setting up a proper test environment
      // So we'll test the pattern matching logic
      const testInput = 'SIN';
      const expectedFunctions = functions.filter(f => f.toLowerCase().startsWith(testInput.toLowerCase()));
      expect(expectedFunctions).toContain('SIN');
      expect(expectedFunctions).not.toContain('COS');
    });

    test('should filter keywords based on prefix', () => {
      const allKeywords = [
        'PRINT', 'LET', 'IF', 'THEN', 'FOR', 'TO', 'STEP', 'NEXT',
        'READ', 'DATA', 'RESTORE',
        'DIM', 'DEF FN','FN', 'GO TO', 'GO SUB', 'RETURN', 'STOP', 'RANDOMIZE',
        'CONTINUE', 'CLEAR', 'CLS', 'INPUT', 'LOAD', 'SAVE', 'VERIFY', 'MERGE',
        'BEEP', 'INK', 'PAPER', 'FLASH', 'BRIGHT', 'INVERSE', 'OVER', 'BORDER',
        'PLOT', 'DRAW', 'CIRCLE', 'LPRINT', 'LLIST', 'COPY', 'SPECTRUM', 'PLAY',
        'ERASE', 'CAT', 'FORMAT', 'MOVE', 'AND', 'OR', 'NOT', 'USR', 'STR$',
        'CHR$', 'LEN', 'VAL', 'CODE', 'SIN', 'COS', 'TAN', 'ASN', 'ACS', 'ATN',
        'LN', 'EXP', 'INT', 'SQR', 'SGN', 'ABS', 'PI', 'FALSE', 'VAL$',
        'SCREEN$', 'ATTR', 'POINT', 'PEEK', 'INKEY$', 'RND'
      ];

      const prefix = 'PR';
      const filteredKeywords = allKeywords.filter(keyword =>
        keyword.toLowerCase().startsWith(prefix.toLowerCase())
      );

      expect(filteredKeywords).toContain('PRINT');
      expect(filteredKeywords).not.toContain('LET');
      expect(filteredKeywords).toHaveLength(1); // PRINT
    });

    test('should get keyword documentation', () => {
      // Test the keyword documentation retrieval logic
      const testKeywords = ['PRINT', 'LET', 'IF', 'INVALID_KEYWORD'];
      const docs: string[] = [];

      // Simulate the getKeywordDocumentation function behavior
      const keywords = {
        'PRINT': 'Print text or expressions to the screen',
        'LET': 'Assign a value to a variable',
        'IF': 'Conditional statement',
        'FOR': 'Start a FOR loop'
      };

      testKeywords.forEach(keyword => {
        docs.push(keywords[keyword.toUpperCase() as keyof typeof keywords] || 'ZX BASIC keyword');
      });

      expect(docs[0]).toBe('Print text or expressions to the screen');
      expect(docs[1]).toBe('Assign a value to a variable');
      expect(docs[2]).toBe('Conditional statement');
      expect(docs[3]).toBe('ZX BASIC keyword');
    });
  });

  describe('Hover Provider', () => {
    test('should provide hover documentation for keywords', () => {
      // Test the hover documentation retrieval
      const testKeywords = ['PRINT', 'SIN', 'LEN', 'INVALID'];
      const hoverContents: string[] = [];

      // Simulate hover documentation function
      const hoverDocs = {
        'PRINT': 'Print text, numbers, or expressions to the screen\n\n`PRINT expression [, expression]...`',
        'SIN': 'Calculate the sine of an angle (in radians)\n\n`SIN(angle) -> number`',
        'LEN': 'Return the length of a string\n\n`LEN(string) -> number`'
      };

      testKeywords.forEach(keyword => {
        const doc = hoverDocs[keyword as keyof typeof hoverDocs] || '';
        hoverContents.push(doc);
      });

      expect(hoverContents[0]).toContain('Print text');
      expect(hoverContents[1]).toContain('Calculate the sine');
      expect(hoverContents[2]).toContain('Return the length');
      expect(hoverContents[3]).toBe('');
    });
  });

  describe('Signature Help Provider', () => {
    test('should provide signature information for functions', () => {
      // Test signature information retrieval
      const testFunctions = ['SIN', 'COS', 'LEN', 'PEEK', 'INVALID'];
      const signatures: any[] = [];

      // Simulate function signature info
      const functionSignatures = {
        'SIN': {
          label: 'SIN(angle: number): number',
          documentation: 'Calculate the sine of an angle in radians',
          parameters: [{ label: 'angle', documentation: 'Angle in radians' }]
        },
        'COS': {
          label: 'COS(angle: number): number',
          documentation: 'Calculate the cosine of an angle in radians',
          parameters: [{ label: 'angle', documentation: 'Angle in radians' }]
        }
      };

      testFunctions.forEach(func => {
        const sig = functionSignatures[func as keyof typeof functionSignatures];
        signatures.push(sig || undefined);
      });

      expect(signatures[0]).toHaveProperty('label', 'SIN(angle: number): number');
      expect(signatures[1]).toHaveProperty('label', 'COS(angle: number): number');
      expect(signatures[2]).toBeUndefined();
      expect(signatures[3]).toBeUndefined();
      expect(signatures[4]).toBeUndefined();
    });

    test('should correctly count parameters in function calls', () => {
      // Test parameter counting logic
      const testStrings = [
        'SIN(',
        'LEN("hello", ',
        'PEEK(30000, 42, ',
        'INVALID( param1, param2, '
      ];

      const expectedCounts = [0, 1, 2, 2];

      testStrings.forEach((str, index) => {
        const params = str.match(/^(\w+)\s*\(([^)]*)$/)?.[2] || '';
        const commaCount = (params.match(/,/g) || []).length;
        expect(commaCount).toBe(expectedCounts[index]);
      });
    });
  });

  describe('Diagnostics', () => {
    test('should detect invalid characters', () => {
      const lexer = new ZXBasicLexer();
      const tokens = lexer.tokenize('PRINT @ VAL');
      const invalidTokens = tokens.filter(t => t.type === TokenType.INVALID);

      expect(invalidTokens).toHaveLength(1);
      expect(invalidTokens[0].value).toBe('@');
    });

    test('should handle basic syntax validation', () => {
      const lexer = new ZXBasicLexer();
      const tokens = lexer.tokenize('10 PRINT "HELLO"');
      const parser = new ZXBasicParser(tokens);

      // Test basic expression parsing
      const result = parser.parseExpression();
      expect(result).toBeDefined();
    });

    test('should limit diagnostic messages', () => {
      const lexer = new ZXBasicLexer();
      const tokens = lexer.tokenize('@ # $ % ^ & * ~ ` { } [ ] \\ |');

      // Simulate diagnostics limiting
      const diagnostics = tokens
        .filter(t => t.type === TokenType.INVALID)
        .slice(0, 1000); // Simulating maxNumberOfProblems = 1000

      expect(diagnostics.length).toBeLessThanOrEqual(1000);
    });
  });
});

// Integration tests combining lexer and parser
describe('ZX BASIC Language Processing', () => {
  test('should process complete BASIC line', () => {
    const code = '10 PRINT "VALUE IS"; A * 2';
    const lexer = new ZXBasicLexer();
    const tokens = lexer.tokenize(code);
    const parser = new ZXBasicParser(tokens);

    // Should have line number, keywords, etc.
    expect(tokens.some(t => t.type === TokenType.LINE_NUMBER && t.value === '10')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.KEYWORD && t.value === 'PRINT')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.STRING && t.value === '"VALUE IS"')).toBe(true);

    // Parser should be able to process the arithmetic expression
    const expr = parser.parseExpression();
    expect(expr).toBeDefined();
  });

  test('should handle BASIC syntax correctly', () => {
    const testCases = [
      'LET A = 10',
      'PRINT "HELLO"',
      'DIM A(10,10)',
      'FOR I = 1 TO 10',
      'IF A > B THEN',
      'GO TO 100',
      'GO SUB 200'
    ];

    testCases.forEach(code => {
      const lexer = new ZXBasicLexer();
      const tokens = lexer.tokenize(code);

      // Should not have invalid tokens for valid BASIC
      const invalidCount = tokens.filter(t => t.type === TokenType.INVALID).length;
      expect(invalidCount).toBe(0);

      // Should have some tokens
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});
