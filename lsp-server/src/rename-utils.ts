import { Position, Range, TextEdit } from 'vscode-languageserver/node';

export interface WordRangeInfo {
  start: number;
  end: number;
  text: string;
}

export interface RenameContext {
  oldName: string;
  isLineNumber: boolean;
  wordRange: Range;
}

export function getWordRangeAtPosition(lineText: string, character: number): WordRangeInfo | null {
  if (!lineText) {
    return null;
  }

  const clampedCharacter = Math.min(Math.max(character, 0), lineText.length);
  let start = clampedCharacter;
  let end = clampedCharacter;

  while (start > 0 && /[A-Za-z0-9_$%]/.test(lineText[start - 1])) {
    start--;
  }

  while (end < lineText.length && /[A-Za-z0-9_$%]/.test(lineText[end])) {
    end++;
  }

  if (start === end) {
    return null;
  }

  return {
    start,
    end,
    text: lineText.slice(start, end)
  };
}

export function getRenameContext(text: string, position: Position): RenameContext | null {
  const lines = text.split('\n');
  const lineText = lines[position.line] ?? '';
  const wordInfo = getWordRangeAtPosition(lineText, position.character);

  if (!wordInfo) {
    return null;
  }

  const isLineNumber = /^\d+$/.test(wordInfo.text);

  if (isLineNumber) {
    const lineNumberMatch = lineText.match(/^(\d+)/);
    if (!lineNumberMatch || lineNumberMatch[1] !== wordInfo.text) {
      return null;
    }
  } else {
    const validIdentifier = /^[A-Za-z][A-Za-z0-9_$%]*$/i.test(wordInfo.text);
    if (!validIdentifier) {
      return null;
    }
  }

  return {
    oldName: wordInfo.text,
    isLineNumber,
    wordRange: {
      start: { line: position.line, character: wordInfo.start },
      end: { line: position.line, character: wordInfo.end }
    }
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createRenameEdits(lines: string[], context: RenameContext, newName: string): TextEdit[] {
  const { oldName, isLineNumber } = context;
  const edits: TextEdit[] = [];

  if (isLineNumber) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatch = line.match(/^(\d+)\s+/);

      if (lineMatch && lineMatch[1] === oldName) {
        edits.push({
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: oldName.length }
          },
          newText: newName
        });
      }

      const gotoPattern = new RegExp(`\\b(GOTO|GO\\s+TO|GOSUB|GO\\s+SUB)\\s+${oldName}\\b`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = gotoPattern.exec(line)) !== null) {
        const keyword = match[1];
        let numStart = match.index + keyword.length;
        while (numStart < line.length && /\s/.test(line[numStart])) {
          numStart++;
        }

        edits.push({
          range: {
            start: { line: i, character: numStart },
            end: { line: i, character: numStart + oldName.length }
          },
          newText: newName
        });
      }
    }
  } else {
    const escaped = escapeRegExp(oldName);
    const regex = new RegExp(`(^|[^A-Za-z0-9_$%])(${escaped})(?=[^A-Za-z0-9_$%]|$)`, 'g');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const prefixLength = match[1] ? match[1].length : 0;
        const startChar = match.index + prefixLength;
        edits.push({
          range: {
            start: { line: i, character: startChar },
            end: { line: i, character: startChar + oldName.length }
          },
          newText: newName
        });
      }
    }
  }

  return edits;
}
