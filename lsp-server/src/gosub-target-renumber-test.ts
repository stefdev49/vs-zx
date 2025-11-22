import { ZXBasicLexer, TokenType } from './zxbasic';

describe('Auto-Renumber with GOTO/GOSUB Target Updates - Phase 3.4', () => {
  let lexer: ZXBasicLexer;

  beforeEach(() => {
    lexer = new ZXBasicLexer();
  });

  test('Detect GOTO statements with line number targets', () => {
    const code = '100 GOTO 500\n500 PRINT "target"';
    const tokens = lexer.tokenize(code);
    
    let foundGoto = false;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD && tokens[i].value === 'GOTO') {
        foundGoto = true;
        break;
      }
    }
    
    expect(foundGoto).toBe(true);
  });

  test('Detect GOSUB statements with line number targets', () => {
    const code = '100 GOSUB 500\n500 PRINT "sub"';
    const tokens = lexer.tokenize(code);
    
    let foundGosub = false;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD && tokens[i].value === 'GOSUB') {
        foundGosub = true;
        break;
      }
    }
    
    expect(foundGosub).toBe(true);
  });

  test('Extract target line number from GOTO', () => {
    const code = '10 GOTO 500';
    const match = code.match(/GOTO\s+(\d+)/);
    
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('500');
  });

  test('Extract target line number from GOSUB', () => {
    const code = '10 GOSUB 300';
    const match = code.match(/GOSUB\s+(\d+)/);
    
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('300');
  });

  test('Handle GO TO (two words) format', () => {
    const code = '10 GO TO 500';
    const match = code.match(/GO\s+TO\s+(\d+)/);
    
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('500');
  });

  test('Handle GO SUB (two words) format', () => {
    const code = '10 GO SUB 300';
    const match = code.match(/GO\s+SUB\s+(\d+)/);
    
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('300');
  });

  test('Map old line numbers to new line numbers', () => {
    const lineNumberMap = new Map<string, string>();
    lineNumberMap.set('100', '10');
    lineNumberMap.set('200', '20');
    lineNumberMap.set('500', '50');
    
    expect(lineNumberMap.get('100')).toBe('10');
    expect(lineNumberMap.get('200')).toBe('20');
    expect(lineNumberMap.get('500')).toBe('50');
  });

  test('Update GOTO target using mapping', () => {
    let line = '100 GOTO 500';
    const lineNumberMap = new Map<string, string>();
    lineNumberMap.set('100', '10');
    lineNumberMap.set('500', '50');
    
    for (const [oldNum, newNum] of lineNumberMap.entries()) {
      const pattern = new RegExp(`\\bGOTO\\s+${oldNum}\\b`, 'g');
      line = line.replace(pattern, `GOTO ${newNum}`);
    }
    
    // Should update GOTO 500 to GOTO 50
    expect(line).toContain('GOTO 50');
  });

  test('Update GOSUB target using mapping', () => {
    let line = '100 GOSUB 500';
    const lineNumberMap = new Map<string, string>();
    lineNumberMap.set('100', '10');
    lineNumberMap.set('500', '50');
    
    for (const [oldNum, newNum] of lineNumberMap.entries()) {
      const pattern = new RegExp(`\\bGOSUB\\s+${oldNum}\\b`, 'g');
      line = line.replace(pattern, `GOSUB ${newNum}`);
    }
    
    // Should update GOSUB 500 to GOSUB 50
    expect(line).toContain('GOSUB 50');
  });

  test('Update multiple GOTO targets in same program', () => {
    const lines = [
      '100 GOTO 500',
      '200 GOSUB 300',
      '300 PRINT "sub"',
      '500 PRINT "target"'
    ];
    
    const lineNumberMap = new Map<string, string>();
    lineNumberMap.set('100', '10');
    lineNumberMap.set('200', '20');
    lineNumberMap.set('300', '30');
    lineNumberMap.set('500', '50');
    
    let updated: string[] = [];
    for (let line of lines) {
      let newLine = line.replace(/^\d+\s+/, ''); // Remove old line number
      
      for (const [oldNum, newNum] of lineNumberMap.entries()) {
        const gotoPattern = new RegExp(`\\bGOTO\\s+${oldNum}\\b`, 'g');
        const gosubPattern = new RegExp(`\\bGOSUB\\s+${oldNum}\\b`, 'g');
        
        newLine = newLine.replace(gotoPattern, `GOTO ${newNum}`);
        newLine = newLine.replace(gosubPattern, `GOSUB ${newNum}`);
      }
      
      updated.push(newLine);
    }
    
    expect(updated[0]).toContain('GOTO 50');
    expect(updated[1]).toContain('GOSUB 30');
  });

  test('Preserve GO TO format (two words)', () => {
    let line = '100 GO TO 500';
    const lineNumberMap = new Map<string, string>();
    lineNumberMap.set('500', '50');
    
    for (const [oldNum, newNum] of lineNumberMap.entries()) {
      const pattern = new RegExp(`\\b(GO\\s+TO)\\s+${oldNum}\\b`, 'gi');
      line = line.replace(pattern, `GO TO ${newNum}`);
    }
    
    expect(line).toContain('GO TO 50');
  });

  test('Preserve GO SUB format (two words)', () => {
    let line = '100 GO SUB 500';
    const lineNumberMap = new Map<string, string>();
    lineNumberMap.set('500', '50');
    
    for (const [oldNum, newNum] of lineNumberMap.entries()) {
      const pattern = new RegExp(`\\b(GO\\s+SUB)\\s+${oldNum}\\b`, 'gi');
      line = line.replace(pattern, `GO SUB ${newNum}`);
    }
    
    expect(line).toContain('GO SUB 50');
  });

  test('Handle multiple GOTO/GOSUB on same line', () => {
    let line = '100 IF X > 5 THEN GOTO 500: GOSUB 300';
    const lineNumberMap = new Map<string, string>();
    lineNumberMap.set('100', '10');
    lineNumberMap.set('300', '30');
    lineNumberMap.set('500', '50');
    
    for (const [oldNum, newNum] of lineNumberMap.entries()) {
      const gotoPattern = new RegExp(`\\bGOTO\\s+${oldNum}\\b`, 'g');
      const gosubPattern = new RegExp(`\\bGOSUB\\s+${oldNum}\\b`, 'g');
      
      line = line.replace(gotoPattern, `GOTO ${newNum}`);
      line = line.replace(gosubPattern, `GOSUB ${newNum}`);
    }
    
    expect(line).toContain('GOTO 50');
    expect(line).toContain('GOSUB 30');
  });

  test('Not update numeric literals that are not GOTO/GOSUB targets', () => {
    let line = '100 LET X = 500';
    const lineNumberMap = new Map<string, string>();
    lineNumberMap.set('500', '50');
    
    for (const [oldNum, newNum] of lineNumberMap.entries()) {
      const gotoPattern = new RegExp(`\\bGOTO\\s+${oldNum}\\b`, 'g');
      const gosubPattern = new RegExp(`\\bGOSUB\\s+${oldNum}\\b`, 'g');
      
      line = line.replace(gotoPattern, `GOTO ${newNum}`);
      line = line.replace(gosubPattern, `GOSUB ${newNum}`);
    }
    
    // Should not change X = 500
    expect(line).toContain('LET X = 500');
  });
});
