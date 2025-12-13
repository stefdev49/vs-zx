import { describe, it, expect } from '@jest/globals';
import { ZXBasicLexer } from './zxbasic';

describe('Missing Line Number Detection', () => {
  const lexer = new ZXBasicLexer();

  it('should detect lines without line numbers', () => {
    const program = `10 PRINT "Hello"
PRINT "Missing line number"
30 PRINT "World"`;
    
    const lines = program.split('\n');
    const linesWithoutNumbers: number[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed && !/^\d+/.test(trimmed)) {
        linesWithoutNumbers.push(i);
      }
    }
    
    expect(linesWithoutNumbers).toHaveLength(1);
    expect(linesWithoutNumbers[0]).toBe(1); // Line index 1 (second line)
  });

  it('should allow empty lines', () => {
    const program = `10 PRINT "Hello"

30 PRINT "World"`;
    
    const lines = program.split('\n');
    const linesWithoutNumbers: number[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed && !/^\d+/.test(trimmed)) {
        linesWithoutNumbers.push(i);
      }
    }
    
    expect(linesWithoutNumbers).toHaveLength(0);
  });

  it('should detect multi-line statement split incorrectly', () => {
    // Simulating the issue from zxif1test.bas
    const program = `200 LET d=IN 239: FOR i=7 TO 4 STEP -1: IF d>=2^i
THEN LET d=d-2^i
220 NEXT i: LET d=(d>7): RETURN`;
    
    const lines = program.split('\n');
    const linesWithoutNumbers: number[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed && !/^\d+/.test(trimmed)) {
        linesWithoutNumbers.push(i);
      }
    }
    
    expect(linesWithoutNumbers).toHaveLength(1);
    expect(linesWithoutNumbers[0]).toBe(1); // "THEN LET d=d-2^i" line
  });

  it('should accept valid program with all line numbers', () => {
    const program = `10 PRINT "Hello"
20 LET a=5
30 GOTO 10`;
    
    const lines = program.split('\n');
    const linesWithoutNumbers: number[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed && !/^\d+/.test(trimmed)) {
        linesWithoutNumbers.push(i);
      }
    }
    
    expect(linesWithoutNumbers).toHaveLength(0);
  });
});
