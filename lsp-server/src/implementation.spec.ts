import { describe, it, expect } from '@jest/globals';
import { Position, Range } from 'vscode-languageserver/node';
import { ZXBasicLexer } from './zxbasic';
import { getRenameContext } from './rename-utils';
import { findDeclarationRange } from './declaration-utils';
import { findLineNumberDefinitionRangeFromTokens, findLineNumberReferenceRangeFromTokens } from './line-number-utils';

function resolveImplementation(text: string, position: Position): Range | null {
  const context = getRenameContext(text, position);
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  if (context && !context.isLineNumber) {
    const range = findDeclarationRange(text, context.oldName);
    if (range) {
      return range;
    }
  }

  if (context?.isLineNumber) {
    const lineRange = findLineNumberDefinitionRangeFromTokens(tokens, context.oldName);
    if (lineRange) {
      return lineRange;
    }
  }

  return findLineNumberReferenceRangeFromTokens(tokens, position);
}

describe('Implementation resolution', () => {
  it('returns the declaration range for identifier usages', () => {
    const program = `10 LET score = 5\n20 PRINT score`;
    const range = resolveImplementation(program, { line: 1, character: 9 });
    expect(range).toBeTruthy();
    const identifier = program
      .split('\n')[range!.start.line]
      .slice(range!.start.character, range!.end.character);
    expect(identifier).toBe('score');
  });

  it('returns the line definition for GOSUB targets', () => {
    const program = `100 GO SUB 900\n900 REM subroutine\n910 RETURN`;
    const charIndex = program.split('\n')[0].indexOf('900');
    const range = resolveImplementation(program, { line: 0, character: charIndex });
    expect(range).toBeTruthy();
    const targetLineText = program.split('\n')[range!.start.line].trim();
    expect(targetLineText.startsWith('900')).toBe(true);
  });

  it('returns the INPUT line for variables introduced via INPUT', () => {
    const program = `10 INPUT "Guess";g$\n20 IF g$="" THEN GO TO 10`;
    const referenceLine = program.split('\n')[1];
    const charIndex = referenceLine.indexOf('g$');
    const range = resolveImplementation(program, { line: 1, character: charIndex });
    expect(range).toBeTruthy();
    const target = program
      .split('\n')[range!.start.line]
      .slice(range!.start.character, range!.end.character);
    expect(target).toBe('g$');
  });

});
