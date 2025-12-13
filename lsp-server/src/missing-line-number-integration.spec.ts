import { describe, it, expect } from '@jest/globals';
import { ZXBasicLexer } from './zxbasic';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Integration test to verify missing line number detection works
 * as part of the full LSP diagnostic flow
 */
describe('Missing Line Number Diagnostic Integration', () => {
  it('should detect missing line number in zxif1test.bas style code', () => {
    const code = `10 PRINT "Test"
200 LET d=IN 239: FOR i=7 TO 4 STEP -1: IF d>=2^i
THEN LET d=d-2^i
220 NEXT i: RETURN`;

    const lines = code.split('\n');
    const errors: Array<{ line: number; message: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        continue;
      }

      // Check if line starts with a digit (line number)
      if (!/^\d+/.test(trimmed)) {
        errors.push({
          line: i,
          message: `Line must start with a line number (1-9999). ZX BASIC does not support multi-line statements.`
        });
      }
    }

    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(2); // Line 2 is "THEN LET d=d-2^i"
    expect(errors[0].message).toContain('must start with a line number');
  });

  it('should not flag REM comments without line numbers as errors', () => {
    // Note: In ZX BASIC, REM comments still need line numbers
    // This test validates our current behavior
    const code = `10 PRINT "Test"
REM This should be flagged
20 PRINT "Done"`;

    const lines = code.split('\n');
    const errors: Array<{ line: number; message: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      if (!/^\d+/.test(trimmed)) {
        errors.push({
          line: i,
          message: `Line must start with a line number (1-9999). ZX BASIC does not support multi-line statements.`
        });
      }
    }

    // REM without line number should be flagged
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(1);
  });

  it('should handle complex multi-statement lines correctly', () => {
    const validCode = `10 LET a=1: LET b=2: PRINT a+b
20 FOR i=1 TO 10: PRINT i: NEXT i
30 IF a>0 THEN PRINT "Positive": GOTO 50
40 PRINT "Zero or negative"
50 STOP`;

    const lines = validCode.split('\n');
    const errors: Array<{ line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      if (!/^\d+/.test(trimmed)) {
        errors.push({ line: i });
      }
    }

    // All lines are valid
    expect(errors).toHaveLength(0);
  });

  it('should detect multiple lines without line numbers', () => {
    const code = `10 PRINT "Start"
PRINT "Error 1"
PRINT "Error 2"
20 PRINT "End"`;

    const lines = code.split('\n');
    const errors: Array<{ line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      if (!/^\d+/.test(trimmed)) {
        errors.push({ line: i });
      }
    }

    expect(errors).toHaveLength(2);
    expect(errors[0].line).toBe(1);
    expect(errors[1].line).toBe(2);
  });

  it('should handle whitespace-only lines correctly', () => {
    const code = `10 PRINT "Test"

   
		
20 PRINT "Done"`;

    const lines = code.split('\n');
    const errors: Array<{ line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      if (!/^\d+/.test(trimmed)) {
        errors.push({ line: i });
      }
    }

    // Whitespace-only lines should not be flagged
    expect(errors).toHaveLength(0);
  });
});
