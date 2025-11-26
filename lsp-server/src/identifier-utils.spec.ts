import { describe, it, expect } from '@jest/globals';
import { ZXBasicLexer } from './zxbasic';
import { findIdentifierReferenceRanges } from './identifier-utils';

describe('identifier reference lookup', () => {
  it('finds all occurrences of a numeric variable regardless of case', () => {
    const program = `10 LET score = 0\n20 PRINT score\n30 LET SCORE = score + 1`;
    const lexer = new ZXBasicLexer();
    const tokens = lexer.tokenize(program);

    const ranges = findIdentifierReferenceRanges(tokens, 'score');
    expect(ranges.length).toBe(4);
    expect(ranges[0].start.line).toBe(0);
    expect(ranges[1].start.line).toBe(1);
    expect(ranges[2].start.line).toBe(2);
    expect(ranges[3].start.line).toBe(2);
  });

  it('handles string variables with suffixes', () => {
    const program = `10 INPUT "Guess";g$\n20 IF g$ <> "" THEN PRINT g$`;
    const lexer = new ZXBasicLexer();
    const tokens = lexer.tokenize(program);

    const ranges = findIdentifierReferenceRanges(tokens, 'g$');
    expect(ranges.length).toBe(3);
    expect(ranges.map(range => range.start.line)).toEqual([0, 1, 1]);
  });
});
