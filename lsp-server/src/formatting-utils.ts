import { TextEdit } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Token, TokenType } from './zxbasic';

export type RenumberResult = {
  edits: TextEdit[];
  touchedLines: Set<number>;
  mappedLineCount: number;
};

export function autoRenumberLines(document: TextDocument): RenumberResult {
  const edits: TextEdit[] = [];
  const touchedLines = new Set<number>();
  const text = document.getText();
  const lines = text.split('\n');

  // Build a mapping of old line numbers to new line numbers
  const lineNumberMap = new Map<string, string>();
  let lineNum = 10;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      continue;
    }

    const match = line.match(/^(\d+)\s+/);
    if (match) {
      const oldLineNum = match[1];
      lineNumberMap.set(oldLineNum, lineNum.toString());
    }

    lineNum += 10;
  }

  // Now apply the renumbering with GOTO/GOSUB target updates
  lineNum = 10;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      continue;
    }

    const match = line.match(/^(\d+)\s+/);
    let newLine = line;

    if (match) {
      const oldLineNum = match[1];
      if (oldLineNum !== lineNum.toString()) {
        newLine = line.replace(/^\d+\s+/, `${lineNum} `);
      }
    } else {
      newLine = `${lineNum} ${line}`;
    }

    for (const [oldNum, newNum] of lineNumberMap.entries()) {
      const goSubPattern = new RegExp(`\\b(GOTO|GO\\s+TO|GOSUB|GO\\s+SUB)\\s+${oldNum}\\b`, 'gi');
      newLine = newLine.replace(goSubPattern, (match, keyword) => {
        const normalized = keyword.toUpperCase().replace(/\s+/g, '');
        return `${normalized === 'GOTO' ? 'GOTO' : 'GOSUB'} ${newNum}`;
      });
    }

    const hadNumber = !!match;
    if (newLine !== line || hadNumber) {
      touchedLines.add(i);
      edits.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length }
        },
        newText: newLine
      });
    }

    lineNum += 10;
  }

  return { edits, touchedLines, mappedLineCount: lineNumberMap.size };
}

export function formatLine(tokens: Token[], document: TextDocument): TextEdit | null {
  if (tokens.length === 0) {
    return null;
  }

  const line = tokens[0].line;
  const lineText = document.getText({
    start: { line, character: 0 },
    end: { line: line + 1, character: 0 }
  }).replace(/\n$/, '');

  let formatted = '';
  let prevToken: Token | null = null;

  for (const token of tokens) {
    if (prevToken) {
      if (prevToken.type === TokenType.LINE_NUMBER) {
        formatted += ' ';
      } else if (token.type === TokenType.OPERATOR || prevToken.type === TokenType.OPERATOR) {
        if (!(token.type === TokenType.OPERATOR && token.value === '-' &&
              (prevToken.type === TokenType.OPERATOR || prevToken.type === TokenType.PUNCTUATION))) {
          formatted += ' ';
        }
      } else if (prevToken.type === TokenType.KEYWORD) {
        formatted += ' ';
      } else if (prevToken.type === TokenType.PUNCTUATION && prevToken.value === ',') {
        formatted += ' ';
      } else if (token.type === TokenType.STATEMENT_SEPARATOR ||
                 prevToken.type === TokenType.STATEMENT_SEPARATOR) {
        formatted += ' ';
      }
    }

    if (token.type === TokenType.KEYWORD) {
      formatted += token.value.toUpperCase();
    } else {
      formatted += token.value;
    }

    prevToken = token;
  }

  if (formatted !== lineText.trim()) {
    return {
      range: {
        start: { line, character: 0 },
        end: { line, character: lineText.length }
      },
      newText: formatted
    };
  }

  return null;
}
