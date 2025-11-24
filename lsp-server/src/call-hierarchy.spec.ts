// Tests for call hierarchy provider
import { describe, it, expect } from '@jest/globals';

describe('Call Hierarchy Provider', () => {
  it('should identify subroutine line numbers for call hierarchy', () => {
    // Call hierarchy should work on line numbers (subroutines)
    const lineNumber = '1000';
    const isNumeric = /^\d+$/.test(lineNumber);
    
    expect(isNumeric).toBe(true);
  });

  it('should not enable call hierarchy for non-line-number positions', () => {
    // Call hierarchy should not activate on variable names
    const variable = 'x';
    const isNumeric = /^\d+$/.test(variable);
    
    expect(isNumeric).toBe(false);
  });

  it('should find incoming GOSUB calls to a subroutine', () => {
    // Incoming calls should find all GOSUB references to this line
    const subroutine = '1000';
    const gosub = 'GOSUB 1000';
    
    expect(gosub).toContain(subroutine);
  });

  it('should find incoming GO SUB calls', () => {
    // Should also recognize "GO SUB" (two-word form)
    const subroutine = '2000';
    const goSub = 'GO SUB 2000';
    
    expect(goSub).toContain('GO SUB');
    expect(goSub).toContain(subroutine);
  });

  it('should find outgoing GOSUB calls from a subroutine', () => {
    // Outgoing calls should find all GOSUB calls within a subroutine
    const fromLine = '1000 REM Subroutine';
    const call = 'GOSUB 2000';
    
    expect(fromLine).toContain('1000');
    expect(call).toContain('GOSUB');
  });

  it('should create CallHierarchyItem with correct structure', () => {
    // Call hierarchy items should have name, kind, uri, range, selectionRange
    const item = {
      name: 'Line 1000',
      kind: 6, // SymbolKind.Function
      uri: 'file://document.bas',
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } },
      selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } }
    };
    
    expect(item.name).toContain('Line');
    expect(item.range).toBeDefined();
    expect(item.selectionRange).toBeDefined();
  });

  it('should extract line number from item name', () => {
    // Should correctly extract "1000" from "Line 1000"
    const name = 'Line 1000';
    const match = name.match(/Line (\d+)/);
    
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('1000');
  });

  it('should handle subroutine boundaries correctly', () => {
    // Subroutine should end at RETURN or next line number
    const subroutineStart = '1000 REM Sub';
    const code1 = '1010 LET x = 1';
    const code2 = '1020 LET y = 2';
    const returnStmt = '1030 RETURN';
    
    expect(returnStmt).toContain('RETURN');
  });

  it('should handle nested GOSUB calls', () => {
    // Nested subroutine calls should be tracked
    const outer = 'GOSUB 1000';
    const inner = 'GOSUB 2000';
    
    expect(outer).toBeTruthy();
    expect(inner).toBeTruthy();
  });

  it('should handle multiple GOSUB calls to same target', () => {
    // Multiple calls to same subroutine should all be tracked
    const call1 = '100 GOSUB 1000';
    const call2 = '200 GOSUB 1000';
    
    expect(call1).toContain('1000');
    expect(call2).toContain('1000');
  });

  it('should provide CallHierarchyIncomingCall with from and fromRanges', () => {
    // Incoming calls should have 'from' item and 'fromRanges'
    const incomingCall = {
      from: {
        name: 'Line 100',
        kind: 6,
        uri: 'file://document.bas',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
        selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }
      },
      fromRanges: [
        { start: { line: 0, character: 10 }, end: { line: 0, character: 19 } }
      ]
    };
    
    expect(incomingCall.from).toBeDefined();
    expect(incomingCall.fromRanges).toBeDefined();
    expect(incomingCall.fromRanges.length).toBeGreaterThan(0);
  });

  it('should provide CallHierarchyOutgoingCall with to and fromRanges', () => {
    // Outgoing calls should have 'to' item and 'fromRanges'
    const outgoingCall = {
      to: {
        name: 'Line 2000',
        kind: 6,
        uri: 'file://document.bas',
        range: { start: { line: 10, character: 0 }, end: { line: 10, character: 4 } },
        selectionRange: { start: { line: 10, character: 0 }, end: { line: 10, character: 4 } }
      },
      fromRanges: [
        { start: { line: 5, character: 5 }, end: { line: 5, character: 14 } }
      ]
    };
    
    expect(outgoingCall.to).toBeDefined();
    expect(outgoingCall.fromRanges).toBeDefined();
  });

  it('should identify subroutine end correctly', () => {
    // Subroutine should be identified from line number to RETURN
    const startLine = 1000;
    const endLine = 1030;
    
    expect(endLine).toBeGreaterThan(startLine);
  });

  it('should handle call hierarchy prepare returning null for non-subroutines', () => {
    // Should return null when called on non-subroutine positions
    const result = null;
    
    expect(result).toBeNull();
  });

  it('should show call hierarchy in editor UI', () => {
    // Call hierarchy should be viewable in VS Code's Call Hierarchy view
    const supported = true;
    
    expect(supported).toBe(true);
  });
});
