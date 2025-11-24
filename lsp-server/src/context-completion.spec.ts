import { ZXBasicLexer, TokenType } from './zxbasic';

describe('Context-Aware Line Number Completion Tests', () => {
  const lexer = new ZXBasicLexer();
  const testCode = `10 PRINT "Start"
20 FOR I = 1 TO 5
30 PRINT I
40 NEXT I
50 GOSUB 100
60 GOTO 10

100 PRINT "Subroutine"
110 RETURN

120 REM Another section
130 STOP`;

  function extractLineNumbers(code: string): string[] {
    const tokens = lexer.tokenize(code);
    const lineNumbers = new Set<string>();
    for (const token of tokens) {
      if (token.type === TokenType.LINE_NUMBER) {
        lineNumbers.add(token.value);
      }
    }
    return Array.from(lineNumbers).sort((a, b) => parseInt(a) - parseInt(b));
  }

  function getCompletionMatches(sortedLineNumbers: string[], prefix: string): string[] {
    if (!prefix) return sortedLineNumbers;
    return sortedLineNumbers.filter(ln => ln.startsWith(prefix));
  }

  test('should extract and sort line numbers correctly', () => {
    const sortedLineNumbers = extractLineNumbers(testCode);
    expect(sortedLineNumbers).toEqual(['10', '20', '30', '40', '50', '60', '100', '110', '120', '130']);
  });

  test('should extract exactly 10 line numbers', () => {
    const lineNumbers = extractLineNumbers(testCode);
    expect(lineNumbers).toHaveLength(10);
  });

  const contextTests = [
    {
      linePrefix: '70 GOTO 1',
      expectedPrefix: '1',
      context: 'GOTO',
      expectedMatches: ['10', '100', '110', '120', '130']
    },
    {
      linePrefix: '80 GOSUB ',
      expectedPrefix: '',
      context: 'GOSUB',
      expectedMatches: ['10', '20', '30', '40', '50', '60', '100', '110', '120', '130']
    },
    {
      linePrefix: '90 RUN 5',
      expectedPrefix: '5',
      context: 'RUN',
      expectedMatches: ['50']
    },
    {
      linePrefix: '95 LIST 10',
      expectedPrefix: '10',
      context: 'LIST',
      expectedMatches: ['10', '100']
    },
    {
      linePrefix: '100 LET A = 5',
      expectedPrefix: '',
      context: 'Regular assignment (no context)',
      expectedMatches: ['10', '20', '30', '40', '50', '60', '100', '110', '120', '130']
    }
  ];

  test.each(contextTests)('should provide correct completion matches for $context', ({
    expectedPrefix,
    expectedMatches
  }) => {
    const sortedLineNumbers = extractLineNumbers(testCode);
    const matches = getCompletionMatches(sortedLineNumbers, expectedPrefix);
    expect(matches).toEqual(expectedMatches);
  });

  test('should handle no line numbers in code', () => {
    const emptyCode = `PRINT "No line numbers"`;
    const lineNumbers = extractLineNumbers(emptyCode);
    expect(lineNumbers).toEqual([]);
  });

  test('should handle single line number', () => {
    const singleLineCode = `10 PRINT "Single"`;
    const lineNumbers = extractLineNumbers(singleLineCode);
    expect(lineNumbers).toEqual(['10']);
  });
});
