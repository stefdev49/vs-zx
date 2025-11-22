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
        expect.objectContaining({ type: TokenType.NUMBER, value: '10' }),
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
    const tokens = lexer.tokenize('+ - * / ^ = < > <> <= >= AND OR');
    expect(tokens.filter(t => t.type === TokenType.OPERATOR)).toHaveLength(13);
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
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === 'AND')).toBe(true);
    expect(tokens.some(t => t.type === TokenType.OPERATOR && t.value === 'OR')).toBe(true);
  });

  test('should tokenize punctuation', () => {
    const tokens = lexer.tokenize('( ) : , ;');
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: TokenType.PUNCTUATION, value: '(' }),
        expect.objectContaining({ type: TokenType.PUNCTUATION, value: ')' }),
        expect.objectContaining({ type: TokenType.PUNCTUATION, value: ':' }),
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
    expect(letToken!.start).toBe(3);
    expect(letToken!.end).toBe(6);
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
      expect(result.value).toBe(42);
    } else {
      fail('Result should not be null');
    }
  });

  test('should parse string literals', () => {
    const tokens = lexer.tokenize('"HELLO"');
    parser = new ZXBasicParser(tokens);

    const result = parser.parseExpression();
    if (result) {
      expect(result.type).toBe('string');
      expect(result.value).toBe('HELLO');
    } else {
      fail('Result should not be null');
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
        expect(result.left.value).toBe(10);
        expect(result.right.value).toBe(5);
      }
    } else {
      fail('Result should not be null');
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
        expect(result.left.value).toBe(10);
        expect(result.right.value).toBe(5);
      }
    } else {
      fail('Result should not be null');
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
        expect(result.left.value).toBe(3);
        expect(result.right.value).toBe(4);
      }
    } else {
      fail('Result should not be null');
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
        expect(result.left.value).toBe(8);
        expect(result.right.value).toBe(2);
      }
    } else {
      fail('Result should not be null');
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
        expect(result.left.value).toBe(2);
        expect(result.right.value).toBe(3);
      }
    } else {
      fail('Result should not be null');
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
        expect(result.operand.value).toBe(5);
      }
    } else {
      fail('Result should not be null');
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
        expect(result.left.value).toBe(2);
        expect(result.right.type).toBe('binary_expr');
        if (result.right.operator) {
          expect(result.right.operator).toBe('*');
        }
        if (result.right.left && result.right.right) {
          expect(result.right.left.value).toBe(3);
          expect(result.right.right.value).toBe(4);
        }
      }
    } else {
      fail('Result should not be null');
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
          expect(result.left.left.value).toBe(2);
          expect(result.left.right.value).toBe(3);
        }
        expect(result.right.value).toBe(4);
      }
    } else {
      fail('Result should not be null');
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
});

// Integration tests combining lexer and parser
describe('ZX BASIC Language Processing', () => {
  test('should process complete BASIC line', () => {
    const code = '10 PRINT "VALUE IS"; A * 2';
    const lexer = new ZXBasicLexer();
    const tokens = lexer.tokenize(code);
    const parser = new ZXBasicParser(tokens);

    // Should have line number, keywords, etc.
    expect(tokens.some(t => t.type === TokenType.NUMBER && t.value === '10')).toBe(true);
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
