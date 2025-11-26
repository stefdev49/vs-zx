import { describe, it, expect } from '@jest/globals';
import { Position, TextEdit } from 'vscode-languageserver/node';
import { createRenameEdits, getRenameContext } from './rename-utils';

function applyEdits(text: string, edits: TextEdit[]): string {
  const lines = text.split('\n');
  const sorted = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }
    return b.range.start.character - a.range.start.character;
  });

  sorted.forEach(edit => {
    const { start, end } = edit.range;

    if (start.line === end.line) {
      const line = lines[start.line];
      lines[start.line] =
        line.slice(0, start.character) + edit.newText + line.slice(end.character);
      return;
    }

    const before = lines[start.line].slice(0, start.character);
    const after = lines[end.line].slice(end.character);
    const replacement = edit.newText ?? '';
    const merged = before + replacement + after;
    lines.splice(start.line, end.line - start.line + 1, merged);
  });

  return lines.join('\n');
}

function getPosition(line: number, character: number): Position {
  return { line, character };
}

describe('Rename utilities', () => {
  it('renames variables across the whole document', () => {
    const program = `10 LET counter = 1\n20 LET total = counter + 1\n30 PRINT counter`;
    const context = getRenameContext(program, getPosition(0, 8));
    expect(context).toBeTruthy();
    const edits = createRenameEdits(program.split('\n'), context!, 'value');
    const updated = applyEdits(program, edits);

    expect(updated).toBe(`10 LET value = 1\n20 LET total = value + 1\n30 PRINT value`);
  });

  it('renames string variables with $ suffix', () => {
    const program = `10 LET name$ = "Ada"\n20 PRINT name$`; 
    const context = getRenameContext(program, getPosition(0, 9));
    expect(context?.oldName).toBe('name$');
    const edits = createRenameEdits(program.split('\n'), context!, 'author$');
    const updated = applyEdits(program, edits);

    expect(updated).toBe(`10 LET author$ = "Ada"\n20 PRINT author$`);
  });

  it('renames identifiers regardless of case', () => {
    const program = `10 LET R$ = "A"\n20 PRINT r$\n30 PRINT R$`;
    const context = getRenameContext(program, getPosition(0, 8));
    expect(context?.oldName).toBe('R$');
    const edits = createRenameEdits(program.split('\n'), context!, 'x$');
    const updated = applyEdits(program, edits);

    expect(updated).toBe(`10 LET x$ = "A"\n20 PRINT x$\n30 PRINT x$`);
  });

  it('does not rename identifiers that merely contain the name', () => {
    const program = `10 LET r$ = "A"\n20 LET rr$ = "B"`;
    const context = getRenameContext(program, getPosition(0, 8));
    expect(context?.oldName).toBe('r$');
    const edits = createRenameEdits(program.split('\n'), context!, 'x$');
    const updated = applyEdits(program, edits);

    expect(updated).toBe(`10 LET x$ = "A"\n20 LET rr$ = "B"`);
  });

  it('renames line numbers and updates GO TO / GOSUB targets', () => {
    const program = `100 PRINT "Start"\n200 GO TO 100\n300 GOSUB 100\n400 END`;
    const context = getRenameContext(program, getPosition(0, 1));
    expect(context?.isLineNumber).toBe(true);
    const edits = createRenameEdits(program.split('\n'), context!, '150');
    const updated = applyEdits(program, edits);

    expect(updated).toBe(`150 PRINT "Start"\n200 GO TO 150\n300 GOSUB 150\n400 END`);
  });
});
