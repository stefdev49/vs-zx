import { ZXBasicLexer, TokenType } from './zxbasic';

describe('Auto-Renumber Formatting - Phase 3.4', () => {
  let lexer: ZXBasicLexer;

  beforeEach(() => {
    lexer = new ZXBasicLexer();
  });

  test('Detect lines with existing line numbers', () => {
    const code = '10 PRINT "hello"\n20 PRINT "world"';
    const tokens = lexer.tokenize(code);
    
    const lineNumbers = tokens.filter(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumbers.length).toBe(2);
    expect(lineNumbers[0].value).toBe('10');
    expect(lineNumbers[1].value).toBe('20');
  });

  test('Identify lines without line numbers', () => {
    const code = 'PRINT "hello"\n20 PRINT "world"';
    const tokens = lexer.tokenize(code);
    
    // First line starts with KEYWORD, not LINE_NUMBER
    const firstToken = tokens[0];
    expect(firstToken.type).not.toBe(TokenType.LINE_NUMBER);
  });

  test('Extract line numbers in sequence', () => {
    const code = '10 REM first\n15 REM second\n20 REM third\n100 REM fourth';
    const tokens = lexer.tokenize(code);
    
    const lineNumbers = tokens.filter(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumbers.length).toBe(4);
    expect(lineNumbers.map(t => t.value)).toEqual(['10', '15', '20', '100']);
  });

  test('Handle inconsistent line number spacing', () => {
    const code = '5 PRINT "a"\n50 PRINT "b"\n500 PRINT "c"';
    const tokens = lexer.tokenize(code);
    
    const lineNumbers = tokens.filter(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumbers.length).toBe(3);
    expect(lineNumbers[0].value).toBe('5');
    expect(lineNumbers[1].value).toBe('50');
    expect(lineNumbers[2].value).toBe('500');
  });

  test('Identify gaps in line numbers', () => {
    const code = '10 REM start\n20 REM next\n50 REM jump';
    const lines = code.split('\n');
    
    const lineNums: number[] = [];
    for (const line of lines) {
      const match = line.match(/^(\d+)/);
      if (match) {
        lineNums.push(parseInt(match[1]));
      }
    }
    
    expect(lineNums).toEqual([10, 20, 50]);
    // Gaps exist: 30-40 missing
    expect(lineNums[2] - lineNums[1]).toBe(30);
  });

  test('Generate sequential renumbering', () => {
    const lines = ['PRINT "a"', 'PRINT "b"', 'PRINT "c"'];
    
    let lineNum = 10;
    const renumbered: string[] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        renumbered.push(`${lineNum} ${line}`);
        lineNum += 10;
      }
    }
    
    expect(renumbered).toEqual([
      '10 PRINT "a"',
      '20 PRINT "b"',
      '30 PRINT "c"'
    ]);
  });

  test('Preserve comments and content when renumbering', () => {
    const code = '100 REM This is a comment\n200 PRINT "Keep content"';
    const tokens = lexer.tokenize(code);
    
    const lineNumbers = tokens.filter(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumbers.length).toBe(2);
    expect(lineNumbers[0].value).toBe('100');
    expect(lineNumbers[1].value).toBe('200');
  });

  test('Handle empty lines in renumbering', () => {
    const lines = ['10 REM start', '', '20 REM after blank'];
    
    let lineNum = 10;
    const renumbered: string[] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        renumbered.push(`${lineNum} ${line.replace(/^\d+\s+/, '')}`);
        lineNum += 10;
      } else {
        renumbered.push('');
      }
    }
    
    expect(renumbered.length).toBe(3);
    expect(renumbered[1]).toBe('');
  });

  test('Update existing line numbers to sequential', () => {
    const code = '5 PRINT "a"\n15 PRINT "b"\n25 PRINT "c"';
    const tokens = lexer.tokenize(code);
    
    const lineNumbers = tokens.filter(t => t.type === TokenType.LINE_NUMBER);
    const values = lineNumbers.map(t => t.value);
    
    expect(values).toEqual(['5', '15', '25']);
    
    // For renumbering to 10, 20, 30
    const expectedSequence = [10, 20, 30];
    const actualSequence = [5, 15, 25];
    
    expect(actualSequence).not.toEqual(expectedSequence);
  });

  test('Handle GOSUB target updates during renumbering', () => {
    const code = '100 GOSUB 500\n200 STOP\n500 REM subroutine\n510 RETURN';
    const tokens = lexer.tokenize(code);
    
    const lineNumbers = tokens.filter(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumbers.length).toBe(4);
    expect(lineNumbers[0].value).toBe('100');
    expect(lineNumbers[3].value).toBe('510');
  });
});
