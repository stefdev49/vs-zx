import { TextDocument } from 'vscode-languageserver-textdocument';
import { autoRenumberLines, formatLine } from '../formatting-utils';
import { ZXBasicLexer, TokenType } from '../zxbasic';

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

describe('formatLine', () => {
  const lexer = new ZXBasicLexer();

  it('should uppercase REM keywords in comments', () => {
    const doc = createDocument('10 rem test comment');
    const tokens = lexer.tokenize('10 rem test comment').filter(t => t.type !== TokenType.EOF);
    const result = formatLine(tokens, doc);
    
    expect(result).not.toBeNull();
    expect(result?.newText).toBe('10 REM test comment');
  });

  it('should preserve already uppercase REM keywords', () => {
    const doc = createDocument('20 REM TEST COMMENT');
    const tokens = lexer.tokenize('20 REM TEST COMMENT').filter(t => t.type !== TokenType.EOF);
    const result = formatLine(tokens, doc);
    
    expect(result).toBeNull(); // No changes needed
  });

  it('should handle mixed case REM keywords', () => {
    const doc = createDocument('30 Rem Mixed Case');
    const tokens = lexer.tokenize('30 Rem Mixed Case').filter(t => t.type !== TokenType.EOF);
    const result = formatLine(tokens, doc);
    
    expect(result).not.toBeNull();
    expect(result?.newText).toBe('30 REM Mixed Case');
  });

  it('should uppercase regular keywords', () => {
    const doc = createDocument('40 print "hello"');
    const tokens = lexer.tokenize('40 print "hello"').filter(t => t.type !== TokenType.EOF);
    const result = formatLine(tokens, doc);
    
    expect(result).not.toBeNull();
    expect(result?.newText).toBe('40 PRINT "hello"');
  });
});
