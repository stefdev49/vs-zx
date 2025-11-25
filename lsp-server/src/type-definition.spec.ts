import { describe, it, expect } from '@jest/globals';
import { Position, Range } from 'vscode-languageserver/node';
import { getRenameContext } from './rename-utils';
import { findDeclarationRange } from './declaration-utils';
import { findLineNumberDefinitionRange, findLineNumberReferenceRange } from './line-number-utils';

function resolveTypeDefinition(text: string, position: Position): Range | null {
  const context = getRenameContext(text, position);
  if (context && !context.isLineNumber) {
    const range = findDeclarationRange(text, context.oldName);
    if (range) {
      return range;
    }
  }

  if (context?.isLineNumber) {
    return findLineNumberDefinitionRange(text, context.oldName);
  }

  return findLineNumberReferenceRange(text, position);
}

describe('Type Definition resolution', () => {
  it('returns the declaration range for identifiers', () => {
    const program = `10 LET score = 5\n20 PRINT score`;
    const range = resolveTypeDefinition(program, { line: 1, character: 9 });
    expect(range).toBeTruthy();
    const identifier = program
      .split('\n')[range!.start.line]
      .slice(range!.start.character, range!.end.character);
    expect(identifier).toBe('score');
  });

  it('returns the target line range for line-number references', () => {
    const program = `100 PRINT "Start"\n200 GO TO 100`;
    const range = resolveTypeDefinition(program, { line: 1, character: 10 });
    expect(range).toBeTruthy();
    const targetLine = program
      .split('\n')[range!.start.line]
      .slice(range!.start.character, range!.end.character);
    expect(targetLine).toBe('100');
  });

  it('returns the INPUT line for variables introduced by INPUT', () => {
    const program = `10 INPUT "Guess";g$\n20 IF g$="" THEN GO TO 10`;
    const referenceLine = program.split('\n')[1];
    const charIndex = referenceLine.indexOf('g$');
    expect(charIndex).toBeGreaterThanOrEqual(0);
    const position: Position = { line: 1, character: charIndex + 1 };
    const range = resolveTypeDefinition(program, position);
    expect(range).toBeTruthy();
    const identifier = program
      .split('\n')[range!.start.line]
      .slice(range!.start.character, range!.end.character);
    expect(identifier).toBe('g$');
  });
});
