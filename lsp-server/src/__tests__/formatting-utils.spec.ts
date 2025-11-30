import { TextDocument } from 'vscode-languageserver-textdocument';
import { autoRenumberLines } from '../formatting-utils';

function createDocument(contents: string): TextDocument {
  return TextDocument.create('file:///test.bas', 'zx-basic', 1, contents);
}

describe('autoRenumberLines', () => {
  it('renumbers sequential lines and updates GOTO targets', () => {
    const doc = createDocument('300 PRINT "HELLO"\n450 GO TO 300\n');

    const result = autoRenumberLines(doc);

    expect(result.mappedLineCount).toBe(2);
    expect(result.edits).toHaveLength(2);

    const firstLineEdit = result.edits.find(edit => edit.range.start.line === 0);
    const secondLineEdit = result.edits.find(edit => edit.range.start.line === 1);

    expect(firstLineEdit?.newText).toBe('10 PRINT "HELLO"');
    expect(secondLineEdit?.newText).toBe('20 GOTO 10');

    expect(Array.from(result.touchedLines.values()).sort()).toEqual([0, 1]);
  });

  it('adds missing line numbers while preserving untouched lines', () => {
    const doc = createDocument('PRINT "NO NUM"\n20 GOTO 20\n');

    const result = autoRenumberLines(doc);

    expect(result.mappedLineCount).toBe(1);
    expect(result.edits).toHaveLength(2);

    const firstLine = result.edits.find(edit => edit.range.start.line === 0);
    const secondLine = result.edits.find(edit => edit.range.start.line === 1);

    expect(firstLine?.newText).toBe('10 PRINT "NO NUM"');
    expect(secondLine?.newText).toBe('20 GOTO 20');
  });
});
