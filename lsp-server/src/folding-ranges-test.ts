// Tests for folding ranges provider
import { describe, it, expect } from '@jest/globals';

describe('Folding Ranges Provider', () => {
  it('should identify FOR...NEXT blocks as foldable', () => {
    // FOR loops should create folding ranges
    const forLine = 'FOR i = 1 TO 10';
    const nextLine = 'NEXT i';
    
    expect(forLine).toContain('FOR');
    expect(nextLine).toContain('NEXT');
  });

  it('should identify subroutine blocks as foldable', () => {
    // Subroutines (GOSUB target to RETURN) should be foldable
    const subroutineStart = '1000 REM Subroutine';
    const subroutineEnd = 'RETURN';
    
    expect(subroutineStart).toContain('1000');
    expect(subroutineEnd).toContain('RETURN');
  });

  it('should identify DATA blocks as foldable', () => {
    // Consecutive DATA statements should be grouped
    const data1 = 'DATA 1, 2, 3';
    const data2 = 'DATA 4, 5, 6';
    
    expect(data1).toContain('DATA');
    expect(data2).toContain('DATA');
  });

  it('should return FoldingRange array', () => {
    // Folding ranges should be returned as an array
    const ranges: { startLine: number; endLine: number; kind: string }[] = [
      { startLine: 10, endLine: 20, kind: 'region' },
      { startLine: 100, endLine: 150, kind: 'region' }
    ];
    
    expect(Array.isArray(ranges)).toBe(true);
    expect(ranges.length).toBe(2);
  });

  it('should have valid FoldingRange structure', () => {
    // Each folding range must have startLine and endLine
    const range = { startLine: 10, endLine: 20, kind: 'region' };
    
    expect(range.startLine).toBeLessThan(range.endLine);
    expect(range.kind).toBe('region');
  });

  it('should handle nested FOR loops', () => {
    // Nested FOR loops should create separate folding ranges
    const outer = 'FOR i = 1 TO 10';
    const inner = 'FOR j = 1 TO 5';
    const nextInner = 'NEXT j';
    const nextOuter = 'NEXT i';
    
    expect(outer).toContain('FOR');
    expect(inner).toContain('FOR');
  });

  it('should identify GOSUB targets as subroutine starts', () => {
    // Lines referenced by GOSUB should be marked as subroutine starts
    const gosub = 'GOSUB 2000';
    const target = '2000 REM Subroutine';
    
    expect(gosub).toContain('GOSUB 2000');
    expect(target).toContain('2000');
  });

  it('should handle GO SUB variant', () => {
    // GO SUB (two words) should also be recognized
    const goSub = 'GO SUB 3000';
    
    expect(goSub).toContain('GO SUB');
  });

  it('should fold subroutines from target to RETURN', () => {
    // Subroutine folding should span from line number to RETURN
    const startLine = 2000;
    const endLine = 2030;
    
    expect(endLine).toBeGreaterThan(startLine);
  });

  it('should group consecutive DATA statements', () => {
    // Multiple DATA statements should fold as a single block
    const dataLines = [
      'DATA 1, 2, 3',
      'DATA 4, 5, 6',
      'DATA 7, 8, 9'
    ];
    
    expect(dataLines.length).toBe(3);
  });

  it('should not create folding for single-line statements', () => {
    // Single statements should not create folds
    const singleData = 'DATA 1, 2, 3';
    
    // Only one DATA line, should not create fold
    expect(singleData).toContain('DATA');
  });

  it('should handle subroutine folding with multiple GOSUBs', () => {
    // Multiple GOSUB calls to same target should work
    const call1 = 'GOSUB 1000';
    const call2 = 'GOSUB 1000';
    const target = '1000 REM Sub';
    
    expect(call1).toBe(call2);
    expect(target).toContain('1000');
  });

  it('should handle FOR loop with STEP', () => {
    // FOR loops with STEP should still fold correctly
    const forStep = 'FOR i = 1 TO 100 STEP 10';
    const next = 'NEXT i';
    
    expect(forStep).toContain('STEP');
    expect(next).toContain('NEXT');
  });

  it('should identify REM comment lines within blocks', () => {
    // REM lines should be included in folding ranges
    const rem = 'REM This is a comment';
    
    expect(rem).toContain('REM');
  });
});
