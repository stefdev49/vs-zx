// Tests for folding ranges provider
import { describe, it, expect } from '@jest/globals';

// Local implementation for testing (without LSP connection)
export function getFoldingRanges(text: string): { startLine: number; endLine: number; kind: string }[] {
  const lines = text.split('\n');
  const foldingRanges: { startLine: number; endLine: number; kind: string }[] = [];

  // Track FOR loops
  const forStack: { keyword: string; startLine: number }[] = [];

  // Track GOSUB subroutines
  const subroutines: { startLine: number; lineNumber: string }[] = [];
  const gosubTargets = new Set<string>();

  // First pass: collect GOSUB targets
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumMatch = line.match(/^(\d+)\s+/);
    if (lineNumMatch) {
      const lineNum = lineNumMatch[1];

      // Check for GOSUB/GO SUB calls
      if (/\b(GOSUB|GO\s+SUB)\s+(\d+)/i.test(line)) {
        const targetMatch = line.match(/\b(GOSUB|GO\s+SUB)\s+(\d+)/i);
        if (targetMatch) {
          gosubTargets.add(targetMatch[2]);
        }
      }
    }
  }

  // Second pass: identify folding ranges
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumMatch = line.match(/^(\d+)\s+/);
    const lineNum = lineNumMatch ? lineNumMatch[1] : null;
    const upperLine = line.toUpperCase();

    // FOR...NEXT folding
    if (/\bFOR\s+/i.test(upperLine)) {
      forStack.push({ keyword: 'FOR', startLine: i });
    } else if (/\bNEXT\b/i.test(upperLine)) {
      if (forStack.length > 0) {
        const forLoop = forStack.pop();
        if (forLoop) {
          foldingRanges.push({
            startLine: forLoop.startLine,
            endLine: i,
            kind: 'region'
          });
        }
      }
    }

    // GOSUB subroutine folding
    if (lineNum && gosubTargets.has(lineNum)) {
      // This line number is a subroutine target
      subroutines.push({ startLine: i, lineNumber: lineNum });
    }
  }

  // Create folding ranges for subroutines (GOSUB target to RETURN)
  for (const subroutine of subroutines) {
    // Find the next RETURN after this subroutine
    let endLine = subroutine.startLine;
    for (let i = subroutine.startLine + 1; i < lines.length; i++) {
      if (/\bRETURN\b/i.test(lines[i].toUpperCase())) {
        endLine = i;
        break;
      }

      // Stop at next subroutine target
      const nextLineMatch = lines[i].match(/^(\d+)\s+/);
      if (nextLineMatch && gosubTargets.has(nextLineMatch[1])) {
        endLine = i - 1;
        break;
      }
    }

    if (endLine > subroutine.startLine) {
      foldingRanges.push({
        startLine: subroutine.startLine,
        endLine: endLine,
        kind: 'region'
      });
    }
  }

  // DATA block folding (consecutive DATA statements)
  let dataStart: number | null = null;
  let lastDataLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const upperLine = lines[i].toUpperCase();

    if (/\bDATA\b/i.test(upperLine)) {
      if (dataStart === null) {
        dataStart = i;
      }
      lastDataLine = i;
    } else if (dataStart !== null && i > lastDataLine) {
      // End of DATA block
      if (lastDataLine > dataStart) {
        foldingRanges.push({
          startLine: dataStart,
          endLine: lastDataLine,
          kind: 'region'
        });
      }
      dataStart = null;
    }
  }

  // Handle final DATA block if exists
  if (dataStart !== null && lastDataLine > dataStart) {
    foldingRanges.push({
      startLine: dataStart,
      endLine: lastDataLine,
      kind: 'region'
    });
  }

  return foldingRanges;
}

describe('Folding Ranges Provider', () => {
  describe('FOR...NEXT loop folding', () => {
    it('should identify simple FOR...NEXT blocks as foldable', () => {
      const code = [
        '10 FOR i = 1 TO 10',
        '20 PRINT i',
        '30 NEXT i'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startLine: 0,
        endLine: 2,
        kind: 'region'
      });
    });

    it('should handle nested FOR loops', () => {
      const code = [
        '10 FOR i = 1 TO 3',
        '20 FOR j = 1 TO 2',
        '30 PRINT i, j',
        '40 NEXT j',
        '50 NEXT i'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(2);
      // Inner loop (j)
      expect(ranges[0]).toEqual({
        startLine: 1,
        endLine: 3,
        kind: 'region'
      });
      // Outer loop (i)
      expect(ranges[1]).toEqual({
        startLine: 0,
        endLine: 4,
        kind: 'region'
      });
    });

    it('should handle FOR loops with STEP', () => {
      const code = [
        '10 FOR i = 1 TO 100 STEP 10',
        '20 PRINT i',
        '30 NEXT i'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startLine: 0,
        endLine: 2,
        kind: 'region'
      });
    });

    it('should handle FOR loop with variable name in NEXT', () => {
      const code = [
        '10 FOR counter = 1 TO 5',
        '20 PRINT "Count: " counter',
        '30 NEXT counter'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startLine: 0,
        endLine: 2,
        kind: 'region'
      });
    });
  });

  describe('GOSUB subroutine folding', () => {
    it('should fold subroutines from GOSUB target to RETURN', () => {
      const code = [
        '10 GOSUB 100',
        '20 PRINT "Back from subroutine"',
        '30 END',
        '100 PRINT "In subroutine"',
        '110 RETURN'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startLine: 3, // Line 100 starts at index 3
        endLine: 4,   // RETURN is at index 4
        kind: 'region'
      });
    });

    it('should handle GO SUB variant', () => {
      const code = [
        '10 GO SUB 200',
        '20 PRINT "Back"',
        '30 END',
        '200 PRINT "Subroutine"',
        '210 RETURN'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startLine: 3,
        endLine: 4,
        kind: 'region'
      });
    });

    it('should handle multiple GOSUB calls to same target', () => {
      const code = [
        '10 GOSUB 100',
        '20 GOSUB 100',
        '30 END',
        '100 PRINT "Subroutine"',
        '110 RETURN'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startLine: 3,
        endLine: 4,
        kind: 'region'
      });
    });

    it('should handle subroutine folding with multiple GOSUB targets', () => {
      const code = [
        '10 GOSUB 200',
        '20 GOSUB 300',
        '30 END',
        '200 PRINT "First subroutine"',
        '210 RETURN',
        '300 PRINT "Second subroutine"',
        '310 RETURN'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(2);

      // Sort ranges by start line to ensure consistent ordering
      ranges.sort((a, b) => a.startLine - b.startLine);

      expect(ranges[0]).toEqual({
        startLine: 3, // Line 200
        endLine: 4,   // RETURN at line 210
        kind: 'region'
      });
      expect(ranges[1]).toEqual({
        startLine: 5, // Line 300
        endLine: 6,   // RETURN at line 310
        kind: 'region'
      });
    });
  });

  describe('DATA block folding', () => {
    it('should group consecutive DATA statements', () => {
      const code = [
        '10 READ a, b',
        '20 DATA 1, 2',
        '30 DATA 3, 4',
        '40 DATA 5, 6',
        '50 PRINT a, b'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startLine: 1, // First DATA at index 1
        endLine: 3,   // Last DATA at index 3
        kind: 'region'
      });
    });

    it('should not create folding for single DATA statement', () => {
      const code = [
        '10 READ a',
        '20 DATA 42',
        '30 PRINT a'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(0); // Single DATA shouldn't fold
    });

    it('should handle non-consecutive DATA blocks', () => {
      const code = [
        '10 READ a',
        '20 DATA 1',
        '30 PRINT "Middle"',
        '40 DATA 2',
        '50 DATA 3',
        '60 PRINT a'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      // Should only fold the consecutive DATA at lines 40-50
      expect(ranges[0]).toEqual({
        startLine: 3, // Line 40 at index 3
        endLine: 4,   // Line 50 at index 4
        kind: 'region'
      });
    });
  });

  describe('Complex scenarios', () => {
    it('should handle FOR loops within subroutines', () => {
      const code = [
        '10 GOSUB 100',
        '20 END',
        '100 FOR i = 1 TO 3',
        '110 PRINT i',
        '120 NEXT i',
        '130 RETURN'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(2);

      // Sort by start line
      ranges.sort((a, b) => a.startLine - b.startLine);

      expect(ranges[0]).toEqual({
        startLine: 2, // FOR loop starts at index 2
        endLine: 4,   // NEXT at index 4
        kind: 'region'
      });
      expect(ranges[1]).toEqual({
        startLine: 2, // Subroutine starts at index 2
        endLine: 5,   // RETURN at index 5
        kind: 'region'
      });
    });

    it('should handle all folding types together', () => {
      const code = [
        '10 FOR x = 1 TO 2',
        '20 GOSUB 100',
        '30 NEXT x',
        '40 DATA 1, 2',
        '50 DATA 3, 4',
        '60 END',
        '100 PRINT "Subroutine"',
        '110 RETURN'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(3);

      // Sort by start line
      ranges.sort((a, b) => a.startLine - b.startLine);

      expect(ranges[0]).toEqual({
        startLine: 0, // FOR loop starts at index 0
        endLine: 2,   // NEXT at index 2
        kind: 'region'
      });
      expect(ranges[1]).toEqual({
        startLine: 3, // DATA block starts at index 3
        endLine: 4,   // DATA block ends at index 4
        kind: 'region'
      });
      expect(ranges[2]).toEqual({
        startLine: 6, // Subroutine starts at index 6
        endLine: 7,   // RETURN at index 7
        kind: 'region'
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const ranges = getFoldingRanges('');
      expect(ranges).toEqual([]);
    });

    it('should handle single line programs', () => {
      const code = '10 PRINT "Hello"';
      const ranges = getFoldingRanges(code);
      expect(ranges).toEqual([]);
    });

    it('should handle programs without line numbers', () => {
      const code = [
        'FOR i = 1 TO 10',
        'PRINT i',
        'NEXT i'
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startLine: 0,
        endLine: 2,
        kind: 'region'
      });
    });

    it('should handle incomplete FOR loops', () => {
      const code = [
        '10 FOR i = 1 TO 10',
        '20 PRINT i'
        // Missing NEXT
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toEqual([]); // Incomplete loop shouldn't fold
    });

    it('should handle incomplete subroutines', () => {
      const code = [
        '10 GOSUB 100',
        '20 END',
        '100 PRINT "Subroutine"'
        // Missing RETURN
      ].join('\n');

      const ranges = getFoldingRanges(code);
      expect(ranges).toEqual([]); // Incomplete subroutine shouldn't fold
    });
  });
});
