import { Position, Range } from 'vscode-languageserver/node';
import { ZXBasicLexer, Token, TokenType } from './zxbasic';

const LINE_REFERENCE_KEYWORDS = ['GOTO', 'GOSUB', 'RUN', 'LIST', 'RESTORE'];

export function findLineNumberDefinitionRange(text: string, targetLine: string): Range | null {
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  return findLineNumberDefinitionRangeFromTokens(tokens, targetLine);
}

export function findLineNumberDefinitionRangeFromTokens(tokens: Token[], targetLine: string): Range | null {
  for (const token of tokens) {
    if (token.type === TokenType.LINE_NUMBER && token.value === targetLine) {
      return {
        start: { line: token.line, character: token.start },
        end: { line: token.line, character: token.end }
      };
    }
  }
  return null;
}

export function findLineNumberReferenceRange(text: string, position: Position): Range | null {
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  return findLineNumberReferenceRangeFromTokens(tokens, position);
}

export function findLineNumberReferenceRangeFromTokens(tokens: Token[], position: Position): Range | null {
  const result = findTokenAtPosition(tokens, position);
  if (!result) {
    return null;
  }

  if (!isLineNumberReference(tokens, result.index)) {
    return null;
  }

  return findLineNumberDefinitionRangeFromTokens(tokens, result.token.value);
}

export function buildLineReferenceMap(tokens: Token[]): Map<string, Token[]> {
  const referenceMap = new Map<string, Token[]>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === TokenType.KEYWORD && LINE_REFERENCE_KEYWORDS.includes(token.value)) {
      for (let j = i + 1; j < tokens.length; j++) {
        const next = tokens[j];
        if (next.type === TokenType.STATEMENT_SEPARATOR || next.type === TokenType.EOF) {
          break;
        }
        if (next.type === TokenType.LINE_NUMBER) {
          break;
        }
        if (next.type === TokenType.NUMBER) {
          const existing = referenceMap.get(next.value) ?? [];
          existing.push(next);
          referenceMap.set(next.value, existing);
          break;
        }
      }
    }
  }

  return referenceMap;
}

function findTokenAtPosition(tokens: Token[], position: Position): { token: Token; index: number } | null {
  const adjustedCharacter = position.character + (position.line > 0 ? 1 : 0);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.line === position.line &&
        adjustedCharacter >= token.start &&
        adjustedCharacter < token.end) {
      return { token, index: i };
    }
  }
  return null;
}

function isLineNumberReference(tokens: Token[], targetIndex: number): boolean {
  const token = tokens[targetIndex];
  if (!token || (token.type !== TokenType.NUMBER && token.type !== TokenType.LINE_NUMBER)) {
    return false;
  }

  for (let i = targetIndex - 1; i >= 0; i--) {
    const prevToken = tokens[i];
    if (prevToken.type === TokenType.STATEMENT_SEPARATOR || prevToken.line !== token.line) {
      break;
    }
    if (prevToken.type === TokenType.KEYWORD && LINE_REFERENCE_KEYWORDS.includes(prevToken.value)) {
      return true;
    }
  }

  return false;
}
