import { describe, it, expect } from '@jest/globals';
import { ZXBasicLexer } from './zxbasic';
import { buildLineReferenceMap, findLineNumberReferenceRange } from './line-number-utils';

describe('Line number utilities', () => {
  it('collects references for target lines', () => {
    const program = `10 GOTO 100\n20 GOSUB 100\n30 GOTO 200\n100 PRINT 1\n200 STOP`;
    const lexer = new ZXBasicLexer();
    const tokens = lexer.tokenize(program);

    const referenceMap = buildLineReferenceMap(tokens);
    expect(referenceMap.get('100')).toBeDefined();
    expect(referenceMap.get('100')!.length).toBe(2);
    expect(referenceMap.get('200')).toBeDefined();
    expect(referenceMap.get('200')!.length).toBe(1);
  });

  it('ignores keywords without numeric targets', () => {
    const program = `10 GOTO\n20 GOSUB\n30 PRINT 5`;
    const lexer = new ZXBasicLexer();
    const tokens = lexer.tokenize(program);

    const referenceMap = buildLineReferenceMap(tokens);
    expect(referenceMap.size).toBe(0);
  });

  it('resolves reference ranges from cursor position', () => {
    const program = `10 GOTO 100\n100 PRINT 1`;
    const range = findLineNumberReferenceRange(program, { line: 0, character: 8 });
    expect(range).toBeTruthy();
    expect(range?.start.line).toBe(1);
  });
});
