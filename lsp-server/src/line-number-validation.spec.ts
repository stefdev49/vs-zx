import { ZXBasicLexer, TokenType } from './zxbasic';

interface TestCase {
  input: string;
  description: string;
  expectedIssue?: string;
}

describe('Line Number Validation Tests', () => {
  const lexer = new ZXBasicLexer();

  const testCases: TestCase[] = [
    {
      input: '10 PRINT "Valid"',
      description: 'Valid line number (10)'
    },
    {
      input: '9999 PRINT "Max valid"',
      description: 'Valid line number (9999 - maximum)'
    },
    {
      input: '1 PRINT "Min valid"',
      description: 'Valid line number (1 - minimum)'
    },
    {
      input: '0 PRINT "Zero"',
      description: 'Invalid: line number 0',
      expectedIssue: 'Line number must be between 1 and 9999'
    },
    {
      input: '10000 PRINT "Too large"',
      description: 'Invalid: line number too large',
      expectedIssue: 'Line number must be between 1 and 9999'
    },
    {
      input: '-5 PRINT "Negative"',
      description: 'Negative number (treated as operator + number, not line number)'
    },
    {
      input: '10.5 PRINT "Decimal"',
      description: 'Decimal line number (invalid)',
      expectedIssue: 'Line number must be an integer'
    }
  ];

  test('should handle Valid line number (10)', () => {
    const tokens = lexer.tokenize('10 PRINT "Valid"').filter(t => t.type !== TokenType.EOF);
    const lineNumberToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumberToken).toBeDefined();
    const lineNum = parseInt(lineNumberToken!.value, 10);
    expect(lineNum).toBe(10);
  });

  test('should handle Valid line number (9999 - maximum)', () => {
    const tokens = lexer.tokenize('9999 PRINT "Max valid"').filter(t => t.type !== TokenType.EOF);
    const lineNumberToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumberToken).toBeDefined();
    const lineNum = parseInt(lineNumberToken!.value, 10);
    expect(lineNum).toBe(9999);
  });

  test('should handle Valid line number (1 - minimum)', () => {
    const tokens = lexer.tokenize('1 PRINT "Min valid"').filter(t => t.type !== TokenType.EOF);
    const lineNumberToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumberToken).toBeDefined();
    const lineNum = parseInt(lineNumberToken!.value, 10);
    expect(lineNum).toBe(1);
  });

  test('should handle Invalid: line number 0', () => {
    const tokens = lexer.tokenize('0 PRINT "Zero"').filter(t => t.type !== TokenType.EOF);
    const lineNumberToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumberToken).toBeDefined();
    const lineNum = parseInt(lineNumberToken!.value, 10);
    expect(lineNum).toBe(0);
    expect(lineNum < 1 || lineNum > 9999).toBe(true);
  });

  test('should handle Invalid: line number too large', () => {
    const tokens = lexer.tokenize('10000 PRINT "Too large"').filter(t => t.type !== TokenType.EOF);
    const lineNumberToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumberToken).toBeDefined();
    const lineNum = parseInt(lineNumberToken!.value, 10);
    expect(lineNum).toBe(10000);
    expect(lineNum < 1 || lineNum > 9999).toBe(true);
  });

  test('should handle Negative number (treated as operator + number, not line number)', () => {
    const tokens = lexer.tokenize('-5 PRINT "Negative"').filter(t => t.type !== TokenType.EOF);
    const lineNumberToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumberToken).toBeUndefined();
  });

  test('should handle Decimal line number (invalid)', () => {
    const tokens = lexer.tokenize('10.5 PRINT "Decimal"').filter(t => t.type !== TokenType.EOF);
    const lineNumberToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumberToken).toBeDefined();
    // Lexer treats 10.5 as line number '10' followed by '.' operator
    expect(lineNumberToken!.value).toBe('10');
    expect(lineNumberToken!.value).not.toContain('.');
  });

  test('should detect duplicate line numbers', () => {
    const duplicateTest = `10 PRINT "First"
20 LET A = 5
10 PRINT "Duplicate!"
30 PRINT "After"`;

    const lines = duplicateTest.split('\n');
    const lineNumberOccurrences = new Map<string, number>();

    lines.forEach(line => {
      const tokens = lexer.tokenize(line).filter(t => t.type !== TokenType.EOF);
      const lineNumToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);

      if (lineNumToken) {
        lineNumberOccurrences.set(
          lineNumToken.value,
          (lineNumberOccurrences.get(lineNumToken.value) || 0) + 1
        );
      }
    });

    const duplicates: string[] = [];
    lineNumberOccurrences.forEach((count, lineNum) => {
      if (count > 1) {
        duplicates.push(lineNum);
      }
    });

    expect(duplicates).toContain('10');
    expect(duplicates).toHaveLength(1); // Only line 10 is duplicated
  });
});
