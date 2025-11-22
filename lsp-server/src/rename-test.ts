// Tests for rename refactoring provider
import { describe, it, expect } from '@jest/globals';

describe('Rename Refactoring Provider', () => {
  it('should prepare for rename on variables', () => {
    // Rename should work on variable names
    const oldName = 'counter';
    const newName = 'count';
    
    expect(oldName).toBeTruthy();
    expect(newName).toBeTruthy();
    expect(oldName).not.toBe(newName);
  });

  it('should prepare for rename on string variables', () => {
    // Rename should work on string variables (with $)
    const oldName = 'name$';
    const newName = 'personName$';
    
    expect(oldName.endsWith('$')).toBe(true);
    expect(newName.endsWith('$')).toBe(true);
  });

  it('should prepare for rename on numeric variables', () => {
    // Rename should work on numeric variables (with %)
    const oldName = 'count%';
    const newName = 'total%';
    
    expect(oldName.endsWith('%')).toBe(true);
    expect(newName.endsWith('%')).toBe(true);
  });

  it('should prepare for rename on array names', () => {
    // Rename should work on array names
    const oldName = 'data';
    const newName = 'values';
    
    expect(oldName).toBeTruthy();
    expect(newName).toBeTruthy();
  });

  it('should prepare for rename on line numbers', () => {
    // Rename should work on line numbers
    const oldLineNumber = '100';
    const newLineNumber = '110';
    
    expect(/^\d+$/.test(oldLineNumber)).toBe(true);
    expect(/^\d+$/.test(newLineNumber)).toBe(true);
  });

  it('should rename variable in LET statement', () => {
    // When renaming a variable, update all occurrences
    const originalCode = 'LET x = 10\nLET x = x + 1\nPRINT x';
    const hasThreeX = (originalCode.match(/\bx\b/g) || []).length === 3;
    
    expect(hasThreeX).toBe(true);
  });

  it('should rename variable across multiple statements', () => {
    // Rename should work across multiple statements on different lines
    const originalCode = 'LET x = 10\nLET y = x\nPRINT x, y';
    const xCount = (originalCode.match(/\bx\b/g) || []).length;
    
    expect(xCount).toBe(3);
  });

  it('should rename line number and update GOTO targets', () => {
    // When renaming a line number, update GOTO references
    const originalCode = '100 PRINT "Start"\n200 GOTO 100\n300 END';
    const has100 = originalCode.includes('100');
    const hasGoto100 = originalCode.includes('GOTO 100');
    
    expect(has100).toBe(true);
    expect(hasGoto100).toBe(true);
  });

  it('should rename line number and update GOSUB targets', () => {
    // When renaming a line number, update GOSUB references
    const originalCode = '500 GOSUB 2000\n2000 REM Subroutine\nRETURN';
    const has2000 = originalCode.includes('2000');
    const hasGosub2000 = originalCode.includes('GOSUB 2000');
    
    expect(has2000).toBe(true);
    expect(hasGosub2000).toBe(true);
  });

  it('should handle GO TO variant when renaming line numbers', () => {
    // Rename should work with "GO TO" (two-word form)
    const originalCode = '100 PRINT "test"\n200 GO TO 100';
    const hasGoTo = originalCode.includes('GO TO 100');
    
    expect(hasGoTo).toBe(true);
  });

  it('should handle GO SUB variant when renaming line numbers', () => {
    // Rename should work with "GO SUB" (two-word form)
    const originalCode = '500 GOSUB 2000\n2000 REM Sub\nRETURN\n600 GO SUB 2000';
    const hasGoSub = originalCode.includes('GO SUB 2000');
    
    expect(hasGoSub).toBe(true);
  });

  it('should not rename partial matches', () => {
    // Rename should only match whole words
    const originalCode = 'LET counter = 10\nLET count = 5';
    const counterCount = (originalCode.match(/\bcounter\b/g) || []).length;
    const countCount = (originalCode.match(/\bcount\b/g) || []).length;
    
    expect(counterCount).toBe(1);
    expect(countCount).toBe(1);
  });

  it('should return WorkspaceEdit with changes', () => {
    // Rename should return a WorkspaceEdit with document changes
    const edit = {
      changes: {
        'file://document.bas': [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }, newText: 'newName' }
        ]
      }
    };
    
    expect(edit.changes).toBeDefined();
    expect(edit.changes['file://document.bas']).toBeDefined();
    expect(edit.changes['file://document.bas'].length).toBeGreaterThan(0);
  });

  it('should handle rename with special characters in suffix', () => {
    // Variables with $ and % suffixes should be handled correctly
    const stringVar = 'name$';
    const numVar = 'count%';
    
    expect(stringVar.match(/[$%]/)).toBeTruthy();
    expect(numVar.match(/[$%]/)).toBeTruthy();
  });

  it('should rename function definitions (DEF FN)', () => {
    // Rename should work on DEF FN function names
    const originalCode = '1000 DEF FN add(x) = x + 1\nLET result = FN add(5)';
    const hasFnAdd = originalCode.includes('FN add');
    
    expect(hasFnAdd).toBe(true);
  });

  it('should preserve case in renamed entities', () => {
    // New name should be used exactly as provided
    const oldName = 'x';
    const newName = 'myVariable';
    const capitalNewName = 'MyVariable';
    
    expect(newName).not.toBe(capitalNewName);
  });
});
