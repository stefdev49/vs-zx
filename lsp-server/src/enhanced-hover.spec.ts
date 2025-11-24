import { ZXBasicLexer, TokenType } from './zxbasic';

describe('Enhanced Hover Information Tests', () => {
  const lexer = new ZXBasicLexer();

  const testCode = `10 DIM scores(10), names$(20)
20 LET player = "Alice"
30 LET count = 0
40 LET score$ = "High"
50 FOR i = 1 TO 10
60 PRINT "Line 60: info"
70 GOSUB 100
100 PRINT "Subroutine at 100"
110 RETURN`;

  function extractLineContents(code: string): Map<string, string> {
    const lines = code.split('\n');
    const lineContents = new Map<string, string>();
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        const lineNum = trimmed.match(/^\d+/);
        if (lineNum) {
          lineContents.set(lineNum[0], trimmed);
        }
      }
    }
    return lineContents;
  }

  function detectVariableTypes(code: string): Map<string, string> {
    const tokens = lexer.tokenize(code);
    const variables = new Map<string, string>();

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD && tokens[i].value.toUpperCase() === 'LET') {
        if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.IDENTIFIER) {
          const varName = tokens[i + 1].value.toLowerCase().replace(/\$?$/, '');
          if (tokens[i + 1].value.endsWith('$')) {
            variables.set(varName, 'String variable ($)');
          } else {
            variables.set(varName, 'Numeric variable');
          }
        }
      } else if (tokens[i].type === TokenType.KEYWORD && tokens[i].value.toUpperCase() === 'FOR') {
        if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.IDENTIFIER) {
          const varName = tokens[i + 1].value.toLowerCase().replace(/\$?$/, '');
          variables.set(varName, 'Numeric variable');
        }
      }
    }
    return variables;
  }

  function detectArrays(code: string): string[] {
    const tokens = lexer.tokenize(code);
    const arrays: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.IDENTIFIER && tokens[i].value.match(/[a-zA-Z_][a-zA-Z0-9_]*\$*$/)) {
        if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.PUNCTUATION && tokens[i + 1].value === '(') {
          arrays.push(tokens[i].value.toLowerCase().replace(/\$?$/, ''));
        }
      }
    }
    return arrays;
  }

  function detectKeywords(code: string): string[] {
    const tokens = lexer.tokenize(code);
    const keywords: string[] = [];
    const keywordSet = new Set(['PRINT', 'GOSUB', 'FOR', 'DIM']);

    for (const token of tokens) {
      if (token.type === TokenType.KEYWORD && keywordSet.has(token.value.toUpperCase())) {
        keywords.push(token.value.toUpperCase());
      }
    }
    return Array.from(new Set(keywords));
  }

  test('should extract line contents for hover information', () => {
    const lineContents = extractLineContents(testCode);
    expect(lineContents.get('100')).toBe('100 PRINT "Subroutine at 100"');
    expect(lineContents.get('60')).toBe('60 PRINT "Line 60: info"');
    expect(lineContents.get('30')).toBe('30 LET count = 0');
  });

  test('should detect variable types correctly', () => {
    const variableTypes = detectVariableTypes(testCode);
    expect(variableTypes.get('player')).toBe('Numeric variable');
    expect(variableTypes.get('count')).toBe('Numeric variable');
    expect(variableTypes.get('score')).toBe('String variable ($)');
    expect(variableTypes.get('i')).toBe('Numeric variable');
  });

  test('should detect arrays correctly', () => {
    const arrays = detectArrays(testCode);
    expect(arrays).toContain('scores');
    expect(arrays).toContain('names');
    expect(arrays.length).toBe(2);
  });

  test('should detect keywords for documentation hover', () => {
    const keywords = detectKeywords(testCode);
    expect(keywords).toContain('PRINT');
    expect(keywords).toContain('GOSUB');
    expect(keywords).toContain('FOR');
    expect(keywords).toContain('DIM');
    expect(keywords.length).toBe(4);
  });

  test('should handle line numbers not in code', () => {
    const lineContents = extractLineContents(testCode);
    expect(lineContents.has('999')).toBe(false);
    expect(lineContents.has('150')).toBe(false);
  });

  test('should provide hover info for goto targets', () => {
    const lineContents = extractLineContents(testCode);
    // When hovering over "100" in GOSUB 100, should show line content
    const targetLine = lineContents.get('100');
    expect(targetLine).toContain('Subroutine at 100');
  });
});
